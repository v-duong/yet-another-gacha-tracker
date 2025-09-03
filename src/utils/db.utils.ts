import { appConfigDir } from '@tauri-apps/api/path';
import { exists, mkdir } from '@tauri-apps/plugin-fs';
import Database from '@tauri-apps/plugin-sql';
import { CurrencyValue, isEmptyCurrencyArray } from './gameData';
import { DayData } from './sessionData';
import { taskTypeToProgressName } from './helpers.utils';


// select * from weekly w where date = (select max(date) from weekly w_inner where w_inner.name = w.name);

export class TrackerDatabase {
    db: Database;

    constructor(db: Database) {
        this.db = db;
    }

    getAllDailyRecord = async (date: number, region: string) => await this.getAllTaskRecordForDay('daily', date, region);
    getAllWeeklyRecord = async (date: number, region: string) => await this.getAllTaskRecordForDay('weekly', date, region);
    getAllPeriodicRecord = async (date: number, region: string) => await this.getAllTaskRecordForDay('periodic', date, region);
    getAllEventRecord = async (date: number, region: string) => await this.getAllTaskRecordForDay('event', date, region);
    getAllOtherRecord = async (date: number, region: string) => await this.getAllTaskRecordForDay('other', date, region);

    getAllDailyRecordForRange = async (date_start: number, date_end: number, region: string) => this.getAllTaskRecordForRange('daily', date_start, date_end, region);
    getAllWeeklyRecordForRange = async (date_start: number, date_end: number, region: string) => this.getAllTaskRecordForRange('weekly', date_start, date_end, region);
    getAllPeriodicRecordForRange = async (date_start: number, date_end: number, region: string) => this.getAllTaskRecordForRange('periodic', date_start, date_end, region);
    getAllEventRecordForRange = async (date_start: number, date_end: number, region: string) => this.getAllTaskRecordForRange('event', date_start, date_end, region);
    getAllOtherRecordForRange = async (date_start: number, date_end: number, region: string) => this.getAllTaskRecordForRange('other', date_start, date_end, region);

    getAllTaskRecordForRange = async (taskType: string, date_start: number, date_end: number, region: string) => this.getTaskRecordForRange(taskType, date_start, date_end, region);


