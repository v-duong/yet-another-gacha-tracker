import { CurrencyValue, gameData, PeriodicTask, SteppedRewardEntry, TrackedTask } from "./gameData";
import { sessionData, GameSession } from './sessionData';
import { CurrencyHistory, TrackerDatabase } from "./db.utils";
import { getLastWeeklyResetDateNumber, getCurrentDateNumberForGame, getDateNumberWithOffset, getLastPeriodicResetDateNumber } from "./date.utils";

const timerArray: { [key: string]: number } = {};


export function findCurrencyRecord(source: CurrencyHistory[] | CurrencyValue[], target: string) {
    return source.find(x => x.currency == target);
}

export async function handleTaskRecordChange(gameName: string, taskType: string, date: number, data: TrackedTask | PeriodicTask, value: number) {
    let currencies: CurrencyValue[] = [];
    const session = sessionData.cachedGameSession[gameName];

    if (data.stepped_rewards != null && value > 0) {
        let compareValue = 0;

        if (taskType == 'weekly') {
            let lastWeekly = getLastWeeklyResetDateNumber(gameName, date);
            compareValue = session.getHighestProgressForTaskinRange(taskType, data.id, lastWeekly, date).highest;
        } else if (taskType == 'periodic' && 'reset_day' in data && 'reset_period' in data) {
            let lastPeriod = getLastPeriodicResetDateNumber(data.reset_day, date, data.reset_period);
            compareValue = session.getHighestProgressForTaskinRange(taskType, data.id, lastPeriod, date).highest;
        }

        data.stepped_rewards.forEach(x => {
            sumCurrenciesInRewardsArray(x, compareValue, value, gameName, currencies);
        })
    } else if (data.rewards != null && value > 0) {
        data.rewards.forEach(c => {
            if (!gameData[gameName].trackedCurrencies.includes(c.currency))
                return;

            currencies.push(c);
        })
    }

    session.cachedDays[date].setProgress(taskType, data.id, value, currencies);

    let recordsToUpdate = await session.adjustCurrentHistoryRetroactive(date);

    debounce(data.id, () => {
        gameData[gameName].db.insertTaskRecord(taskType, date, session.lastSelectedRegion.id, data.id, value, currencies, "");
        gameData[gameName].db.insertCurrencyHistory(date, session.lastSelectedRegion.id, session.cachedDays[date].totals.calculated, session.cachedDays[date].totals.override, "");
        gameData[gameName].db.updateCurrencyHistoryForRange(recordsToUpdate, session.cachedDays, session.lastSelectedRegion.id);
    });

    return currencies;
}

function sumCurrenciesInRewardsArray(x: SteppedRewardEntry, compareValue: number, value: number, gameName: string, currencies: CurrencyValue[]) {
    if (x.step > compareValue && x.step <= value) {
        x.currencies.forEach(c => {
            if (!gameData[gameName].trackedCurrencies.includes(c.currency))
                return;

            let existing = currencies.find((y => y.currency == c.currency));
            if (existing) {
                existing.amount += c.amount;
            } else {
                currencies.push({ ...c });
            }
        });
    }
}

export async function handleRankedStageRecordChange(gameName: string, taskType: string, date: number, data: PeriodicTask, value: number, id: string) {
    let currencies: CurrencyValue[] = [];
    console.log(data);
    const session = sessionData.cachedGameSession[gameName];

    if (data.ranked_stages != null) {
        let compareValues: { [key: string]: number } | null = null;

        if (taskType == 'weekly') {
            let lastWeekly = getLastWeeklyResetDateNumber(gameName, date);
            compareValues = session.getHighestProgressForRankedStagesinRange(taskType, data, lastWeekly, date)[0];
        } else if (taskType == 'periodic' && 'reset_day' in data && 'reset_period' in data) {
            let lastPeriod = getLastPeriodicResetDateNumber(data.reset_day, date, data.reset_period);
            compareValues = session.getHighestProgressForRankedStagesinRange(taskType, data, lastPeriod, date)[0];
        }

        data.ranked_stages.stages.forEach(stage => {
            let compareValue = 0;
            if (compareValues != null && stage.id in compareValues)
                compareValue = compareValues[stage.id];

            stage.rewards.forEach(x => {
                if (x.step > compareValue && x.step <= value) {
                    x.currencies.forEach(c => {
                        if (!gameData[gameName].trackedCurrencies.includes(c.currency))
                            return;

                        let existing = currencies.find((y => y.currency == c.currency));
                        if (existing) {
                            existing.amount += c.amount;
                        } else {
                            currencies.push({ ...c });
                        }
                    });
                }
            })
        })
    } else {
        return;
    }

    session.cachedDays[date].setRankedStageProgress(taskType, data.id, id, value, currencies);

    //let recordsToUpdate = await session.adjustCurrentHistoryRetroactive(date);
    //
    //debounce(data.id, () => {
    //    gameData[gameName].db.insertTaskRecord(taskType, date, session.lastSelectedRegion.id, data.id, value, currencies, "");
    //    gameData[gameName].db.insertCurrencyHistory(date, session.lastSelectedRegion.id, session.cachedDays[date].totals.calculated, session.cachedDays[date].totals.override, "");
    //    gameData[gameName].db.updateCurrencyHistoryForRange(recordsToUpdate, session.cachedDays, session.lastSelectedRegion.id);
    //});

    return currencies;
}

export async function handleCurrencyHistoryChange(gameName: string, date: number, currency: string, value: number) {
    const session = sessionData.cachedGameSession[gameName];

    if (value == null || value < 0) value = 0;

    session.cachedDays[date].totals.calculated.forEach(c => {
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
    if (sessionData.cachedGameSession[gameName] == null) {
        const regionData = gameData[gameName].config.regions[0];
        let date = getCurrentDateNumberForGame(regionData.reset_time);
        sessionData.cachedGameSession[gameName] = new GameSession(gameName, date, regionData);
    }

    let date = sessionData.cachedGameSession[gameName].lastSelectedDay;

    let startDate = getLastWeeklyResetDateNumber(gameName, date);
    let endDate = getDateNumberWithOffset(date, 7);


    if (gameData[gameName].config.periodic != null) {
        gameData[gameName].config.periodic.forEach(periodic => {
            let lastPeriod = getLastPeriodicResetDateNumber(periodic.reset_day, date, periodic.reset_period);
            if (lastPeriod < startDate)
                startDate = lastPeriod;
        })
    }

    await sessionData.cachedGameSession[gameName].populateSessionDateRange(startDate, endDate);

    // get most recent total currency values
    await sessionData.cachedGameSession[gameName].populateInitialCurrencyValue(date);
}