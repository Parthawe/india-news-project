import {readFile,stat} from 'node:fs/promises';
import {join} from 'node:path';
import {validRecord,recordFrom} from './latest-core.mjs';
const indiaDay=value=>new Date(value).toLocaleDateString('en-CA',{timeZone:'Asia/Kolkata'});
export function recoveryDays(now=new Date()){
 // A rolling 30-day interval can intersect 31 India calendar dates.
 return Array.from({length:31},(_,n)=>indiaDay(new Date(now.getTime()-n*86400000)));
}
export async function recoverIntake(folder,sources,now=new Date()){
 const articles=[],failures=[];let readDays=0,missingDays=0,expiredRecords=0,rejectedRecords=0;
 for(const day of recoveryDays(now)){
  try{
   const path=join(folder,day+'.json'),info=await stat(path);
   if(info.size>2500000)throw Error('archive_size_limit');
   const text=await readFile(path,'utf8');if(Buffer.byteLength(text)>2500000)throw Error('archive_size_limit');
   const x=JSON.parse(text);
   if(x?.version!==1||x.date!==day||!Array.isArray(x.articles)||x.articles.length>2000)throw Error('invalid_archive');
   for(const a of x.articles){if(a&&Number.isFinite(Date.parse(a.publishedAt))&&Date.parse(a.publishedAt)<now.getTime()-30*86400000){expiredRecords++;continue;}if(!validRecord(a,sources,now)||Date.parse(a.firstSeenAt)>Date.parse(a.lastSeenAt)||Date.parse(a.lastSeenAt)>now.getTime()+300000||(a.datePrecision==='day'?a.publishedAt.slice(0,10):indiaDay(a.publishedAt))!==day){rejectedRecords++;continue;}const source=sources.find(s=>s.id===a.sourceId),clean=recordFrom({link:a.url,title:a.title,creator:a.author,isoDate:a.publishedAt,datePrecision:a.datePrecision},source,now,a);clean.lastSeenAt=a.lastSeenAt;articles.push(clean);}
   readDays++;
  }catch(error){if(error.code==='ENOENT')missingDays++;else failures.push({day,reason:['archive_size_limit','invalid_archive'].includes(error.message)?error.message:'archive_unavailable'});}
 }
 return{articles,recovery:{status:failures.length||rejectedRecords?'partial':'complete',attemptedDays:31,readDays,missingDays,recoveredRecords:articles.length,expiredRecords,rejectedRecords,failures}};
}
