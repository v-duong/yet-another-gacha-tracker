import { CurrencyValue, gameData, TrackedTask } from "./gameData";
import { sessionData, GameSession } from './sessionData';
import { TrackerDatabase } from "./db.utils";
import { getLastWeeklyResetDateNumber, getCurrentDateNumberForGame, dateToDateNumber, getLastWeeklyResetTime, getNextWeeklyResetTime, getDateNumberWithOffset } from "./date.utils";

const timerArray: { [key: string]: number } = {};


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
        data.rewards.forEach(x => {
            currencies.push(x);
        })
    }

    session.cachedDays[date].setProgress(taskType, data.id, value, currencies);

    debounce(data.id, () => {
        gameData[gameName].db.insertTaskRecord(taskType, date, session.lastSelectedRegion.id, data.id, value, currencies, "");
        gameData[gameName].db.insertCurrencyHistory(date, session.lastSelectedRegion.id, session.cachedDays[date].totals.calculated, session.cachedDays[date].totals.override, "");
    });

    return currencies;
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

    console.log('te');

    let date = sessionData.cachedGameSession[gameName].lastSelectedDay;

    const lastWeekly = getLastWeeklyResetDateNumber(gameName, date);
    const nextWeekly = getDateNumberWithOffset(date,7);

    await sessionData.cachedGameSession[gameName].populateSessionDateRange(lastWeekly, nextWeekly);

    // get most recent total currency values
    await sessionData.cachedGameSession[gameName].populateInitialCurrencyValue(date);
}