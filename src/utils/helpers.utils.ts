import { CurrencyValue, gameData, TrackedTask } from "./gameData";
import { sessionData, GameSession } from './sessionData';
import { CurrencyHistory, TrackerDatabase } from "./db.utils";
import { getLastWeeklyResetDateNumber, getCurrentDateNumberForGame, dateToDateNumber, getLastWeeklyResetTime, getNextWeeklyResetTime, getDateNumberWithOffset } from "./date.utils";

const timerArray: { [key: string]: number } = {};


export function findCurrencyRecord(source : CurrencyHistory[] | CurrencyValue[], target : string) {
    return source.find(x=>x.currency == target);
}

export async function handleTaskRecordChange(gameName: string, taskType: string, date: number, data: TrackedTask, value: number) {
    let currencies: CurrencyValue[] = [];
    const session = sessionData.cachedGameSession[gameName];

    if (data.stepped_rewards != null && value > 0) {
        let compareValue = 0;

        if (taskType == 'weekly') {
            let lastWeekly = getLastWeeklyResetDateNumber(gameName, date);
            compareValue = session.getHighestProgressForSteppedinRange(taskType, data.id, lastWeekly, date).highest;
        }

        data.stepped_rewards.forEach(x => {
            if (x.step > compareValue && x.step <= value) {
                x.currencies.forEach(c => {
                    if (!gameData[gameName].trackedCurrencies.includes(c.currency))
                        return;

                    let existing = currencies.find((y => y.currency == c.currency))
                    if (existing) {
                        existing.amount += c.amount;
                    } else {
                        currencies.push({ ...c });
                    }
                })
            }
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

export async function handleCurrencyHistoryChange(gameName: string, date:number, currency: string, value: number) {
    const session = sessionData.cachedGameSession[gameName];

    if (value == null || value < 0) value = 0;

    session.cachedDays[date].totals.calculated.forEach(c=>{
        let r = findCurrencyRecord(session.cachedDays[date].totals.override, c.currency);
        
        if (r == null) {
            r = {currency: c.currency, amount: c.amount};
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

    const lastWeekly = getLastWeeklyResetDateNumber(gameName, date);
    const nextWeekly = getDateNumberWithOffset(date, 7);

    await sessionData.cachedGameSession[gameName].populateSessionDateRange(lastWeekly, nextWeekly);

    // get most recent total currency values
    await sessionData.cachedGameSession[gameName].populateInitialCurrencyValue(date);
}