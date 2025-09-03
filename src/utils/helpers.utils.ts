import { CurrencyValue, gameData, PeriodicTask, SteppedRewardEntry, TrackedTask } from "./gameData";
import { sessionData, GameSession, PremiumEntry } from './sessionData';
import { CurrencyHistory, TrackerDatabase } from "./db.utils";
import { getLastWeeklyResetDateNumber, getCurrentDateNumberForGame, getDateNumberWithOffset, getLastPeriodicResetDateNumber, getNextWeeklyResetDateNumber, getNextPeriodicResetDateNumber, getNextDailyResetTime } from "./date.utils";

const timerArray: { [key: string]: number } = {};

export function taskTypeToProgressName(taskType: string) {
    return taskType + 'Progress';
}

export function findCurrencyRecord(source: CurrencyHistory[] | CurrencyValue[], target: string) {
    if (!source) return null;
    return source.find(x => x.currency == target);
}

export async function handleTaskRecordChange(gameName: string, taskType: string, date: number, data: TrackedTask | PeriodicTask, value: number) {
    let currencies: CurrencyValue[] = [];
    const session = sessionData.cachedGameSession[gameName];
    let nextCheck = 0;
    let recordsToUpdate: number[] = [];

    if (data.stepped_rewards != null) {
        let compareValue = 0;

        if (taskType == 'weekly') {
            let lastWeekly = getLastWeeklyResetDateNumber(gameName, date);
            nextCheck = getNextWeeklyResetDateNumber(gameName, date);
            compareValue = session.getHighestProgressForTaskinRange(taskType, data.id, lastWeekly, date).highest;
        } else if (taskType == 'periodic' && 'reset_day' in data && 'reset_period' in data) {
            let lastPeriod = getLastPeriodicResetDateNumber(data.reset_day, date, data.reset_period);
            nextCheck = getNextPeriodicResetDateNumber(data.reset_day, date, data.reset_period);
            compareValue = session.getHighestProgressForTaskinRange(taskType, data.id, lastPeriod, date).highest;
        }

        sumCurrenciesforSteppedRewards(data, compareValue, value, gameName, currencies);
        recordsToUpdate = await session.adjustSteppedRewardsValuesRetroactive(data, getDateNumberWithOffset(date, 1), nextCheck, taskType, value);
    } else if (data.rewards != null && value > 0) {
        data.rewards.forEach(c => {
            let existing = currencies.find(x => x.currency == c.currency);
            if (existing) {
                existing.amount += c.amount
            } else {
                currencies.push(c);
            }
        })
    }

    session.cachedDays[date].setProgress(taskType, data.id, value, currencies);

    let historyRecordsToUpdate = [...new Set([...recordsToUpdate, ...await session.adjustCurrentHistoryRetroactive(date)])];

    debounce(data.id, () => {
        gameData[gameName].db.insertTaskRecord(taskType, date, session.lastSelectedRegion.id, data.id, value, currencies, "");
        gameData[gameName].db.updateTaskRecordsForRange(recordsToUpdate, session.cachedDays, session.lastSelectedRegion.id, taskType, data.id);
        gameData[gameName].db.insertCurrencyHistory(date, session.lastSelectedRegion.id, session.cachedDays[date].totals.calculated, session.cachedDays[date].totals.override, "");
        gameData[gameName].db.updateCurrencyHistoryForRange(historyRecordsToUpdate, session.cachedDays, session.lastSelectedRegion.id);
    });

    return currencies;
}

export async function handleGenericRecordChange(gameName: string, taskType: string, date: number, data: TrackedTask | PeriodicTask, value: number) {
    let currencies: CurrencyValue[] = [];
    const session = sessionData.cachedGameSession[gameName];
    let recordsToUpdate: number[] = [];

    if (data.rewards != null && value > 0) {
        data.rewards.forEach(c => {
            let existing = currencies.find(x => x.currency == c.currency);
            if (existing) {
                existing.amount += c.amount
            } else {
                currencies.push(c);
            }
        })
    }

    if (value > 0)
        session.cachedDays[date].setProgress(taskType, data.id, value, currencies);
    else
        session.cachedDays[date].deleteProgress(taskType, data.id);

    let historyRecordsToUpdate = [...new Set([...recordsToUpdate, ...await session.adjustCurrentHistoryRetroactive(date)])];

    debounce(data.id, () => {
        gameData[gameName].db.insertTaskRecord(taskType, date, session.lastSelectedRegion.id, data.id, value, currencies, "");
        gameData[gameName].db.updateTaskRecordsForRange(recordsToUpdate, session.cachedDays, session.lastSelectedRegion.id, taskType, data.id);
        gameData[gameName].db.insertCurrencyHistory(date, session.lastSelectedRegion.id, session.cachedDays[date].totals.calculated, session.cachedDays[date].totals.override, "");
        gameData[gameName].db.updateCurrencyHistoryForRange(historyRecordsToUpdate, session.cachedDays, session.lastSelectedRegion.id);
    });

    return currencies;
}

export function sumCurrenciesforSteppedRewards(data: TrackedTask | PeriodicTask, compareValue: number, value: number, gameName: string, currencies: CurrencyValue[]) {
    data.stepped_rewards.forEach(x => {
        if (x.step > compareValue && x.step <= value) {
            x.currencies.forEach(c => {
                let existing = currencies.find((y => y.currency == c.currency));
                if (existing) {
                    existing.amount += c.amount;
                } else {
                    currencies.push({ ...c });
                }
            });
        }
    });
}

