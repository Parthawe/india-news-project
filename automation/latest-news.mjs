import{renderNewsroomFeed}from'./newsroom-feed.mjs';
import{renderCoverageGaps}from'./coverage-gaps-render.mjs';
import {coverageObservation} from './coverage-observation.mjs';
import registry from './source-profiles.json' with {type:'json'};
import events from './blindspot-events.json' with {type:'json'};
import {buildBlindspotCorpus} from './blindspot-corpus.mjs';
import {evaluateBlindspots} from './blindspot-core.mjs';
import {renderBlindspots} from './blindspot-render.mjs';
import{regionalReleaseLinks}from'./pib-regional.mjs';
import{feedPublicationDate}from'./feed-dates.mjs';
import{recoverIntake}from'./recover-intake.mjs';
import Parser from'rss-parser';import{load}from'cheerio';import{readFile,writeFile,mkdir}from'node:fs/promises';import{join,resolve}from'node:path';
import sources from'./reporting-sources.json' with{type:'json'};
import{allowedURL,recordFrom,validRecord,buildLatest,renderLatest}from'./latest-core.mjs';
import{buildIntake,indiaDay}from'./intake-core.mjs';
import{publisherDate}from'./daily-core.ts';
const root=resolve(process.argv[2]||'.'),folder=join(root,'news'),now=new Date(),base=process.env.PAGES_BASE_PATH??'/india-news-project';await mkdir(folder,{recursive:true});
const readJSON=async path=>{try{return JSON.parse(await readFile(path,'utf8'))}catch{return null}};
const previous=await readJSON(join(folder,'latest-reporting.json'));
const restored=await recoverIntake(join(folder,'intake'),sources,now);
const parser=new Parser(),incoming=[],feeds=[];
async function resource(url,source,conditional={}){
 let current=allowedURL(url,source);
 for(let hop=0;hop<4;hop++){
  const headers={'User-Agent':'IndiaNewsProject/1.0 (attributed headline link index)','Accept':'application/rss+xml,application/atom+xml,application/xml,text/html'};
  if(conditional.etag)headers['If-None-Match']=conditional.etag;if(conditional.lastModified)headers['If-Modified-Since']=conditional.lastModified;
  const r=await fetch(current,{redirect:'manual',signal:AbortSignal.timeout(12000),headers});
  if(r.status===304)return{notModified:true,etag:conditional.etag,lastModified:conditional.lastModified};
  if([301,302,303,307,308].includes(r.status)){current=allowedURL(new URL(r.headers.get('location'),current).href,source);continue;}
  if(!r.ok)throw Error('Source HTTP '+r.status);
  const reader=r.body.getReader(),decoder=new TextDecoder();let text='',size=0;
  while(true){const{done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>2500000){await reader.cancel();throw Error('Source response exceeds limit')}text+=decoder.decode(value,{stream:true});}
  return{text:text+decoder.decode(),etag:r.headers.get('etag')?.slice(0,500),lastModified:r.headers.get('last-modified')?.slice(0,200)};
 }throw Error('Too many source redirects');
}
async function collectSource(source){
 const cached=previous?.feeds?.find(f=>f.id===source.id),known=(previous?.articles||[]).filter(a=>a.sourceId===source.id&&validRecord(a,sources,now));
 const status={id:source.id,publisher:source.publisher,language:source.language,permissionUrl:source.permissionUrl,checkedAt:now.toISOString(),accepted:0,excluded:0,lastSuccessAt:cached?.lastSuccessAt||null};
 try{
  const response=await resource(source.url,source,cached?.excluded||!known.length?{}:(cached||{}));
  if(response.notModified){incoming.push(...known);feeds.push({...status,status:'not_modified',lastSuccessAt:now.toISOString(),etag:response.etag,lastModified:response.lastModified,newestPublishedAt:known[0]?.publishedAt||cached?.newestPublishedAt||null});return;}
  if(source.format!=='pib_html'&&/<!DOCTYPE|<!ENTITY/i.test(response.text))throw Error('Unsupported XML declaration');
  const feed=source.format==='pib_html'?{items:regionalReleaseLinks(response.text,source)}:await parser.parseString(response.text);let newest=null,oldest=null,metadataReads=0;const exclusions={};
  for(const raw of feed.items.slice(0,60)){
   try{
    const title=load('<span>'+String(raw.title||'')+'</span>').text().replace(/\s+/g,' ').trim();
    const url=allowedURL(raw.link,source),old=known.find(a=>a.url===url),item={...raw,title};
    if(source.id==='peoples-democracy-en'&&item.creator==='uploader')item.creator='People’s Democracy (feed institutional byline; individual author not supplied)';
    const suppliedDate=feedPublicationDate(item.isoDate||item.pubDate||'',source.language);if(suppliedDate)item.isoDate=suppliedDate;
    if(!Number.isFinite(Date.parse(item.isoDate||item.pubDate||''))){
     if(old&&old.title===title)item.isoDate=old.publishedAt;
     else if(metadataReads<(source.format==='pib_html'?20:10)){
      metadataReads++;
      const page=await resource(url,source),$=load(page.text);
      const date=$('meta[property="article:published_time"]').attr('content')||$('meta[name="date"]').attr('content')||$('time[datetime]').first().attr('datetime');
      const pibDate=source.kind==='official'?publisherDate($('.ReleaseDateSubHeaddateTime').text()):null;
      item.isoDate=date||(pibDate?pibDate+'T00:00:00Z':undefined);
      if(pibDate)item.datePrecision='day';
     }
    }
    const candidateDate=Date.parse(item.isoDate||item.pubDate||'');if(Number.isFinite(candidateDate)&&(!newest||candidateDate>Date.parse(newest)))newest=new Date(candidateDate).toISOString();
    const article=recordFrom(item,source,now,old);if(item.datePrecision==='day')article.datePrecision='day';else article.datePrecision='timestamp';
    incoming.push(article);status.accepted++;if(!oldest||Date.parse(article.publishedAt)<Date.parse(oldest))oldest=article.publishedAt;
   }catch(error){status.excluded++;const reason=error.message==='Unapproved source URL'?'source_url_rejected':'publication_metadata_unavailable_or_outside_window';exclusions[reason]=(exclusions[reason]||0)+1;}
  }
  feeds.push({...status,status:'ok',lastSuccessAt:now.toISOString(),etag:response.etag,lastModified:response.lastModified,newestPublishedAt:newest,oldestPublishedAt:oldest,exclusions});
 }catch(error){feeds.push({...status,status:'failed',error:error.message.slice(0,160),etag:cached?.etag,lastModified:cached?.lastModified,newestPublishedAt:cached?.newestPublishedAt||null});}
}
const enabled=sources.filter(s=>s.enabled);for(let i=0;i<enabled.length;i+=3)await Promise.all(enabled.slice(i,i+3).map(collectSource));
for(const f of feeds)Object.assign(f,coverageObservation(previous?.feeds?.find(p=>p.id===f.id),f,now));
feeds.sort((a,b)=>enabled.findIndex(s=>s.id===a.id)-enabled.findIndex(s=>s.id===b.id));
const index=buildLatest(previous,[...restored.articles,...incoming],feeds,sources,now);index.archiveRecovery=restored.recovery;const json=JSON.stringify(index,null,2)+'\n';
await writeFile(join(folder,'latest-reporting.json'),json);
const corpus=buildBlindspotCorpus(index,restored,incoming,sources,now);
await writeFile(join(folder,'coverage-corpus.json'),JSON.stringify(corpus,null,2)+'\n');
const blindspots=evaluateBlindspots(corpus,registry,events,sources,now);
await writeFile(join(folder,'blindspots.json'),JSON.stringify(blindspots,null,2)+'\n');
const intakeFolder=join(folder,'intake');await mkdir(intakeFolder,{recursive:true});
const intakeRecords=[...index.articles,...incoming];
const days=new Set([indiaDay(now),...intakeRecords.map(a=>a.datePrecision==='day'?a.publishedAt.slice(0,10):indiaDay(a.publishedAt))]);
for(const day of [...days].sort()){
 const path=join(intakeFolder,day+'.json'),archive=buildIntake(await readJSON(path),intakeRecords,sources,day,now);
 await writeFile(path,JSON.stringify(archive,null,2)+'\n');
 if(day===indiaDay(now))await writeFile(join(folder,'intake-latest.json'),JSON.stringify(archive,null,2)+'\n');
}

