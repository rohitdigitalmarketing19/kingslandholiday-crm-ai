import React,{useRef,useState} from 'react';
import {Upload,CheckCircle2,X} from 'lucide-react';
import {compressImageFile} from '../utils/imageCompressor';
import {photoTitleFromFilename} from '../utils/photoLibrary';
import {createDestinationPhoto,DestinationPhotoItem} from '../services/apiService';
type Item={id:string;file:File;status:'queued'|'uploading'|'saved'|'failed';error?:string};
export default function BulkPhotoUpload({onSaved}:{onSaved:(photo:DestinationPhotoItem)=>void}){
 const [items,setItems]=useState<Item[]>([]),[busy,setBusy]=useState(false);const lock=useRef(false);
 const pending=items.filter(i=>i.status==='queued'||i.status==='failed'),saved=items.filter(i=>i.status==='saved').length;
 const update=(id:string,patch:Partial<Item>)=>setItems(previous=>previous.map(i=>i.id===id?{...i,...patch}:i));
 const upload=async()=>{
  if(lock.current || !pending.length)return;lock.current=true;setBusy(true);
  try{for(const item of pending){update(item.id,{status:'uploading',error:''});try{
    if(!['image/jpeg','image/png','image/webp','image/gif','image/svg+xml'].includes(item.file.type))throw new Error('Use a JPG, PNG, WebP, GIF or SVG image.');
    if(item.file.size>20*1024*1024)throw new Error('This image exceeds 20 MB. Resize it and try again.');
    const image=await compressImageFile(item.file,{maxWidth:1280,maxHeight:960,quality:0.85});
    const title=photoTitleFromFilename(item.file.name);
    const photo=await createDestinationPhoto({title,city:'',image_url:image,tags:title,file_name:item.file.name,upload_id:item.id});
    update(item.id,{status:'saved'});onSaved(photo);
  }catch(error){update(item.id,{status:'failed',error:(error as Error).message || 'Upload failed. Retry this image.'});}}}finally{lock.current=false;setBusy(false);}
 };
 return <section className="p-5 rounded-xl border border-line bg-surface space-y-4" aria-label="Bulk photo upload"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-semibold text-content">Upload multiple images</h3><p className="text-sm text-secondary mt-1">Select several files. Each image keeps its filename for search and is compressed before saving.</p></div><label className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-brand-line bg-brand-soft text-brand-ink text-sm font-medium ${busy?'opacity-50':'cursor-pointer'}`}><Upload size={16}/>Choose images<input aria-label="Choose images for bulk upload" type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml" multiple disabled={busy} className="sr-only" onChange={e=>{const files=Array.from(e.target.files || []);setItems(previous=>[...previous,...files.map(file=>({id:crypto.randomUUID(),file,status:'queued' as const}))]);e.target.value='';}}/></label></div>{items.length>0 && <><p role="status" aria-live="polite" className="text-sm text-secondary">{saved} of {items.length} images saved{busy?' · Uploading…':''}</p><progress aria-label="Photo upload progress" value={saved} max={items.length} className="w-full h-2"/><ul className="max-h-64 overflow-y-auto divide-y divide-line border border-line rounded-lg">{items.map(item=><li key={item.id} className="p-3 flex gap-3 justify-between items-start"><div className="min-w-0"><p className="text-sm text-content break-all">{item.file.name}</p>{item.error && <p className="text-xs text-danger-ink mt-1">{item.error}</p>}</div><div className="flex items-center gap-2 shrink-0 text-xs text-secondary">{item.status==='saved'?<><CheckCircle2 size={14} className="text-success-ink"/>Saved</>:item.status==='uploading'?'Uploading…':item.status==='failed'?'Failed':'Ready'}{!busy && item.status!=='saved' && <button aria-label={`Remove ${item.file.name} from upload queue`} onClick={()=>setItems(previous=>previous.filter(i=>i.id!==item.id))}><X size={15}/></button>}</div></li>)}</ul><div className="flex flex-wrap gap-3"><button disabled={busy||!pending.length} onClick={upload} className="px-4 py-2.5 bg-brand text-white rounded-lg text-sm font-medium disabled:opacity-50">{busy?'Uploading images…':`Upload ${pending.length} image${pending.length===1?'':'s'}`}</button><button disabled={busy} onClick={()=>setItems([])} className="px-4 py-2.5 border border-line rounded-lg text-sm text-secondary disabled:opacity-50">Clear queue</button></div></>}</section>;
}
