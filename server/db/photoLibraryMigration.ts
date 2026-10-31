import {execSql,queryAll} from './connection';
export function migratePhotoLibrary(){
 const columns=queryAll('PRAGMA table_info(destination_photos)');
 if(!columns.some(column=>column.name==='file_name'))execSql("ALTER TABLE destination_photos ADD COLUMN file_name TEXT NOT NULL DEFAULT ''");
}
