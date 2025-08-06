import { appConfigDir } from '@tauri-apps/api/path';
import { exists, mkdir } from '@tauri-apps/plugin-fs';
import Database from '@tauri-apps/plugin-sql';
import { CurrencyValue } from './data.utils';


export class TrackerDatabase {
    db:Database;

    constructor(db:Database) {
        this.db = db;
    }

    getAllDailyRecord = async ( date: number, region: string) => await this.getAllTaskRecordForDay( 'daily', date, region);
    getAllWeeklyRecord = async ( date: number, region: string) => await this.getAllTaskRecordForDay( 'weekly', date, region);
    getAllPeriodicRecord = async ( date: number, region: string) => await this.getAllTaskRecordForDay( 'periodic', date, region);
    getAllOtherRecord = async ( date: number, region: string) => await this.getAllTaskRecordForDay('other', date, region);


     async  getAllTaskRecordForRange(taskType: string, date_start: number, date_end:number, region: string){
    const existingRecord: [...any] = await this.db.select(`SELECT * FROM ${taskType} WHERE date>=${date_start} AND date < ${date_end} AND region='${region}'`);

    if (existingRecord.length > 0)
        return existingRecord;
    else
        return null;
}


 async  getTaskRecordForRange( taskType: string, date_start: number, date_end:number, region: string, taskId: string){
    const existingRecord: [...any] = await this.db.select(`SELECT * FROM ${taskType} WHERE date>=${date_start} AND date < ${date_end} AND region='${region}'  AND name='${taskId}'`);

    if (existingRecord.length > 0)
        return existingRecord;
    else
        return null;
}


 async  getAllTaskRecordForDay( taskType: string, date: number, region: string){
    const existingRecord: [...any] = await this.db.select(`SELECT * FROM ${taskType} WHERE date=${date} AND region='${region}'`);

    if (existingRecord.length > 0)
        return existingRecord;
    else
        return null;
}

 async  getTaskRecord( taskType: string, date: number, region: string, taskId: string){
    const existingRecord: [...any] = await this.db.select(`SELECT * FROM ${taskType} WHERE date=${date} AND region='${region}' AND name='${taskId}'`);

    if (existingRecord.length > 0)
        return existingRecord[0];
    else
        return null;
}

 async  insertTaskRecord( taskType: string, date: number, region: string, taskId: string, value: number | boolean, currencies: {}, notes: string) {
    const existingRecord = await this.getTaskRecord(taskType, date, region, taskId);

    if (existingRecord == null)
        await this.db.execute(
            `INSERT into ${taskType}(date, region, name, value, currencies, notes) VALUES($1, $2, $3, $4, $5, $6)`,
            [date, region, taskId, value, currencies, notes],
        )
    else 
        await this.db.execute(
            `UPDATE ${taskType} SET value=$1, currencies=$2, notes=$3 WHERE date=${date} AND region='${region}' AND name='${taskId}'`,
            [value, currencies, notes],
        )
}

  async  insertCurrencyHistory( region:string, currencies: {}, notes:string) {

}
}

export type TaskRecord = {
    date:number;
    region:string;
    name:string;
    value:number;
    currencies:CurrencyValue[];
    notes:string;
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
        `CREATE TABLE IF NOT EXISTS ${tableName}(date INTEGER, region TEXT, currencies TEXT, notes TEXT)`
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