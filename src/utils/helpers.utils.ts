import { gameData, TrackedTask, sessionData, GameSession } from "./data.utils";
import { add, nextFriday, nextMonday, nextSaturday, nextSunday, nextThursday, nextTuesday, nextWednesday } from "date-fns";
import { TrackerDatabase } from "./db.utils";

const timerArray: { [key: string]: number } = {};


export async function handleDataChange(gameName: string, taskType: string, date: number, data: TrackedTask, value: number) {
    sessionData.cachedGameSession[gameName].cachedDays[date].setProgress(taskType, data.id, value);

    debounce(data.id, () => {
        gameData[gameName].db.insertTaskRecord(taskType, date, sessionData.cachedGameSession[gameName].lastSelectedRegion.id, data.id, value, {}, "");
    });
}


export function debounce(name: string, func: CallableFunction, wait: number = 500) {
    if (timerArray[name])
        clearTimeout(timerArray[name]);

    timerArray[name] = setTimeout(func, wait);
}

export function getNextDailyResetTime(gameName: string) {
    let resetTimeString = "00:00:00";
    let regionData = sessionData.cachedGameSession[gameName].lastSelectedRegion;

    if (regionData == null)
        console.log("region data not found");
    else
        resetTimeString = regionData.reset_time;

    let resetTime = add(new Date(parseResetTimeString(resetTimeString)), { seconds: -1 });

    if (new Date() > resetTime)
        resetTime = add(resetTime, { days: 1 });

    return resetTime;
}

export function getNextWeeklyResetTime(gameName: string) {
    let resetTimeString = "00:00:00";
    let regionData = sessionData.cachedGameSession[gameName].lastSelectedRegion;

    if (regionData == null)
        console.log("region data not found");
    else
        resetTimeString = regionData.reset_time;

    let nextWeek: Date = new Date();

    switch (gameData[gameName].config.weekly_reset_day.toLowerCase()) {
        case "monday":
            nextWeek = nextMonday(new Date());
            break;
        case "tuesday":
            nextWeek = nextTuesday(new Date());
            break;
        case "wednesday":
            nextWeek = nextWednesday(new Date());
            break;
        case "thursday":
            nextWeek = nextThursday(new Date());
            break;
        case "friday":
            nextWeek = nextFriday(new Date());
            break;
        case "saturday":
            nextWeek = nextSaturday(new Date());
            break;
        case "sunday":
            nextWeek = nextSunday(new Date());
            break;
    }

    let resetTime = add(new Date(parseResetTimeString(resetTimeString, nextWeek)), { seconds: -1 });

    return resetTime;
}

export function getLastWeeklyResetTime(gameName: string){
    return add(getNextWeeklyResetTime(gameName), {weeks: -1});
}

export function parseResetTimeString(resetTimeString: string, d: Date = new Date()) {
    let resetNums = resetTimeString.split(/\:| /);
    let resetTime: number;

    if (resetNums.length >= 5) {
        let parsedNums = resetNums.map((x) => Number.parseInt(x));

        if (parsedNums[3] < 0) parsedNums[4] *= -1;

        resetTime = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), parsedNums[0] - parsedNums[3], parsedNums[1] - parsedNums[4], parsedNums[2]);
    } else {
        resetTime = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
    }


    return resetTime;
}

export function getCurrentDateForGame(resetTimeString: string) {
    let d = new Date();

    let resetTime: number = parseResetTimeString(resetTimeString);

    if (Date.now() < resetTime)
        d.setDate(d.getDate() - 1);

    return d;
}

export function getCurrentDateNumberForGame(resetTimeString: string) {
    return Number.parseInt(dateToDateNumber(getCurrentDateForGame(resetTimeString)));
}


export function dateToDateNumber(date: Date) {
    return date.toISOString().slice(0, 10).split('-').join('');
}

export async function updateGameView(gameName: string) {
    if (sessionData.cachedGameSession[gameName] == null) {
        const regionData = gameData[gameName].config.regions[0];
        let date = getCurrentDateNumberForGame(regionData.reset_time);
        sessionData.cachedGameSession[gameName] = new GameSession(gameName, date, regionData);
        await sessionData.cachedGameSession[gameName].populateSessionData();
    }
}