import { reactive } from 'vue';
import { RegionData, gameData, CurrencyValue } from './gameData';
import { TaskRecord } from './db.utils';


export type SessionCache = {
  cachedGameSession: { [key: string | number]: GameSession; };
  currentGameView?: string;
};

export class GameSession {
  cachedDays: DayData[] = []; // key to be represented with YYYYMMDD
  gameName: string;
  lastSelectedDay: number = -1;
  lastSelectedRegion: RegionData = { id: '', reset_time: '00:00:00' };

  constructor(gameName: string, date: number, region: RegionData) {
    this.gameName = gameName;
    this.lastSelectedDay = date;
    this.lastSelectedRegion = region;
  }

  async populateSessionData(date: number = this.lastSelectedDay) {
    if (this.cachedDays[date] == null)
      this.cachedDays[date] = new DayData();

    const db = gameData[this.gameName].db;
    const region = this.lastSelectedRegion.id;

    const dailyRecords = await db.getAllDailyRecord(date, region);
    const weeklyRecords = await db.getAllWeeklyRecord(date, region);
    const periodicRecords = await db.getAllPeriodicRecord(date, region);
    const otherRecords = await db.getAllOtherRecord(date, region);

    dailyRecords?.forEach((record) => this.fillRecord(record, 'dailyProgress', 'totalCurrencyFromDaily'));
    weeklyRecords?.forEach((record) => this.fillRecord(record, 'weeklyProgress', 'totalCurrencyFromWeekly'));
    periodicRecords?.forEach((record) => this.fillRecord(record, 'periodicProgress', 'totalCurrencyFromPeriodic'));

    otherRecords?.forEach((record) => {
      this.cachedDays[record.date].otherSources[record.name].notes = record.notes;
      this.cachedDays[record.date].otherSources[record.name].currencies = record.currencies;
    });
  }

  async populateSessionDateRange(date_start: number, date_end: number) {
    const db = gameData[this.gameName].db;
    const region = this.lastSelectedRegion.id;

    for (let i = date_start; i < date_end; i++) {
      if (this.cachedDays[i] == null)
        this.cachedDays[i] = new DayData();
    }

    const dailyRecords = await db.getAllDailyRecordForRange(date_start, date_end, region);
    const weeklyRecords = await db.getAllWeeklyRecordForRange(date_start, date_end, region);
    const periodicRecords = await db.getAllPeriodicRecordForRange(date_start, date_end, region);
    const otherRecords = await db.getAllOtherRecordForRange(date_start, date_end, region);

    dailyRecords?.forEach((record) => this.fillRecord(record, 'dailyProgress', 'totalCurrencyFromDaily'));
    weeklyRecords?.forEach((record) => this.fillRecord(record, 'weeklyProgress', 'totalCurrencyFromWeekly'));
    periodicRecords?.forEach((record) => this.fillRecord(record, 'periodicProgress', 'totalCurrencyFromPeriodic'));

    otherRecords?.forEach((record) => {
      this.cachedDays[record.date].otherSources[record.name].notes = record.notes;
      this.cachedDays[record.date].otherSources[record.name].currencies = record.currencies;
    });
  }

  fillRecord(record: TaskRecord, firstField: string, secondField: string) {
    //console.log(record);
    //@ts-ignore
    this.cachedDays[record.date][firstField][record.name] = record.value;
    //@ts-ignore
    this.cachedDays[record.date][secondField][record.name] = record.currencies;
  }

  getHighestProgressForSteppedinRange(taskType:string,taskId:string, date_start:number, date_end:number){
    let highest = 0, highestDate = 0;
    let target = taskType == 'weekly' ? 'weeklyProgress' : 'periodicProgress';

    for(let i = date_start; i < date_end; i++) {
      if (this.cachedDays == null) continue;
      //@ts-ignore
      let num = this.cachedDays[i][target][taskId];
      if (num > highest) {
        highest = num;
        highestDate = i;
      }
      
    }

    return {highest: highest, highestDate: highestDate};
  }
}

export class DayData {
  dailyProgress: { [key: string | number]: number; } = {};
  totalCurrencyFromDaily: CurrencyValue[] = [];
  weeklyProgress: { [key: string | number]: number; } = {};
  totalCurrencyFromWeekly: CurrencyValue[] = [];
  periodicProgress: { [key: string | number]: number; } = {};
  totalCurrencyFromPeriodic: CurrencyValue[] = [];
  otherSources: { [key: string | number]: OtherEntry; } = {};
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
};

export const sessionData: SessionCache = reactive({ cachedGameSession: {} });
