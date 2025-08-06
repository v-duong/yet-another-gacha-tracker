use std::{path::Path, str::FromStr, sync::Arc, time::Duration};

use sqlx::{
    sqlite::{SqliteAutoVacuum, SqliteConnectOptions, SqliteJournalMode, SqlitePoolOptions}, ConnectOptions as _, FromRow, Pool, QueryBuilder, Sqlite
};
use tauri::{path::PathResolver, AppHandle};


pub struct Database {
    pool: Pool<Sqlite>,
}

impl Database {
    pub async fn new(db_file: &str) -> Result<(), sqlx::Error> {
        let mut conn = SqliteConnectOptions::from_str(db_file)?
            .create_if_missing(true)
            .connect()
            .await?;

        Ok(())
    }
}