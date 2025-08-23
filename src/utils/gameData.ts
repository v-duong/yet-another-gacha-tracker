import { readDir, exists, readTextFile, mkdir } from '@tauri-apps/plugin-fs';
import { appConfigDir, resolveResource } from '@tauri-apps/api/path';
import { reactive } from 'vue';
import { TrackerDatabase, loadDB } from './db.utils';
import { sessionData } from './sessionData';
import { convertFileSrc } from '@tauri-apps/api/core';

export interface GameConfig {
  order?: number;
  accent_color?: string;
  currencies?: CurrencyConfig[];
  gacha?: GachaBanner[];
  daily?: TrackedTask[];
  weekly?: TrackedTask[];
  periodic?: PeriodicTask[];
  event?: EventTask[];
  daily_currency_passes?: CurrencyPass[];

  [name: string]: any;
}

export interface MainTrackerConfig extends GameConfig {
  id: string;
  version: number;
  name_key: string;
  order: number;
  regions: RegionData[];
  weekly_reset_day?: string;
  currencies: CurrencyConfig[];
}

export type CurrencyPass = {
  id: string;
  cost: number;
  currencies: CurrencyValue[];
  bonus: CurrencyValue[];
  duration: number;
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
  hard_pity?: number;
  soft_pity?: number;
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

export interface EventTask extends TrackedTask {
  start_date: number;
  end_date: number;
}


export type RankedStagesData = {
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


export function isEmptyCurrencyArray(currencies: CurrencyValue[]) {
  for (let key in currencies) {
    if (currencies[key].amount > 0)
      return false;
  }
  return true;
}

export interface SteppedRewardEntry {
  step: number;
  currencies: CurrencyValue[];
}

export type GameDataEntry = {
  config: MainTrackerConfig;
  userConfig: GameConfig;
  customEventConfig: EventTask[],
  imagesPath: string;
  localePath: string;
  userDataPath: string;
  db: TrackerDatabase;
  trackedCurrencies: string[];
  currencyImages: { [key: string]: { exists: boolean, path: string } }
}

export type GameListEntry = {
  name: string;
  order: number;
}

export const gameData: { [key: string | number]: GameDataEntry } = reactive({});
export let gameList: { list: GameListEntry[] } = reactive({ list: [] });

export function imageExists(gameName: string, currency: string) {
  return gameData[gameName]?.currencyImages[currency]?.exists;
}

export function getCurrencyImage(gameName: string, currency: string) {
  return gameData[gameName]?.currencyImages[currency]?.path;
}

export async function generateGameList() {
  let tempList = [];


  for (let gameName in gameData) {
    const game = gameData[gameName];
    tempList.push({ name: game.config.id, order: game.config.order != null ? game.config.order : 100 });

    game.config.currencies.forEach(async c => {
      if (c.tracked)
        game.trackedCurrencies.push(c.id);

      game.currencyImages[c.id] = {
        exists: await exists(`${game.imagesPath}/${c.id}.png`),
        path: convertFileSrc(`${game.imagesPath}/${c.id}.png`)
      }
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
        let data = await addResourcesFromDir(gameDir);
        await loadUserData(data);
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

export async function addResourcesFromDir(gameDir: string) {
  const jsonString = await readTextFile(gameDir + "/data.json");
  const data: MainTrackerConfig = JSON.parse(jsonString);
  let userDataDir = await appConfigDir() + '/data/' + data.id;
  gameData[data.id] = {
    config: data,
    userConfig: {},
    customEventConfig: [],
    imagesPath: gameDir + "/images",
    localePath: gameDir + "/i18n",
    userDataPath: userDataDir,
    db: new TrackerDatabase(await loadDB(data.id)),
    trackedCurrencies: [],
    currencyImages: {}
  };

  return gameData[data.id];
}

export async function loadUserData(gameData: GameDataEntry) {
  if (!await exists(gameData.userDataPath)) {
    return;
  }
}

export async function writeUserData(gameName: string) {
  let userDataDir = gameData[gameName].userDataPath;

  if (!await exists(userDataDir)) {
    await mkdir(userDataDir);
  }
}

export async function writeEventData(gameName: string) {
  let userDataDir = gameData[gameName].userDataPath;

  if (!await exists(userDataDir)) {
    await mkdir(userDataDir);
  }
}


export function appendGameToString(key: string | number) {
  return `${sessionData.currentGameView}.${key}`
}

export function getPrimaryCurrency(gameName: string) {
  let res = gameData[gameName].config.currencies.find(c => c.primary);
  return res?.id;
}
