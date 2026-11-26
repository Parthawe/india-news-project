import {sampleScope} from './sample-scope.mjs';
export const retentionPolicy='material-publisher-language-round-robin-v1';
export function validRetention(x,count){
 if(x===undefined)return true; // Earlier published snapshots remain readable.
 const integer=n=>Number.isSafeInteger(n)&&n>=0&&n<=1000000,mix=x?.eligibleSourceMix;
 return Boolean(x?.policy===retentionPolicy&&x.maxArticles===500&&integer(x.eligibleLinks)&&x.retainedLinks===count&&count<=500&&x.eligibleLinks>=count&&x.excludedByLimit===x.eligibleLinks-count&&mix&&integer(mix.links)&&mix.links===x.eligibleLinks&&[mix.official,mix.reporting,mix.unclassified,mix.publisherGroups].every(integer)&&mix.publisherGroups<=mix.links&&mix.official+mix.reporting+mix.unclassified===mix.links&&(mix.largest===null?mix.links===0:mix.largest&&typeof mix.largest.id==='string'&&mix.largest.id.length<=100&&integer(mix.largest.links)&&mix.largest.links<=mix.links&&integer(mix.largest.percent)&&mix.largest.percent<=100));
}
export function validRecovery(x){
 if(x===undefined)return true;
 const integer=n=>Number.isSafeInteger(n)&&n>=0&&n<=62000;
 return Boolean(x&&['complete','partial'].includes(x.status)&&x.attemptedDays===31&&[x.readDays,x.missingDays,x.recoveredRecords,x.expiredRecords,x.rejectedRecords].every(integer)&&Array.isArray(x.failures)&&x.failures.length<=31&&x.readDays+x.missingDays+x.failures.length===31&&x.failures.every(f=>typeof f?.day==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(f.day)&&['archive_size_limit','invalid_archive','archive_unavailable'].includes(f.reason))&&x.status===(x.failures.length||x.rejectedRecords?'partial':'complete'));
}
const newest=(a,b)=>b.publishedAt.localeCompare(a.publishedAt)||a.id.localeCompare(b.id);

// Exhaust smaller streams before filling spare slots from larger ones. Counts
// describe retained metadata, never independent events or political balance.
function rotate(lists,limit){
 const positions=lists.map(()=>0),result=[];
 while(result.length<limit){let added=false;for(let i=0;i<lists.length&&result.length<limit;i++)if(positions[i]<lists[i].length){result.push(lists[i][positions[i]++]);added=true;}if(!added)break;}
 return result;
}
function buckets(records,key){
 const map=new Map();for(const a of records){const value=key(a);if(!map.has(value))map.set(value,[]);map.get(value).push(a);}
 return [...map].sort(([a],[b])=>a.localeCompare(b)).map(([,items])=>items);
}
export function retainNews(records,limit=500){
 if(!Number.isSafeInteger(limit)||limit<1||limit>500)throw Error('Invalid retention limit');
 const sorted=[...records].sort(newest);
 const materialQueues=buckets(sorted,a=>a.kind).map(material=>{
  const publisherQueues=buckets(material,a=>a.publisherGroup).map(publisher=>rotate(buckets(publisher,a=>a.language),limit));
  return rotate(publisherQueues,limit);
 });
 const articles=rotate(materialQueues,limit).sort(newest);
 return{articles,retention:{policy:retentionPolicy,maxArticles:limit,eligibleLinks:sorted.length,retainedLinks:articles.length,excludedByLimit:sorted.length-articles.length,eligibleSourceMix:sampleScope(sorted)}};
}
