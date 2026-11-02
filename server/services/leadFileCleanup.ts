import fs from 'fs/promises';
import path from 'path';
import {queryAll,queryOne,runQuery} from '../db/connection';
export async function initializeLeadFileCleanup(){
 await runQuery('CREATE TABLE IF NOT EXISTS crm_lead_file_cleanup (id VARCHAR(64) PRIMARY KEY, stored_path TEXT NOT NULL)');
}
export async function cleanupDeletedLeadFiles(){
 const root=path.resolve(process.cwd(),'storage','client-documents');
 for(const row of await queryAll('SELECT id,stored_path FROM crm_lead_file_cleanup')){
  try{
   if(await queryOne('SELECT id FROM client_documents WHERE stored_path=?',[row.stored_path]))continue;
   // Uploads use a generated basename. Never follow a path or symlink from imported data.
   if(path.basename(row.stored_path)!==row.stored_path)throw new Error('Invalid document filename');
   const file=path.resolve(root,row.stored_path);
   if(path.dirname(file)!==root)throw new Error('Invalid document path');
   let stat;try{stat=await fs.lstat(file);}catch(e:any){if(e.code!=='ENOENT')throw e;}
   if(stat){if(!stat.isFile()||stat.isSymbolicLink())throw new Error('Invalid document file');const realRoot=await fs.realpath(root);if(path.dirname(await fs.realpath(file))!==realRoot)throw new Error('Invalid document location');await fs.unlink(file);}
   await runQuery('DELETE FROM crm_lead_file_cleanup WHERE id=?',[row.id]);
  }catch(error){console.error('Deleted-lead file cleanup will retry:',row.id,(error as Error).message);}
 }
}
