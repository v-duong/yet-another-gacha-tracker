import { reactive } from 'vue';
import { RegionData, gameData, CurrencyValue, TrackedTask, GameTrackerConfig } from './gameData';
import { TaskRecord, HistoryRecord, CurrencyHistory, RankedTaskRecord } from './db.utils';
import { dateNumberToDate, getCurrentDateForGame, getCurrentDateNumberForGame, getDateNumberWithOffset } from './date.utils';
import { findCurrencyRecord, sumCurrenciesforSteppedRewards } from './helpers.utils';

export type SessionCache = {
  cachedGameSession: { [key: string | number]: GameSession; };
  currentGameView?: string;
};

export class GameSession {
  cachedDays: { [key: number]: DayData } = {}; // key to be represented with YYYYMMDD
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
      this.cachedDays[date] = new DayData(this.gameName);
    else
      return this.cachedDays[date];

    const db = gameData[this.gameName].db;
    const config = gameData[this.gameName].config;
    const region = this.lastSelectedRegion.id;

    const dailyRecords = await db.getAllDailyRecord(date, region);
    const weeklyRecords = await db.getAllWeeklyRecord(date, region);
    const periodicRecords = await db.getAllPeriodicRecord(date, region);
    const eventRecords = await db.getAllEventRecord(date, region);
    const otherRecords = await db.getAllOtherRecord(date, region);
    const historyRecord = await db.getCurrencyHistory(date, region);
    const premiumRecords = await db.getAllPremiumRecord(date, region);

    dailyRecords?.forEach((record) => this.fillRecord(record, 'dailyProgress'));
    weeklyRecords?.forEach((record) => this.fillRecord(record, 'weeklyProgress'));
    periodicRecords?.forEach((record) => this.fillRecord(record, 'periodicProgress'));
    eventRecords?.forEach((record) => this.fillRecord(record, 'eventProgress'));

    const selectedDay = this.cachedDays[date];

    otherRecords?.forEach((record) => {
      selectedDay.otherSources[record.name].notes = record.notes;
      selectedDay.otherSources[record.name].currencies = record.currencies;
    });

    this.fillHistoryRecord(historyRecord);
    await this.fillRankedStageRecord(config, date, date);

    premiumRecords?.forEach((record) => {
      this.cachedDays[record.date].premiumSources.push(record);
    })

