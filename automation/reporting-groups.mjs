import {createHash} from 'node:crypto';
import {relatedHeadlines} from './story-index.mjs';

export const groupingMethod='headline-overlap-v2';
const hash=value=>createHash('sha256').update(value).digest('hex');
const indiaDay=value=>new Date(value).toLocaleDateString('en-CA',{timeZone:'Asia/Kolkata'});
const publicationDay=a=>a.datePrecision==='day'?a.publishedAt.slice(0,10):indiaDay(a.publishedAt);
const newest=(a,b)=>b.publishedAt.localeCompare(a.publishedAt)||a.id.localeCompare(b.id);

// Alternate languages within each publisher, then alternate publishers. This is
// a bounded matching sample, not a claim that the retained corpus is balanced.
export function matchingSample(articles,now=new Date(),limit=150){
 if(!Number.isSafeInteger(limit)||limit<1||limit>500)throw Error('Invalid matching limit');
 const today=indiaDay(now),cutoff=indiaDay(new Date(now.getTime()-6*86400000));
 const eligible=articles.filter(a=>Number.isFinite(Date.parse(a.publishedAt))&&Date.parse(a.publishedAt)<=now.getTime()&&publicationDay(a)>=cutoff&&publicationDay(a)<=today).sort(newest);
 const groups=new Map();
 for(const a of eligible){if(!groups.has(a.publisherGroup))groups.set(a.publisherGroup,new Map());const languages=groups.get(a.publisherGroup);if(!languages.has(a.language))languages.set(a.language,[]);languages.get(a.language).push(a);}
 const queues=[...groups].sort(([a],[b])=>a.localeCompare(b)).map(([,languages])=>{
  const lists=[...languages].sort(([a],[b])=>a.localeCompare(b)).map(([,items])=>[...items]),queue=[];
  while(lists.some(list=>list.length))for(const list of lists)if(list.length)queue.push(list.shift());
  return queue;
 });
 const sampled=[];
 while(sampled.length<limit&&queues.some(queue=>queue.length))for(const queue of queues)if(queue.length&&sampled.length<limit)sampled.push(queue.shift());
 return{eligible,sampled:sampled.sort(newest),cutoff,today};
}

export function groupReporting(articles,now=new Date(),limit=150){
 const{eligible,sampled,cutoff,today}=matchingSample(articles,now,limit),groups=[];
 const dated=new Map(sampled.map(a=>[a.id,{...a,publishedDate:publicationDay(a)}]));
 for(const a of sampled){const group=groups.find(peers=>peers.every(b=>relatedHeadlines(dated.get(a.id),dated.get(b.id))));if(group)group.push(a);else groups.push([a]);}
 const candidates=groups.filter(peers=>peers.length>1).map(peers=>{
  const articleIds=peers.map(a=>a.id).sort(),publisherGroupIds=[...new Set(peers.map(a=>a.publisherGroup))].sort();
  return{id:'group-'+hash(articleIds.join('|')).slice(0,20),revision:hash(peers.map(a=>JSON.stringify([a.id,a.headlineSha256,a.publishedAt,a.datePrecision,a.language,a.publisherGroup,a.kind])).sort().join('|')),method:groupingMethod,articleIds,publisherCount:publisherGroupIds.length,publisherGroupIds,languages:[...new Set(peers.map(a=>a.language))].sort(),officialLinks:peers.filter(a=>a.kind==='official').length,reportingLinks:peers.filter(a=>a.kind==='reporting').length,status:'awaiting_editor',confirmedSameEvent:false,publicationAllowed:false};
 }).sort((a,b)=>b.publisherCount-a.publisherCount||b.reportingLinks-a.reportingLinks||a.id.localeCompare(b.id));
 return{candidates,grouping:{method:groupingMethod,selection:'publisher-language-round-robin',windowStart:cutoff,windowEnd:today,maxMatchingArticles:limit,eligibleArticles:eligible.length,sampledArticles:sampled.length,excludedByLimit:eligible.length-sampled.length,eligiblePublisherGroups:new Set(eligible.map(a=>a.publisherGroup)).size,sampledPublisherGroups:new Set(sampled.map(a=>a.publisherGroup)).size,unmatchedArticles:groups.filter(g=>g.length===1).length,crossPublisherCandidates:candidates.filter(c=>c.publisherCount>1).length,crossLanguageMatching:false,automaticPublication:false}};
}

export function editorialCandidateReport(index,now=new Date()){
 const result=groupReporting(index.articles,now),byId=new Map(index.articles.map(a=>[a.id,a]));
 return{version:1,generatedAt:now.toISOString(),collectionCheckedAt:index.checkedAt,grouping:result.grouping,reviewStatus:'awaiting_editor',publicationAllowed:false,limitations:'Headline-only suggestions. Same-event identity, independent reporting, wire origin and semantic support are unconfirmed. Matching is within a source language only. No leaning or factuality assessment.',candidates:result.candidates.map(c=>({...c,reviewChecks:['Confirm the same event using permitted full text or transcripts.','Check original reporting, wire reuse and translations; publisher count is not independent corroboration.','Inspect conflicting claims, dates, figures, attribution and missing perspectives.','Record supporting evidence and approval separately before publication.'],sources:c.articleIds.map(id=>{const a=byId.get(id);return{id:a.id,title:a.title,url:a.url,publisher:a.publisher,publisherGroup:a.publisherGroup,language:a.language,kind:a.kind,publishedAt:a.publishedAt,headlineSha256:a.headlineSha256,materialExamined:a.materialExamined,bodyRetrieved:a.bodyRetrieved};})}))};
}
