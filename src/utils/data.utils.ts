import { readDir, exists, readTextFile } from '@tauri-apps/plugin-fs';
import { resolveResource } from '@tauri-apps/api/path';
import { reactive } from 'vue';
import {  TrackerDatabase, loadDB, TaskRecord } from './db.utils';
import Database from '@tauri-apps/plugin-sql';

export type GameTrackerConfig = {
  id: string;
  version: number;
  name_key: string;
  order: number;
  regions: RegionData[];
  weekly_reset_day: string;
  accent_color?: string;
  currencies: CurrencyConfig[];
  gacha: GachaBanner[];
  daily?: TrackedTask[];
  weekly?: TrackedTask[];
  periodic?: TrackedTask[];
}

export type RegionData = {
  id: string;
  reset_time: string;
}

export type GachaBanner = {
  id: string;
  pull_cost: CurrencyValue[];
  rate: number;
  fifty_fifty_system?: boolean;
  target_rate?: number;
}

export type TrackedTask = {
  id: string;
  rewards: CurrencyValue[];
  steps: number;
  stepped_rewards: SteppedRewardEntry[];
}

export interface CurrencyConfig {
  id: string;
  tracked?: boolean;
  primary?: boolean;
}

export interface CurrencyValue {
  currency: string;
  amount: number;
}

export interface SteppedRewardEntry {
  step: number;
  currencies: CurrencyValue[];
}

export type GameDataEntry = {
  config: GameTrackerConfig;
  iconPath: string;
  localePath: string;
  db: TrackerDatabase;
}

export type GameListEntry = {
  name: string;
  order: number;
}

export type SessionCache = {
  cachedGameSession: { [key: string | number]: GameSession };
  currentGameView?: string;
}

export class GameSession {
  cachedDays: { [key: string | number]: DayData } = {};  // key to be represented with YYYYMMDD
  gameName: string;
  lastSelectedDay: number = -1;
  lastSelectedRegion: RegionData = {id: '',reset_time:'00:00:00'};

  constructor(gameName: string, date: number, region: RegionData) {
    this.gameName = gameName;
    this.lastSelectedDay = date;
    this.lastSelectedRegion = region;
  }

  async populateSessionData(date: number = this.lastSelectedDay) {
    if (this.cachedDays[date] == null)
      this.cachedDays[date] = new DayData();

    let db = gameData[this.gameName].db;

    const dailyRecords = await db.getAllDailyRecord(date, this.lastSelectedRegion.id);
    dailyRecords?.forEach((record) => this.fillRecord(record, date, 'dailyProgress', 'totalCurrencyFromDaily'));

    const weeklyRecords = await db.getAllWeeklyRecord(date, this.lastSelectedRegion.id);
    weeklyRecords?.forEach((record) => this.fillRecord(record, date, 'weeklyProgress', 'totalCurrencyFromWeekly'));

    const periodicRecords = await db.getAllPeriodicRecord(date, this.lastSelectedRegion.id);
    periodicRecords?.forEach((record) => this.fillRecord(record, date, 'periodicProgress', 'totalCurrencyFromPeriodic'));

    const otherRecords = await db.getAllOtherRecord(date, this.lastSelectedRegion.id);
    otherRecords?.forEach((record) => {
      this.cachedDays[date].otherSources[record.name].notes = record.notes;
      this.cachedDays[date].otherSources[record.name].currencies = record.currencies;
    });
  }

  fillRecord(record: TaskRecord, date: number, firstField: string, secondField: string) {
    console.log(record);
    //@ts-ignore
    this.cachedDays[date][firstField][record.name] = record.value;
    //@ts-ignore
    this.cachedDays[date][secondField][record.name] = record.currencies;
  }
}

export class DayData {
  dailyProgress: { [key: string | number]: number } = {};
  totalCurrencyFromDaily: CurrencyValue[] = [];
  weeklyProgress: { [key: string | number]: number } = {};
  totalCurrencyFromWeekly: CurrencyValue[] = [];
  periodicProgress: { [key: string | number]: number } = {};
  totalCurrencyFromPeriodic: CurrencyValue[] = [];
  otherSources: { [key: string | number]: OtherEntry } = {};
  endOfDayOverride: CurrencyValue[] = [];

  getProgress(taskType: string, name: string) {
    switch (taskType) {
      case 'daily':
        return this.dailyProgress[name];
      case 'weekly':
        return this.weeklyProgress[name];
      case 'periodic':
        return this.periodicProgress[name];
      case 'other':
        return this.otherSources[name];
    }
  }

  setProgress(taskType: string, name: string, value: number | string) {
    switch (taskType) {
      case 'daily':
        this.dailyProgress[name] = value as number;
        break;
      case 'weekly':
        this.weeklyProgress[name] = value as number;
        break;
      case 'periodic':
        this.periodicProgress[name] = value as number;
        break;
      case 'other':
        this.otherSources[name].notes = value as string;
        break;
    }
  }
}

export type OtherEntry = {
  notes: string;
  currencies: CurrencyValue[];
}

export const sessionData: SessionCache = reactive({ cachedGameSession: {} });
export const gameData: { [key: string | number]: GameDataEntry } = reactive({});
export let gameList: { list: GameListEntry[] } = reactive({ list: [] });

export async function addResourcesFromDir(gameDir: string) {
  const jsonString = await readTextFile(gameDir + "/data.json");
  const data: GameTrackerConfig = JSON.parse(jsonString);
  gameData[data.id] = { "config": data, iconPath: gameDir + "/images/icon.png", localePath: gameDir + "/i18n", db: new TrackerDatabase( await loadDB(data.id) )};
  //console.log(gameData)
}

export async function generateGameList() {
  let tempList = [];


  for (let gameName in gameData) {
    const game = gameData[gameName];
    tempList.push({ name: game.config.id, order: game.config.order != null ? game.config.order : 100 });
  }
  tempList = tempList.sort((a, b) => a.name.localeCompare(b.name));
  gameList.list = tempList.sort((a, b) => { return a.order - b.order });
  //console.log(gameList.list);
}


export async function initializeData() {
  const gameDataDirectory = await resolveResource('resources/gamedata');
  const entries = await readDir(gameDataDirectory);

  for await (const entry of entries) {
    if (entry.isDirectory) {
      const gameDir = `${gameDataDirectory}/${entry.name}`;
      if (await exists(gameDir + "/data.json"))
        await addResourcesFromDir(gameDir);
      else
        console.log(`data.json not found in game folder ${entry.name}`)
    }
  }

  await generateGameList();

  if (gameList.list.length > 0) {
    const gameName = gameList.list[0].name;
    sessionData.currentGameView = gameName;


  }
}


export function appendGameToString(key: string) {
  return `${sessionData.currentGameView}.${key}`
}