    return selectedDay;
  }

  async populateSessionDateRange(date_start: number, date_end: number) {
    const db = gameData[this.gameName].db;
    const config = gameData[this.gameName].config;
    const region = this.lastSelectedRegion.id;
    let needsPopulate = false;

    for (let i = date_start; i <= date_end; i = getDateNumberWithOffset(i, 1)) {
      if (this.cachedDays[i] == null) {
        this.cachedDays[i] = new DayData(this.gameName);
        needsPopulate = true;
      }
    }

    if (!needsPopulate) return;

    const dailyRecords = await db.getAllDailyRecordForRange(date_start, date_end, region);
    const weeklyRecords = await db.getAllWeeklyRecordForRange(date_start, date_end, region);
    const periodicRecords = await db.getAllPeriodicRecordForRange(date_start, date_end, region);
    const eventRecords = await db.getAllEventRecordForRange(date_start, date_end, region);
    const otherRecords = await db.getAllOtherRecordForRange(date_start, date_end, region);
    const historyRecord = await db.getCurrencyHistoryForRange(date_start, date_end, region);
    const premiumRecords = await db.getAllPremiumRecordForRange(date_start, date_end, region);

    dailyRecords?.forEach((record) => this.fillRecord(record, 'dailyProgress'));
    weeklyRecords?.forEach((record) => this.fillRecord(record, 'weeklyProgress'));
    periodicRecords?.forEach((record) => this.fillRecord(record, 'periodicProgress'));
    eventRecords?.forEach((record) => this.fillRecord(record, 'eventProgress'));

    otherRecords?.forEach((record) => {
      this.cachedDays[record.date].otherSources[record.name].notes = record.notes;
      this.cachedDays[record.date].otherSources[record.name].currencies = record.currencies;
    });

    this.fillHistoryRecord(historyRecord);

    await this.fillRankedStageRecord(config, date_start, date_end);

    premiumRecords?.forEach((record) => {
      let found = this.cachedDays[record.date].premiumSources.find(x=>x.id == record.id);
      if (found)
        return;
      this.cachedDays[record.date].premiumSources.push(record);
    })

    
  }

  private async fillRankedStageRecord(config: GameTrackerConfig, date_start: number, date_end: number) {
    let tasksArr = [config.daily, config.weekly, config.periodic];
    let typeArr = ['daily', 'weekly', 'periodic'];
    for (let i = 0; i < tasksArr.length; i++) {
      tasksArr[i]?.forEach(async (taskConfig) => {
        if (taskConfig.ranked_stages != null) {
          await this.populateRankedStagesForRange(date_start, date_end, taskConfig.id, typeArr[i]);
        }
      });
    }
  }

  async populateRankedStagesForRange(date_start: number, date_end: number, parent_task: string, taskType: string) {
    const db = gameData[this.gameName].db;
    const region = this.lastSelectedRegion.id;

    const rankedStageRecords: RankedTaskRecord[] | null = await db.getAllRankedStageRecordForRange(date_start, date_end, region, parent_task);

    rankedStageRecords?.forEach(record => {
      let progressType = null;
      switch (taskType) {
        case 'daily':
          progressType = this.cachedDays[record.date].dailyProgress;
          break;
        case 'weekly':
          progressType = this.cachedDays[record.date].weeklyProgress;
          break;
        case 'periodic':
          progressType = this.cachedDays[record.date].periodicProgress;
          break;
        case 'event':
          progressType = this.cachedDays[record.date].eventProgress;
          break;
      }

      if (progressType == null) return;

      progressType[parent_task].rankedStageValues[record.stage_name] = record.value;
    });

  }

  fillRecord(record: TaskRecord, firstField: string) {
    //@ts-ignore
    if (this.cachedDays[record.date][firstField][record.name] == null) this.cachedDays[record.date][firstField][record.name] = new TrackedProgressData();
    //console.log(record);
    //@ts-ignore
    this.cachedDays[record.date][firstField][record.name].value = record.value;
    //@ts-ignore
    this.cachedDays[record.date][firstField][record.name].currencies = record.currencies;

    this.cachedDays[record.date].populated = true;
  }

  fillHistoryRecord(historyRecords: HistoryRecord[] | null) {
    if (historyRecords) {
      historyRecords.forEach(record => {
        this.cachedDays[record.date].totals.calculated = record.currencies;
        this.cachedDays[record.date].totals.override = record.override;

        this.cachedDays[record.date].populated = true;
      });
    }
  }


  getHighestProgressForTaskinRange(taskType: string, taskId: string, date_start: number, date_end: number) {
    let highest = 0, highestDate = 0;

    for (let i = date_start; i < date_end; i = getDateNumberWithOffset(i, 1)) {
      if (this.cachedDays == null || this.cachedDays[i] == null || this.cachedDays[i].populated == false) continue;

      let num = this.cachedDays[i].getProgress(taskType, taskId) as number;

      if (num == null)
        continue;

      if (num > highest) {
        highest = num;
        highestDate = i;
      }

    }

    return { highest: highest, highestDate: highestDate };
  }

  getHighestProgressForRankedStagesinRange(taskType: string, configData: TrackedTask, date_start: number, date_end: number): [{ [key: string]: number } | null, number] {
    let res: { [key: string]: number } = {};
    let highestDate = 0;

    if (configData.ranked_stages == null) return [null, 0];

    for (let i = date_start; i < date_end; i = getDateNumberWithOffset(i, 1)) {
      if (this.cachedDays == null || this.cachedDays[i] == null || this.cachedDays[i].populated == false) continue;

      let valuesObj = this.cachedDays[i].getRankedProgress(taskType, configData.id);

      if (valuesObj == null)
        continue;

      for (const key in valuesObj) {
        if (valuesObj[key] > res[key] || !(key in res)) {
          res[key] = valuesObj[key];
          highestDate = i;
        }
      }
    }

    return [res, highestDate];
  }

  async populateInitialCurrencyValue(date: number) {
    const selectedDay = this.cachedDays[date];

    const addToInitial = (origin: CurrencyValue | CurrencyHistory) => {
      let i = selectedDay.totals.initial.find(x => x.currency == origin.currency);
      if (i == null) selectedDay.totals.initial.push({ currency: origin.currency, amount: origin.amount });
      else i.amount = origin.amount;
    }


    const prevDate = getDateNumberWithOffset(date, -1);
    let prevDayData = this.cachedDays[getDateNumberWithOffset(date, -1)];

    if (prevDayData == null) {
      prevDayData = await this.populateSessionData(prevDate);
    }

    if (prevDayData.totals.override.length > 0) {
      prevDayData.totals.override.forEach(x => addToInitial(x));
    } else if (prevDayData.populated) {
      prevDayData.totals.calculated.forEach(x => addToInitial(x));
    } else {
      const db = gameData[this.gameName].db;
      const res = await db.getLastCurrencyHistory(date, this.lastSelectedRegion.id);

      if (res == null)
        return;

      if (res[0].override.length > 0) {
        res[0].override.forEach((x: CurrencyValue) => addToInitial(x));
      } else if (res[0].currencies.length > 0) {
        res[0].currencies.forEach((x: CurrencyHistory) => addToInitial(x));
      }
    }


    selectedDay.calculateGainFromTasks();
  }

  async adjustSteppedRewardsValuesRetroactive(data: TrackedTask, date: number, date_end: number, taskType: string, value: number) {
    let records = [];
    for (let i = date; i <= date_end; i = getDateNumberWithOffset(i, 1)) {
      if (this.cachedDays[i] == null)
        await this.populateSessionData(i);

      let dataToAdjust = this.cachedDays[i];
      let progressData = null;

      if (taskType == 'weekly' && dataToAdjust.weeklyProgress[data.id] != null)
        progressData = dataToAdjust.weeklyProgress[data.id];
      else if (taskType == 'periodic' && dataToAdjust.periodicProgress[data.id] != null)
        progressData = dataToAdjust.weeklyProgress[data.id];
      else
        continue

      let currencies: CurrencyValue[] = [];

      if (progressData.value < value) {
        progressData.value = value;
      }

      sumCurrenciesforSteppedRewards(data, value, progressData.value, this.gameName, currencies);

      value = progressData.value;

      console.log(i, currencies);
      progressData.currencies = currencies;
      records.push(i);

    }
    console.log(records);
    return records;
  }

  async adjustCurrentHistoryRetroactive(date: number) {
    let adjustedRecords: number[] = [];
    let prevData = this.cachedDays[date];


    let i = getDateNumberWithOffset(date, 1);
    let currentDate = getCurrentDateNumberForGame(this.lastSelectedRegion.reset_time);
    while (i <= currentDate) {
      if (this.cachedDays[i] == null)
        await this.populateSessionData(i);

      let dataToAdjust = this.cachedDays[i];

      if (dataToAdjust.totals.override.length > 0)
        return adjustedRecords;

      if (prevData.totals.override.length > 0) {
        prevData.totals.override.forEach(x => adjustInitialValues(dataToAdjust, x));
      } else {
        prevData.totals.calculated.forEach(x => adjustInitialValues(dataToAdjust, x));
      }

      dataToAdjust.calculateGainFromTasks();

      adjustedRecords.push(i);

      i = getDateNumberWithOffset(i, 1);
      prevData = dataToAdjust;
    }

    return adjustedRecords;

    function adjustInitialValues(dataToAdjust: DayData, x: CurrencyValue) {
      let d = findCurrencyRecord(dataToAdjust.totals.initial, x.currency);
      if (d == null) {
        d = { currency: x.currency, amount: x.amount };
        dataToAdjust.totals.initial.push(d);
      } else {
        d.amount = x.amount;
      }
    }
  }

  async getCurrencyDataForRange(currency: string, date_start: number, date_end: number) {
    await this.populateSessionDateRange(date_start, date_end);
    const data = [];
    const labels = []

    for (let i = date_start; i <= date_end; i = getDateNumberWithOffset(i, 1)) {
      let l = dateNumberToDate(i).toISOString().slice(0, 10);
      labels.push(l);
      if (!this.cachedDays[i].populated) continue;

      if (this.cachedDays[i].totals.override.length > 0) {
        data.push([l, findCurrencyRecord(this.cachedDays[i].totals.override, currency)?.amount]);
      }
      else if (this.cachedDays[i].totals.calculated.length > 0)
        data.push([l, findCurrencyRecord(this.cachedDays[i].totals.calculated, currency)?.amount]);
    }

    return [labels, data];
  }
}

