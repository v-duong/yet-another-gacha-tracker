import { readDir, exists, readTextFile } from '@tauri-apps/plugin-fs';
import { resolveResource } from '@tauri-apps/api/path';
import { reactive } from 'vue';
import { TrackerDatabase, loadDB } from './db.utils';
import Database from '@tauri-apps/plugin-sql';
import { sessionData } from './sessionData';

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
  periodic?: PeriodicTask[];
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

export interface TrackedTask {
  id: string;
  rewards: CurrencyValue[];
  stepped_rewards: SteppedRewardEntry[];
  ranked_stages: RankedStagesData;
}

export interface PeriodicTask extends TrackedTask {
  reset_day: string;
  reset_period: number;
}

export type RankedStagesData = {
  reset_day: string,
  reset_period: 14,
  progress_labels?: string[];
  sum_rewards?: boolean;
  stages: RankedStageReward[];
}

export type RankedStageReward = {
  id: string;
  rewards: SteppedRewardEntry[];
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
  trackedCurrencies : string[];
}

export type GameListEntry = {
  name: string;
  order: number;
}

export const gameData: { [key: string | number]: GameDataEntry } = reactive({});
export let gameList: { list: GameListEntry[] } = reactive({ list: [] });

export async function addResourcesFromDir(gameDir: string) {
  const jsonString = await readTextFile(gameDir + "/data.json");
  const data: GameTrackerConfig = JSON.parse(jsonString);
  gameData[data.id] = { config: data, iconPath: gameDir + "/images/icon.png", localePath: gameDir + "/i18n", db: new TrackerDatabase(await loadDB(data.id)), trackedCurrencies: [] };
  //console.log(gameData)
}

export async function generateGameList() {
  let tempList = [];


  for (let gameName in gameData) {
    const game = gameData[gameName];
    tempList.push({ name: game.config.id, order: game.config.order != null ? game.config.order : 100 });

    game.config.currencies.forEach(c => {
      if (c.tracked)
        game.trackedCurrencies.push(c.id);
    })
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
      if (await exists(gameDir + "/data.json")) {
        await addResourcesFromDir(gameDir);
        //load user settings here
      }
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

export function getPrimaryCurrency(gameName : string) {
    let res = gameData[gameName].config.currencies.find(c => c.primary);
    return res?.id;
}
