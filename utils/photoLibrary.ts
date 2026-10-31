export const photoTitleFromFilename=(name:string)=>name.replace(/\.[^/.]+$/,'').replace(/[-_]+/g,' ').trim() || name;
export function photoMatchesSearch(photo:{title?:string;city?:string;tags?:string;file_name?:string},search:string){
 const normalize=(value:string)=>value.toLocaleLowerCase().replace(/[-_]+/g,' ').trim();
 const text=normalize([photo.title,photo.city,photo.tags,photo.file_name].filter(Boolean).join(' '));
 return normalize(search).split(/\s+/).filter(Boolean).every(word=>text.includes(word));
}