export class SessionRecord {
  notes: string = "";
  currencies: CurrencyValue[] = [];
}

export class TrackedProgressData extends SessionRecord {
  value: number = 0;
  rankedStageValues: { [key: string]: number } = {};
}

export class PremiumEntry extends SessionRecord {
  id: number = 0;
  name: string = "";
  category: string = "";
  spending: number = 0;
}

export class DayData {
  dailyProgress: { [key: string | number]: TrackedProgressData; } = {};
  weeklyProgress: { [key: string | number]: TrackedProgressData; } = {};
  periodicProgress: { [key: string | number]: TrackedProgressData; } = {};
  eventProgress: { [key: string | number]: TrackedProgressData; } = {};
  premiumSources: PremiumEntry[] = [];
  otherSources: { [key: string | number]: SessionRecord; } = {};
  totals: { initial: CurrencyValue[], calculated: CurrencyHistory[], override: CurrencyValue[] } = { initial: [], calculated: [], override: [] };
  populated: boolean = false;

  [name: string]: any;


  constructor(gameName: string) {
    gameData[gameName].config.currencies.forEach(currency => {
      if (currency.tracked) {
        this.totals.calculated.push({ currency: currency.id, gain: 0, loss: 0, amount: 0 });
        this.totals.initial.push({ currency: currency.id, amount: 0 });
      }
    })
  }