export async function handleRankedStageRecordChange(gameName: string, taskType: string, date: number, data: TrackedTask | PeriodicTask, value: number | string, id: string) {
    let currencies: CurrencyValue[] = [];
    let stagesSum = 0;
    const session = sessionData.cachedGameSession[gameName];

    value = Number.parseInt(value as string);

    if (data.ranked_stages != null) {
        let compareValues = null;
        let currentProgress = session.cachedDays[date].getRankedProgress(taskType, data.id);

        if (currentProgress == null)
            currentProgress = {};

        currentProgress[id] = value;

        if (taskType == 'weekly') {
            let lastWeekly = getLastWeeklyResetDateNumber(gameName, date);
            compareValues = session.getHighestProgressForRankedStagesinRange(taskType, data, lastWeekly, date);
        } else if (taskType == 'periodic' && 'reset_day' in data && 'reset_period' in data) {
            let lastPeriod = getLastPeriodicResetDateNumber(data.reset_day, date, data.reset_period);
            compareValues = session.getHighestProgressForRankedStagesinRange(taskType, data, lastPeriod, date);
        }

        stagesSum = sumCurrenciesForRankedStages(data, currentProgress, compareValues, gameName, currencies);
    } else {
        return;
    }

    session.cachedDays[date].setRankedStageProgress(taskType, data.id, id, value, currencies);

    let recordsToUpdate = await session.adjustCurrentHistoryRetroactive(date);

    debounce(data.id, () => {
        gameData[gameName].db.insertTaskRecord(taskType, date, session.lastSelectedRegion.id, data.id, stagesSum, currencies, "");
        gameData[gameName].db.insertRankedStageRecord(date, session.lastSelectedRegion.id, data.id, id, value);
        gameData[gameName].db.insertCurrencyHistory(date, session.lastSelectedRegion.id, session.cachedDays[date].totals.calculated, session.cachedDays[date].totals.override, "");
        gameData[gameName].db.updateCurrencyHistoryForRange(recordsToUpdate, session.cachedDays, session.lastSelectedRegion.id);
    });

    return currencies;
}

export async function updatePremiumRecord(gameName: string, date: number, record: PremiumEntry) {
    const session = sessionData.cachedGameSession[gameName];

    debounce(record.id.toString(), () => {
        gameData[gameName].db.insertPremiumRecord(date, session.lastSelectedRegion.id, record.id, record.name, record.category, record.spending, record.currencies, record.notes);
    });
}

export async function removePremiumRecord(gameName: string, date: number, record: PremiumEntry) {
    const session = sessionData.cachedGameSession[gameName];

    debounce(record.id.toString(), () => {
        gameData[gameName].db.deletePremiumRecord(date, session.lastSelectedRegion.id, record.id, record.name, record.category);
    });
}

function sumCurrenciesForRankedStages(data: TrackedTask, currentProgress: { [key: string]: number; }, compareValues: { [key: string]: { [key: string]: number } } | null, gameName: string, currencies: CurrencyValue[]) {
    let stagesSum = 0;
    data.ranked_stages.stages.forEach(stage => {
        if (currentProgress[stage.id] == null)
            return;

        stagesSum += currentProgress[stage.id];
        let compareValue = -1;

        if (compareValues != null && stage.id in compareValues)
            compareValue = compareValues[stage.id].value;

        stage.rewards.forEach(x => {
            if (x.step > compareValue && x.step <= currentProgress[stage.id]) {
                x.currencies.forEach(c => {
                    let existing = currencies.find((y => y.currency == c.currency));
                    if (existing) {
                        existing.amount += c.amount;
                    } else {
                        currencies.push({ ...c });
                    }
                });
            }
        });
    });
    return stagesSum;
}

export async function handleCurrencyHistoryChange(gameName: string, date: number, currency: string, value: number) {
    const session = sessionData.cachedGameSession[gameName];

    if (value == null || value < 0) value = 0;

    let target = session.cachedDays[date].totals.override;

    if (session.cachedDays[date].totals.override.length == 0)
        target = session.cachedDays[date].totals.calculated;


    target.forEach(c => {
        let r = findCurrencyRecord(session.cachedDays[date].totals.override, c.currency);

        if (r == null) {
            r = { currency: c.currency, amount: c.amount };
            session.cachedDays[date].totals.override.push(r);
        }

        if (c.currency == currency)
            r.amount = value;
        else
            r.amount = c.amount;
    })

    let recordsToUpdate = await session.adjustCurrentHistoryRetroactive(date);


    debounce(`${date}_${currency}`, () => {
        gameData[gameName].db.insertCurrencyHistory(date, session.lastSelectedRegion.id, session.cachedDays[date].totals.calculated, session.cachedDays[date].totals.override, "");
        gameData[gameName].db.updateCurrencyHistoryForRange(recordsToUpdate, session.cachedDays, session.lastSelectedRegion.id);
    });
}


export function debounce(name: string, func: CallableFunction, wait: number = 500) {
    if (timerArray[name])
        clearTimeout(timerArray[name]);

    timerArray[name] = setTimeout(func, wait);
}

export async function updateGameView(gameName: string) {
    let config = gameData[gameName].config;

    let date = sessionData.cachedGameSession[gameName].lastSelectedDay;

    let startDate = getLastWeeklyResetDateNumber(gameName, date);
    let endDate = date;

    if (config.periodic != null) {
        config.periodic.forEach(periodic => {
            let lastPeriod = getLastPeriodicResetDateNumber(periodic.reset_day, date, periodic.reset_period);
            if (lastPeriod < startDate)
                startDate = lastPeriod;
        })
    }

    await sessionData.cachedGameSession[gameName].populateSessionDateRange(startDate, endDate);

    // get most recent total currency values
    await sessionData.cachedGameSession[gameName].populateInitialCurrencyValue(date);
}