for(const lang of['en','hi']){
 const blindspotFragment=renderBlindspots(blindspots,lang,base);
 for(const route of['blindspots','coverage-gaps']){
 const blindspotPage=join(root,lang,route+'/index.html');
 try{let html=await readFile(blindspotPage,'utf8');if(!/<!--BLINDSPOTS:START-->[\s\S]*?<!--BLINDSPOTS:END-->/.test(html))throw Error('Blindspots insertion point missing');html=html.replace(/<!--BLINDSPOTS:START-->[\s\S]*?<!--BLINDSPOTS:END-->/,()=>`<!--BLINDSPOTS:START-->${blindspotFragment}<!--BLINDSPOTS:END-->`);await writeFile(blindspotPage,html);}catch(e){if(e.code!=='ENOENT')throw e;}
 }
 const homePage=join(root,lang,'index.html');try{let html=await readFile(homePage,'utf8');if(html.includes('<!--NEWSROOM-FEED:START-->'))html=html.replace(/<!--NEWSROOM-FEED:START-->[\s\S]*?<!--NEWSROOM-FEED:END-->/,()=>`<!--NEWSROOM-FEED:START-->${renderNewsroomFeed(index,lang,base)}<!--NEWSROOM-FEED:END-->`);if(html.includes('<!--COVERAGE-GAPS:START-->')){html=html.replace(/<!--COVERAGE-GAPS:START-->[\s\S]*?<!--COVERAGE-GAPS:END-->/,()=>`<!--COVERAGE-GAPS:START-->${renderCoverageGaps(blindspots,lang,base)}<!--COVERAGE-GAPS:END-->`);await writeFile(homePage,html);}}catch(e){if(e.code!=='ENOENT')throw e;}
 const fragment=renderLatest(index,lang,base);
 await writeFile(join(folder,`latest-reporting-${lang}.html`),fragment);
 const page=join(root,lang,'latest/index.html');try{let html=await readFile(page,'utf8');if(!/<!--LATEST:START-->[\s\S]*?<!--LATEST:END-->/.test(html))throw Error('Latest page insertion point missing');html=html.replace(/<!--LATEST:START-->[\s\S]*?<!--LATEST:END-->/,()=>`<!--LATEST:START-->${fragment}<!--LATEST:END-->`);await writeFile(page,html);}catch(e){if(e.code!=='ENOENT')throw e;}
}
console.log(JSON.stringify({status:index.status,records:index.articles.length,publishers:index.counts.publishers,languages:index.counts.languages,feeds:feeds.map(f=>({id:f.id,status:f.status,accepted:f.accepted,excluded:f.excluded}))}));
if(index.status!=='ok')console.log('::warning::Some reporting feeds failed. Dated records retained and source failures disclosed.');
if(restored.recovery.status==='partial')console.log('::warning::Some archives or records could not be recovered; details are recorded in the index.');