  getProgress(taskType: string, taskId: string) {
    switch (taskType) {
      case 'daily':
        if (this.dailyProgress[taskId] == null) return null;
        return this.dailyProgress[taskId] ? this.dailyProgress[taskId].value : 0;
      case 'weekly':
        if (this.weeklyProgress[taskId] == null) return null;
        return this.weeklyProgress[taskId] ? this.weeklyProgress[taskId].value : 0;
      case 'periodic':
        if (this.periodicProgress[taskId] == null) return null;
        return this.periodicProgress[taskId] ? this.periodicProgress[taskId].value : 0;
      case 'event':
        if (this.eventProgress[taskId] == null) return null;
        return this.eventProgress[taskId] ? this.eventProgress[taskId].value : 0;
      case 'other':
        if (this.otherSources[taskId] == null) return null;
        return this.otherSources[taskId];
    }
    return 0;
  }

  getRankedProgress(taskType: string, taskId: string) {
    switch (taskType) {
      case 'daily':
        if (this.dailyProgress[taskId] == null) return null;
        return this.dailyProgress[taskId] ? this.dailyProgress[taskId].rankedStageValues : null;
      case 'weekly':
        if (this.weeklyProgress[taskId] == null) return null;
        return this.weeklyProgress[taskId] ? this.weeklyProgress[taskId].rankedStageValues : null;
      case 'periodic':
        if (this.periodicProgress[taskId] == null) return null;
        return this.periodicProgress[taskId] ? this.periodicProgress[taskId].rankedStageValues : null;
      case 'event':
        if (this.eventProgress[taskId] == null) return null;
        return this.eventProgress[taskId] ? this.periodicProgress[taskId].rankedStageValues : null;
    }
    return null;
  }

  setProgress(taskType: string, name: string, value: number | string, currencies: CurrencyValue[]) {
    let progressType;
    switch (taskType) {
      case 'daily':
        progressType = this.dailyProgress;
        break;
      case 'weekly':
        progressType = this.weeklyProgress;
        break;
      case 'periodic':
        progressType = this.periodicProgress;
        break;
      case 'event':
        progressType = this.eventProgress;
        break;
      case 'other':
        this.otherSources[name].notes = value as string;
        this.calculateGainFromTasks();
        return;
      default:
        return;
    }

    if (progressType[name] == null) progressType[name] = new TrackedProgressData();

    progressType[name].value = value as number;
    progressType[name].currencies = currencies;

    this.populated = true;
    this.calculateGainFromTasks();
  }