    async getTaskRecordForRange(taskType: string, date_start: number, date_end: number, region: string, taskId: string = '') {
        let taskFilter = '';

        if (taskId != '')
            taskFilter = `AND name='${taskId}'`;

        const existingRecord: [...any] = await this.db.select(`SELECT * FROM ${taskType} WHERE date>=${date_start} AND date <= ${date_end} AND region='${region}' ${taskFilter}`);

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

    async insertTaskRecord(taskType: string, date: number, region: string, taskId: string, value: number | boolean, currencies: CurrencyValue[], notes: string) {
        taskId = escape_single_quote(taskId);
        console.log (taskId);

        const existingRecord = await this.getTaskRecord(taskType, date, region, taskId);

        if (existingRecord == null) {
            if (value == 0 && notes == '' && isEmptyCurrencyArray(currencies)) return;

            let res = await this.db.execute(
                `INSERT into ${taskType}(date, region, name, value, currencies, notes) VALUES($1, $2, $3, $4, $5, $6)`,
                [date, region, taskId, value, currencies, notes],
            )
        }
        else {
            if (existingRecord.value == value && existingRecord.notes == notes) {
                return;
            }

            if (value == 0 && notes == '' && isEmptyCurrencyArray(currencies)) {
                await this.db.execute(
                    `DELETE FROM ${taskType} WHERE date=${date} AND region='${region}' AND name='${taskId}'`
                )
            } else {

                await this.db.execute(
                    `UPDATE ${taskType} SET value=$1, currencies=$2, notes=$3 WHERE date=${date} AND region='${region}' AND name='${taskId}'`,
                    [value, currencies, notes],
                )
            }
        }
    }


    async updateTaskRecordsForRange(dates: number[], targets: { [key: number]: DayData }, region: string, taskType: string, taskId: string) {
        let skipUpdate: number[] = [];

        let escapedTaskId = escape_single_quote(taskId);

        dates.forEach(d => {
            const target = targets[d];
            const memberName = taskTypeToProgressName(taskType);

            if (target[memberName][taskId].value == 0) {
                if (isEmptyCurrencyArray(target[memberName][taskId].currencies)) {
                    skipUpdate.push(d);
                    return;
                }
            }

            this.db.execute(
                `UPDATE ${taskType} SET  value=$1, currencies=$2 WHERE date=${d} AND region='${region}' AND name='${escapedTaskId}'`,
                [target[memberName][taskId].value, target[memberName][taskId].currencies],
            )
        })

        skipUpdate.forEach(d => {
            this.db.execute(
                `DELETE FROM ${taskType} WHERE date=${d} AND region='${region}' AND name='${escapedTaskId}'`
            )
        })
    }

    //SELECT * from daily, json_each(currencies) WHERE json_extract(json_each.value,'$.currency') IS 'polychrome';

    async getCurrencyHistoryForRange(date_start: number, date_end: number, region: string) {
        const existingRecord: [...any] = await this.db.select(`SELECT * FROM currencyHistory WHERE date>=${date_start} AND date <= ${date_end} AND region='${region}'`);

        existingRecord.forEach(x => { x.currencies = JSON.parse(x.currencies); x.override = JSON.parse(x.override); });

        if (existingRecord.length > 0)
            return existingRecord;
        else
            return null;
    }

    async getCurrencyHistory(date: number, region: string) {
        const existingRecord: [...any] = await this.db.select(`SELECT * FROM currencyHistory WHERE date=${date} AND region='${region}'`);

        existingRecord.forEach(x => { x.currencies = JSON.parse(x.currencies); x.override = JSON.parse(x.override); });

        if (existingRecord.length > 0)
            return existingRecord;
        else
            return null;
    }

    async getLastCurrencyHistory(date: number, region: string) {
        const existingRecord: [...any] = await this.db.select(`SELECT * FROM currencyHistory WHERE date<${date} AND region='${region}' AND (json_array_length(currencies)>0 OR json_array_length(override)>0) ORDER BY date DESC LIMIT 1;`);

        existingRecord.forEach(x => { x.currencies = JSON.parse(x.currencies); x.override = JSON.parse(x.override); });

        if (existingRecord.length > 0)
            return existingRecord;
        else
            return null;
    }

    async insertCurrencyHistory(date: number, region: string, currencies: CurrencyHistory[], override: CurrencyValue[], notes: string) {
        const existingRecord = await this.getCurrencyHistory(date, region);

        notes = escape_single_quote(notes);

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

    async updateCurrencyHistoryForRange(dates: number[], targets: { [key: number]: DayData }, region: string) {
        dates.forEach(d => {
            const target = targets[d];
            this.db.execute(
                `UPDATE currencyHistory SET currencies=$1 WHERE date=${d} AND region='${region}'`,
                [target.totals.calculated],
            )
        })
    }

    async getAllRankedStageRecordForRange(date_start: number, date_end: number, region: string, parent_task: string) {
        const existingRecord: [...any] = await this.db.select(`SELECT * FROM ranked_stages WHERE  date>=${date_start} AND date<=${date_end} AND region='${region}' AND parent_task='${parent_task}'`);

        if (existingRecord.length > 0)
            return existingRecord;
        else
            return null;
    }

    async getAllRankedStageRecord(date: number, region: string, parent_task: string) {
        const existingRecord: [...any] = await this.db.select(`SELECT * FROM ranked_stages WHERE  date=${date} AND region='${region}' AND parent_task='${parent_task}'`);

        if (existingRecord.length > 0)
            return existingRecord;
        else
            return null;
    }

    async getRankedStageRecordForRange(date_start: number, date_end: number, region: string, parent_task: string, stage_name: string) {
        const existingRecord: [...any] = await this.db.select(`SELECT * FROM ranked_stages WHERE  date>=${date_start} AND date <= ${date_end} AND region='${region}' AND parent_task='${parent_task}' AND stage_name='${stage_name}'`);

        if (existingRecord.length > 0)
            return existingRecord;
        else
            return null;
    }

    async getRankedStageRecord(date: number, region: string, parent_task: string, stage_name: string) {
        const existingRecord: [...any] = await this.db.select(`SELECT * FROM ranked_stages WHERE date=${date} AND region='${region}' AND parent_task='${parent_task}' AND stage_name='${stage_name}'`);

        if (existingRecord.length > 0)
            return existingRecord;
        else
            return null;
    }

    async insertRankedStageRecord(date: number, region: string, parent_task: string, stage_name: string, value: number, score: number = 0, notes: string = "") {
        const existingRecord = await this.getRankedStageRecord(date, region, parent_task, stage_name);

        if (existingRecord == null) {
            if (value == 0 && score == 0)
                return;

            await this.db.execute(
                `INSERT into ranked_stages(date, region, parent_task, stage_name, value, score, notes) VALUES($1, $2, $3, $4, $5, $6, $7)`,
                [date, region, parent_task, stage_name, value, score, notes],
            )
        }
        else {
            if (value == 0 && score == 0) {
                await this.db.execute(
                    `DELETE FROM ranked_stages WHERE date=${date} AND region='${region}' AND parent_task='${parent_task}' AND stage_name='${stage_name}'`,
                    [value, score, notes],
                )
            } else {
                await this.db.execute(
                    `UPDATE ranked_stages SET value=$1, score=$2, notes=$3 WHERE date=${date} AND region='${region}' AND parent_task='${parent_task}' AND stage_name='${stage_name}'`,
                    [value, score, notes],
                )
            }
        }
    }

    async getAllPremiumRecordForRange(date_start: number, date_end: number, region: string) {
        const existingRecord: [...any] = await this.db.select(`SELECT * FROM premium WHERE date>=${date_start} AND date <= ${date_end} AND region='${region}'`);

        existingRecord.forEach(x => { x.currencies = JSON.parse(x.currencies); });

        if (existingRecord.length > 0)
            return existingRecord;
        else
            return null;
    }

    async getAllPremiumRecord(date: number, region: string) {
        const existingRecord: [...any] = await this.db.select(`SELECT * FROM premium WHERE date=${date} AND region='${region}'`);

        existingRecord.forEach(x => { x.currencies = JSON.parse(x.currencies); });

        if (existingRecord.length > 0)
            return existingRecord;
        else
            return null;
    }

    async getPremiumRecord(date: number, region: string, id: number, name: string, category: string) {
        const existingRecord: [...any] = await this.db.select(`SELECT * FROM premium WHERE date=${date} AND region='${region}' AND id='${id}' AND name='${name}' AND category='${category}'`);

        existingRecord.forEach(x => { x.currencies = JSON.parse(x.currencies); });

        if (existingRecord.length > 0)
            return existingRecord;
        else
            return null;
    }

    async insertPremiumRecord(date: number, region: string, id: number, name: string, category: string, spending: number, currencies: CurrencyValue[], notes: string = "") {
        const existingRecord = await this.getPremiumRecord(date, region, id, name, category);

        name = escape_single_quote(name);
        notes = escape_single_quote(notes);

        if (existingRecord == null)
            await this.db.execute(
                `INSERT into premium(date, region, id, name, category, spending, currencies, notes) VALUES($1, $2, $3, $4, $5, $6, $7, $8)`,
                [date, region, id, name, category, spending, currencies, notes],
            )
        else {
            await this.db.execute(
                `UPDATE premium SET name=$1, spending=$2, currencies=$3, notes=$4 WHERE date=${date} AND region='${region}' AND id='${id}' AND category='${category}'`,
                [name, spending, currencies, notes],
            )
        }
    }

    async deletePremiumRecord(date: number, region: string, id: number, name: string, category: string) {
        const res: [...any] = await this.db.select(`DELETE FROM premium WHERE date=${date} AND region='${region}' AND id='${id}' AND name='${name}' AND category='${category}'`);
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

export type RankedTaskRecord = {
    date: number;
    region: string;
    parent_task: string;
    stage_name: string;
    value: number;
    score: number;
    notes: string;
}

export type HistoryRecord = {
    date: number;
    region: string;
    currencies: CurrencyHistory[];
    override: CurrencyValue[];
    notes: string;
}

export interface CurrencyHistory extends CurrencyValue {
    gain: number;
    loss: number;
}

export type PremiumRecord = {
    date: number;
    region: string;
    id: number;
    name: string;
    category: string;
    spending: number;
    currencies: CurrencyValue[];
    notes: string;
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

async function createRankedStageTaskTable(db: Database, tableName: string) {
    const res = await db.execute(
        `CREATE TABLE IF NOT EXISTS ${tableName}(date INTEGER, region TEXT, parent_task TEXT, stage_name TEXT, value NUMBER, score NUMBER, notes TEXT)`
    )
}

async function createPremiumTable(db: Database, tableName: string) {
    const res = await db.execute(
        `CREATE TABLE IF NOT EXISTS ${tableName}(date INTEGER, region TEXT, id number, name TEXT, category TEXT, spending REAL, currencies TEXT, notes TEXT)`
    )
}


async function createHistoryTable(db: Database, tableName: string) {
    const res = await db.execute(
        `CREATE TABLE IF NOT EXISTS ${tableName}(date INTEGER, region TEXT, currencies TEXT, override TEXT, notes TEXT)`
    )
}

async function createUserDataTable(db: Database, tableName: string) {
    const res = await db.execute(
        `CREATE TABLE IF NOT EXISTS ${tableName}(key TEXT, value TEXT)`
    )
}


async function initalizeDB(db: Database) {
    createTable(db, "daily");
    createTable(db, "weekly");
    createTable(db, "periodic");
    createTable(db, "event");
    createTable(db, "other");

    createRankedStageTaskTable(db, "ranked_stages");

    createPremiumTable(db, "premium");

    createHistoryTable(db, "currencyHistory");

    createUserDataTable(db, "userData");
}

function escape_single_quote (str:string) {
    if (typeof str != 'string')
        return str;

    return str.replace(/'/g, function (char) {
        switch (char) {
            case "'":
                return "'"+char;
                            
            default:
                return char;
        }
    });
}

function unescape_single_quote (str:string) {
    if (typeof str != 'string')
        return str;

    return str.replace(/''/g, function (s) {
        switch (s) {
            case "''":
                return "'";
                            
            default:
                return s;
        }
    });
}