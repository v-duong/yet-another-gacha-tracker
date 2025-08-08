import { reactive } from 'vue';
import { RegionData, gameData, CurrencyValue } from './gameData';
import { TaskRecord, HistoryRecord, CurrencyHistory } from './db.utils';
import { dateNumberToDate, getCurrentDateForGame, getCurrentDateNumberForGame, getDateNumberWithOffset } from './date.utils';
import { findCurrencyRecord } from './helpers.utils';

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
    const region = this.lastSelectedRegion.id;

    const dailyRecords = await db.getAllDailyRecord(date, region);
    const weeklyRecords = await db.getAllWeeklyRecord(date, region);
    const periodicRecords = await db.getAllPeriodicRecord(date, region);
    const otherRecords = await db.getAllOtherRecord(date, region);
    const historyRecord = await db.getCurrencyHistory(date, region);

    dailyRecords?.forEach((record) => this.fillRecord(record, 'dailyProgress', 'totalCurrencyFromDaily'));
    weeklyRecords?.forEach((record) => this.fillRecord(record, 'weeklyProgress', 'totalCurrencyFromWeekly'));
    periodicRecords?.forEach((record) => this.fillRecord(record, 'periodicProgress', 'totalCurrencyFromPeriodic'));

    const selectedDay = this.cachedDays[date];

    otherRecords?.forEach((record) => {
      selectedDay.otherSources[record.name].notes = record.notes;
      selectedDay.otherSources[record.name].currencies = record.currencies;
    });

    this.fillHistoryRecord(historyRecord);

    return selectedDay;
  }

  async populateSessionDateRange(date_start: number, date_end: number) {
    const db = gameData[this.gameName].db;
    const region = this.lastSelectedRegion.id;
    let needsPopulate = false;

    for (let i = date_start; i < date_end; i = getDateNumberWithOffset(i, 1)) {
      if (this.cachedDays[i] == null) {
        this.cachedDays[i] = new DayData(this.gameName);
        needsPopulate = true;
      }
    }

    if (!needsPopulate) return;

    const dailyRecords = await db.getAllDailyRecordForRange(date_start, date_end, region);
    const weeklyRecords = await db.getAllWeeklyRecordForRange(date_start, date_end, region);
    const periodicRecords = await db.getAllPeriodicRecordForRange(date_start, date_end, region);
    const otherRecords = await db.getAllOtherRecordForRange(date_start, date_end, region);
    const historyRecord = await db.getCurrencyHistoryForRange(date_start, date_end, region);

    dailyRecords?.forEach((record) => this.fillRecord(record, 'dailyProgress', 'totalCurrencyFromDaily'));
    weeklyRecords?.forEach((record) => this.fillRecord(record, 'weeklyProgress', 'totalCurrencyFromWeekly'));
    periodicRecords?.forEach((record) => this.fillRecord(record, 'periodicProgress', 'totalCurrencyFromPeriodic'));

    otherRecords?.forEach((record) => {
      this.cachedDays[record.date].otherSources[record.name].notes = record.notes;
      this.cachedDays[record.date].otherSources[record.name].currencies = record.currencies;
    });

    this.fillHistoryRecord(historyRecord);
  }

  fillRecord(record: TaskRecord, firstField: string, secondField: string) {
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

  getHighestProgressForSteppedinRange(taskType: string, taskId: string, date_start: number, date_end: number) {
    let highest = 0, highestDate = 0;
    let target = taskType == 'weekly' ? 'weeklyProgress' : 'periodicProgress';

    for (let i = date_start; i < date_end; i++) {
      //@ts-ignore
      if (this.cachedDays == null || this.cachedDays[i] == null || this.cachedDays[i][target][taskId] == null) continue;
      //@ts-ignore
      let num = this.cachedDays[i][target][taskId].value;
      if (num > highest) {
        highest = num;
        highestDate = i;
      }

    }

    return { highest: highest, highestDate: highestDate };
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

    console.log(date);

    if (prevDayData.totals.override.length > 0) {
      prevDayData.totals.override.forEach(x => addToInitial(x));
    } else if (prevDayData.populated) {
      prevDayData.totals.calculated.forEach(x => addToInitial(x));
    } else {
      const db = gameData[this.gameName].db;
      const res = await db.getLastCurrencyHistory(date, this.lastSelectedRegion.id);

      console.log(res)

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
        prevData.totals.override.forEach(x => {
        let d = findCurrencyRecord(dataToAdjust.totals.initial, x.currency);
        if (d == null) {
          d = { currency: x.currency, amount: x.amount };
          dataToAdjust.totals.initial.push(d);
        } else {
          d.amount = x.amount;
        }
      });
      } else {
        prevData.totals.calculated.forEach(x => {
          let d = findCurrencyRecord(dataToAdjust.totals.initial, x.currency);
          if (d == null) {
            d = { currency: x.currency, amount: x.amount };
            dataToAdjust.totals.initial.push(d);
          } else {
            d.amount = x.amount;
          }
        });
      }

      dataToAdjust.calculateGainFromTasks();

      adjustedRecords.push(i);

      i = getDateNumberWithOffset(i, 1);
      prevData = dataToAdjust;
    }

    return adjustedRecords;
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

export class TrackedProgressData {
  value: number = 0;
  currencies: CurrencyValue[] = [];
}

export class DayData {
  dailyProgress: { [key: string | number]: TrackedProgressData; } = {};
  weeklyProgress: { [key: string | number]: TrackedProgressData; } = {};
  periodicProgress: { [key: string | number]: TrackedProgressData; } = {};
  otherSources: { [key: string | number]: OtherEntry; } = {};
  totals: { initial: CurrencyValue[], calculated: CurrencyHistory[], override: CurrencyValue[] } = { initial: [], calculated: [], override: [] };
  populated: boolean = false;

  constructor(gameName: string) {
    gameData[gameName].config.currencies.forEach(currency => {
      if (currency.tracked) {
        this.totals.calculated.push({ currency: currency.id, gain: 0, loss: 0, amount: 0 });
        this.totals.initial.push({ currency: currency.id, amount: 0 });
      }
    })
  }

  getProgress(taskType: string, name: string) {
    switch (taskType) {
      case 'daily':
        return this.dailyProgress[name] ? this.dailyProgress[name].value : 0;
      case 'weekly':
        return this.weeklyProgress[name] ? this.weeklyProgress[name].value : 0;
      case 'periodic':
        return this.periodicProgress[name] ? this.periodicProgress[name].value : 0;
      case 'other':
        return this.otherSources[name];
    }
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

  getCurrencyInitialValues(currency: string) {
    let r = findCurrencyRecord(this.totals.initial, currency);
    return r ? r.amount : 0;
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
  }

  hasOverride() {
    return this.totals.override?.length > 0;
  }
}


export type OtherEntry = {
  notes: string;
  currencies: CurrencyValue[];
};

export const sessionData: SessionCache = reactive({ cachedGameSession: {} });
