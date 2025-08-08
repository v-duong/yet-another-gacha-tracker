import { appConfigDir } from '@tauri-apps/api/path';
import { exists, mkdir } from '@tauri-apps/plugin-fs';
import Database from '@tauri-apps/plugin-sql';
import { CurrencyValue } from './gameData';


export class TrackerDatabase {
    db: Database;

    constructor(db: Database) {
        this.db = db;
    }

    getAllDailyRecord = async (date: number, region: string) => await this.getAllTaskRecordForDay('daily', date, region);
    getAllWeeklyRecord = async (date: number, region: string) => await this.getAllTaskRecordForDay('weekly', date, region);
    getAllPeriodicRecord = async (date: number, region: string) => await this.getAllTaskRecordForDay('periodic', date, region);
    getAllOtherRecord = async (date: number, region: string) => await this.getAllTaskRecordForDay('other', date, region);

    getAllDailyRecordForRange = async (date_start: number, date_end: number, region: string) => this.getAllTaskRecordForRange('daily', date_start, date_end, region);
    getAllWeeklyRecordForRange = async (date_start: number, date_end: number, region: string) => this.getAllTaskRecordForRange('weekly', date_start, date_end, region);
    getAllPeriodicRecordForRange = async (date_start: number, date_end: number, region: string) => this.getAllTaskRecordForRange('periodic', date_start, date_end, region);
    getAllOtherRecordForRange = async (date_start: number, date_end: number, region: string) => this.getAllTaskRecordForRange('other', date_start, date_end, region);

    getAllTaskRecordForRange = async (taskType: string, date_start: number, date_end: number, region: string) => this.getTaskRecordForRange(taskType, date_start, date_end, region);


    async getTaskRecordForRange(taskType: string, date_start: number, date_end: number, region: string, taskId: string = '') {
        let taskFilter = '';

        if (taskId != '')
            taskFilter = `AND name='${taskId}'`;

        const existingRecord: [...any] = await this.db.select(`SELECT * FROM ${taskType} WHERE date>=${date_start} AND date < ${date_end} AND region='${region}' ${taskFilter}`);

        existingRecord.forEach(x => x.currencies = JSON.parse(x.currencies));

        if (existingRecord.length > 0)
            return existingRecord;
        else
            return null;
    }


    async getAllTaskRecordForDay(taskType: string, date: number, region: string) {
        const existingRecord: [...any] = await this.db.select(`SELECT * FROM ${taskType} WHERE date=${date} AND region='${region}'`);

        existingRecord.forEach(x => x.currencies = JSON.parse(x.currencies));

        if (existingRecord.length > 0)
            return existingRecord;
        else
            return null;
    }

    async getTaskRecord(taskType: string, date: number, region: string, taskId: string) {
        const existingRecord: [...any] = await this.db.select(`SELECT * FROM ${taskType} WHERE date=${date} AND region='${region}' AND name='${taskId}'`);

        existingRecord.forEach(x => x.currencies = JSON.parse(x.currencies));

        if (existingRecord.length > 0)
            return existingRecord[0];
        else
            return null;
    }

    async insertTaskRecord(taskType: string, date: number, region: string, taskId: string, value: number | boolean, currencies: {}, notes: string) {
        const existingRecord = await this.getTaskRecord(taskType, date, region, taskId);

        if (existingRecord == null)
            await this.db.execute(
                `INSERT into ${taskType}(date, region, name, value, currencies, notes) VALUES($1, $2, $3, $4, $5, $6)`,
                [date, region, taskId, value, currencies, notes],
            )
        else {
            if (existingRecord.value == value && existingRecord.notes == notes) {
                return;
            }
            await this.db.execute(
                `UPDATE ${taskType} SET value=$1, currencies=$2, notes=$3 WHERE date=${date} AND region='${region}' AND name='${taskId}'`,
                [value, currencies, notes],
            )
        }
    }

    //SELECT * from daily, json_each(currencies) WHERE json_extract(json_each.value,'$.currency') IS 'polychrome';

    async getCurrencyHistoryForRange(date_start: number, date_end: number, region: string) {
        const existingRecord: [...any] = await this.db.select(`SELECT * FROM currencyHistory WHERE date>=${date_start} AND date < ${date_end} AND region='${region}'`);

        existingRecord.forEach(x => { x.currencies = JSON.parse(x.currencies);  x.override = JSON.parse(x.override);});

        if (existingRecord.length > 0)
            return existingRecord;
        else
            return null;
    }

    async getCurrencyHistory(date: number, region: string) {
        const existingRecord: [...any] = await this.db.select(`SELECT * FROM currencyHistory WHERE date=${date} AND region='${region}'`);

        existingRecord.forEach(x => { x.currencies = JSON.parse(x.currencies);  x.override = JSON.parse(x.override);});

        if (existingRecord.length > 0)
            return existingRecord;
        else
            return null;
    }

    async getLastCurrencyHistory(date: number, region: string) {
        const existingRecord: [...any] = await this.db.select(`SELECT * FROM currencyHistory WHERE date<${date} AND region='${region}' AND (json_array_length(currencies)>0 OR json_array_length(override)>0) ORDER BY date DESC LIMIT 1;`);

        existingRecord.forEach(x => { x.currencies = JSON.parse(x.currencies);  x.override = JSON.parse(x.override);});

        if (existingRecord.length > 0)
            return existingRecord;
        else
            return null;
    }

    async insertCurrencyHistory(date: number, region: string, currencies: CurrencyHistory[], override: CurrencyValue[], notes: string) {
        const existingRecord = await this.getCurrencyHistory(date, region);

        if (existingRecord == null)
            await this.db.execute(
                `INSERT into currencyHistory(date, region, currencies, override, notes) VALUES($1, $2, $3, $4, $5)`,
                [date, region, currencies, override, notes],
            )
        else {
            await this.db.execute(
                `UPDATE currencyHistory SET currencies=$1,override=$2, notes=$3 WHERE date=${date} AND region='${region}'`,
                [currencies, override, notes],
            )
        }
    }
}

export type TaskRecord = {
    date: number;
    region: string;
    name: string;
    value: number;
    currencies: CurrencyValue[];
    notes: string;
}

export type HistoryRecord = {
    date: number;
    region: string;
    currencies: CurrencyHistory[];
    override: CurrencyValue[];
    notes: string;
}

export type CurrencyHistory = {
    currency: string;
    amount: number;
    gain: number;
    loss: number;
}

export async function loadDB(gameTitle: string) {
    let dbDir = await appConfigDir() + '/db/';
    if (!await exists(dbDir)) {
        await mkdir(dbDir);
    }

    let dbFile = dbDir + gameTitle + '.db';
    let initializeAfter = false;
    if (!await exists(dbFile)) {
        initializeAfter = true;
    }

    let db = await Database.load('sqlite:' + dbFile);

    if (initializeAfter || true)
        initalizeDB(db);

    return db;
}



async function createTable(db: Database, tableName: string) {
    const res = await db.execute(
        `CREATE TABLE IF NOT EXISTS ${tableName}(date INTEGER, region TEXT, name TEXT, value INTEGER, currencies TEXT, notes TEXT)`
    )
}

async function createHistoryTable(db: Database, tableName: string) {
    const res = await db.execute(
        `CREATE TABLE IF NOT EXISTS ${tableName}(date INTEGER, region TEXT, currencies TEXT, override TEXT, notes TEXT)`
    )
}



async function initalizeDB(db: Database) {
    createTable(db, "daily");
    createTable(db, "weekly");
    createTable(db, "periodic");
    createTable(db, "event");
    createTable(db, "other");

    createHistoryTable(db, "currencyHistory");
}