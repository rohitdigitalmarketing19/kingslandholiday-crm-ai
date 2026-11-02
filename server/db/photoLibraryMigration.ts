import { execSql, queryAll } from './connection';
export async function migratePhotoLibrary() {
    const columns = await queryAll('PRAGMA table_info(destination_photos)');
    if (!columns.some(column => column.name === 'file_name'))
        await execSql("ALTER TABLE destination_photos ADD COLUMN file_name TEXT NOT NULL DEFAULT ''");
}
