import {validRecord} from './latest-core.mjs';
export function buildBlindspotCorpus(index,recovered,incoming,sources,now=new Date()){
 const start=now.getTime()-7*86400000,map=new Map();
 for(const a of [...recovered.articles,...index.articles,...incoming])if(validRecord(a,sources,now)&&Date.parse(a.publishedAt)>=start){const key=a.sourceId+'|'+a.url,previous=map.get(key);if(!previous||Date.parse(a.lastSeenAt)>Date.parse(previous.lastSeenAt))map.set(key,a);}
 return{version:1,checkedAt:index.checkedAt,corpusScope:'archived_captured_metadata',archiveRecovery:recovered.recovery,feeds:index.feeds,articles:[...map.values()].sort((a,b)=>b.publishedAt.localeCompare(a.publishedAt)),limitations:'Publication window, not a claim of continuous monitoring or complete newsroom coverage. Feed horizons and publisher cadence differ. All stored captured metadata is used; the 500-link display cap is not applied.'};
}
