import { add, nextMonday, nextTuesday, nextWednesday, nextThursday, nextFriday, nextSaturday, nextSunday } from "date-fns";
import { gameData } from "./gameData";
import { sessionData } from "./sessionData";


export function getNextDailyResetTime(gameName: string) {
    let resetTimeString = "00:00:00";
    let regionData = sessionData.cachedGameSession[gameName]?.lastSelectedRegion;

    if (regionData == null)
        console.log("region data not found");

    else
        resetTimeString = regionData.reset_time;

    let resetTime = add(new Date(parseResetTimeString(resetTimeString)), { seconds: -1 });

    if (new Date() > resetTime)
        resetTime = add(resetTime, { days: 1 });

    return resetTime;
}

export function getNextWeeklyResetTime(gameName: string, fromDate: Date = new Date()) {
    let resetTimeString = "00:00:00";
    let regionData = sessionData.cachedGameSession[gameName]?.lastSelectedRegion;

    if (regionData == null)
        console.log("region data not found");

    else
        resetTimeString = regionData.reset_time;

    let nextWeek: Date = new Date();

    switch (gameData[gameName].config.weekly_reset_day.toLowerCase()) {
        case "monday":
            nextWeek = nextMonday(fromDate);
            break;
        case "tuesday":
            nextWeek = nextTuesday(fromDate);
            break;
        case "wednesday":
            nextWeek = nextWednesday(fromDate);
            break;
        case "thursday":
            nextWeek = nextThursday(fromDate);
            break;
        case "friday":
            nextWeek = nextFriday(fromDate);
            break;
        case "saturday":
            nextWeek = nextSaturday(fromDate);
            break;
        case "sunday":
            nextWeek = nextSunday(fromDate);
            break;
    }

    let resetTime = add(new Date(parseResetTimeString(resetTimeString, nextWeek)), { seconds: -1 });

    return resetTime;
}

export function getLastWeeklyResetTime(gameName: string, fromDate: Date = new Date()) {
    return add(getNextWeeklyResetTime(gameName, fromDate), { weeks: -1 });
}

export function getLastWeeklyResetDateNumber(gameName: string, fromDate: number) {
    let date = dateNumberToDate(fromDate);
    let lastWeekly = add(getNextWeeklyResetTime(gameName, date), { weeks: -1 });
    return dateToDateNumber(lastWeekly);
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
    return dateToDateNumber(getCurrentDateForGame(resetTimeString));
}

export function dateToDateNumber(date: Date) {
    return Number.parseInt(date.toISOString().slice(0, 10).split('-').join(''));
}

export function dateNumberToDate(date: number) {
    let d = date.toString();
    //@ts-ignore
    return new Date(d.slice(0, 4), d.slice(4, 6) - 1, d.slice(6, 8));
}

export function getDateNumberWithOffset(date: number, offset: number) {
    let newDate = dateNumberToDate(date);
    return dateToDateNumber(add(newDate, { days: offset }));
}