  setRankedStageProgress(taskType: string, name: string, stageName: string, value: number | string, currencies: CurrencyValue[]) {
    let progressType;
    switch (taskType) {
      case 'daily':
        progressType = this.dailyProgress;
        break;
      case 'weekly':
        progressType = this.weeklyProgress;
        break;
      case 'periodic':
        progressType = this.periodicProgress;
        break;
      case 'event':
        progressType = this.eventProgress;
        break;
      case 'other':
        this.otherSources[name].notes = value as string;
        this.calculateGainFromTasks();
        return;
      default:
        return;
    }

    if (progressType[name] == null) progressType[name] = new TrackedProgressData();

    progressType[name].rankedStageValues[stageName] = value as number;
    progressType[name].currencies = currencies;

    this.populated = true;
    this.calculateGainFromTasks();
  }

  getPremiumRecord(id: number, name: string, category: string) {
    if (this.premiumSources == null)
      return null;

    let res = this.premiumSources.find(x => {
      if (x.id == id && x.category == category && x.name == name)
        return true;
      else if (x.category == 'currency_pass' && x.name == name)
        return true;
      else
        return false;
    })

    return res;
  }

  addPremiumRecord(name: string, category: string, currencies: CurrencyValue[], spending: number) {
    let record = new PremiumEntry();

    record.id = this.premiumSources.reduce((prev, curr) => { return Math.max(prev, curr.id) }, 0) + 1;
    record.name = name.slice(0, 128);
    record.category = category;
    record.currencies = currencies;
    record.spending = spending;

    this.premiumSources.push(record);
    this.calculateGainFromTasks();

    return record;
  }

  deletePremiumRecord(id: number, name: string, category: string) {
    if (this.premiumSources == null)
      return false;

    let record = this.getPremiumRecord(id, name, category);

    if (record == null)
      return false;

    let index = this.premiumSources.indexOf(record);
    let res = this.premiumSources.splice(index,1);

    this.calculateGainFromTasks();

    return res;
  }

  getCurrencyInitialValues(currency: string) {
    let r = findCurrencyRecord(this.totals.initial, currency);
    return r ? r.amount : 0;
  }

  getCurrencyGainValues(currency: string) {
    let r = findCurrencyRecord(this.totals.calculated, currency) as CurrencyHistory;
    return r ? r.gain : 0;
  }


  getCurrencyValue(currency: string) {
    let r = this.totals.override.find(x => x.currency == currency);
    if (r) return r.amount;

    let h = this.totals.calculated.find(x => x.currency == currency);
    if (h) { return h.amount };

    return 0;
  }

  calculateGainFromTasks() {
    this.totals.calculated.forEach(x => {
      x.amount = this.getCurrencyInitialValues(x.currency); x.gain = 0;
    })

    const addTaskToTotals = (taskCurrencies: CurrencyValue[]) => {
      taskCurrencies.forEach(x => {
        let c = this.totals.calculated.find(y => y.currency == x.currency);
        if (c == null) return;
        c.amount += x.amount;
        c.gain += x.amount;
      });
    };

    for (let key in this.dailyProgress) {
      addTaskToTotals(this.dailyProgress[key].currencies);
    }

    for (let key in this.weeklyProgress) {
      addTaskToTotals(this.weeklyProgress[key].currencies);
    }

    for (let key in this.periodicProgress) {
      addTaskToTotals(this.periodicProgress[key].currencies);
    }

    for (let key in this.eventProgress) {
      addTaskToTotals(this.eventProgress[key].currencies);
    }

    for (let key in this.premiumSources) {
      addTaskToTotals(this.premiumSources[key].currencies);
    }

    for (let key in this.otherSources) {
      addTaskToTotals(this.otherSources[key].currencies);
    }
  }

  hasOverride() {
    return this.totals.override?.length > 0;
  }
}


export const sessionData: SessionCache = reactive({ cachedGameSession: {} });
