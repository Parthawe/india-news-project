import {createHash} from 'node:crypto';
import {validItem} from './daily-core.ts';
const digest=value=>createHash('sha256').update(value).digest('hex');
const stop=new Set('the a an and or of in on at to for from with by as is are was were be has have had its their this that these those government minister ministry shri india indian union national launch launches launched visit visits today new under through across release press pib says said'.split(' '));
for(const word of 'भारत भारतीय सरकार केंद्रीय केन्द्र मंत्री मंत्रालय श्री आज नई नया नए तथा और की के का को से में पर लिए द्वारा राज्य राष्ट्रीय कार्यक्रम घोषणा शुरू किया किए करेगा'.split(' '))stop.add(word);
export function headlineTokens(title){
 return new Set(title.normalize('NFKC').toLocaleLowerCase().match(/[\p{L}\p{M}\p{N}]+/gu)?.filter(word=>word.length>2&&!stop.has(word))||[]);
}
export function relatedHeadlines(a,b){
 if(a.id===b.id||a.language!==b.language)return false;
 if(Math.abs(Date.parse(a.publishedDate)-Date.parse(b.publishedDate))>2*86400000)return false;
 const aa=headlineTokens(a.title),bb=headlineTokens(b.title),intersection=[...aa].filter(t=>bb.has(t));
 if(intersection.length<3||2*intersection.length/(aa.size+bb.size)<.7)return false;
 const numbers=s=>[...new Set(s.normalize('NFKC').replace(/[०-९]/g,d=>String('०१२३४५६७८९'.indexOf(d))).match(/\d+(?:\.\d+)?/g)||[])].sort();
 const na=numbers(a.title),nb=numbers(b.title);
 if(na.length&&nb.length&&na.join('|')!==nb.join('|'))return false;
 return true;
}
export function buildStoryIndex(previous,fetched,feeds,now=new Date()){
 if(!Array.isArray(fetched)||!fetched.some(validItem))throw Error('No valid source records; retain the previous index');
 const collectedAt=now.toISOString(),cutoff=now.getTime()-30*86400000;
 const articles=new Map();
 for(const record of Array.isArray(previous?.articles)?previous.articles:[]){
  if(validItem(record)&&Date.parse(record.publishedDate+'T23:59:59Z')>=cutoff&&Date.parse(record.publishedDate)<=now.getTime())articles.set(record.id,record);
 }
 for(const item of fetched.filter(validItem)){
  if(Date.parse(item.publishedDate)>now.getTime()||Date.parse(item.publishedDate+'T23:59:59Z')<cutoff)continue;
  const prior=articles.get(item.id);articles.set(item.id,{...item,firstSeenAt:prior?.firstSeenAt||collectedAt,lastSeenAt:collectedAt,headlineSha256:digest(item.title),materialExamined:'headline_and_publication_metadata',bodyRetrieved:false,sourceId:'pib-en'});
 }
 const records=[...articles.values()].sort((a,b)=>b.publishedDate.localeCompare(a.publishedDate)||a.id.localeCompare(b.id)).slice(0,2000).map(item=>({id:item.id,title:item.title,url:item.url,publisher:item.publisher,language:item.language,publishedDate:item.publishedDate,publishedDateText:item.publishedDateText,collectedAt:item.collectedAt,sourceFeed:item.sourceFeed,ministry:item.ministry,firstSeenAt:typeof item.firstSeenAt==='string'&&Number.isFinite(Date.parse(item.firstSeenAt))?item.firstSeenAt:collectedAt,lastSeenAt:typeof item.lastSeenAt==='string'&&Number.isFinite(Date.parse(item.lastSeenAt))?item.lastSeenAt:collectedAt,headlineSha256:digest(item.title),materialExamined:'headline_and_publication_metadata',bodyRetrieved:false,sourceId:'pib-en'}));
 const matching=records.filter(a=>Date.parse(a.publishedDate+'T23:59:59Z')>=now.getTime()-7*86400000).slice(0,250);
 const groups=[];
 // Complete-link matching avoids merging A and C merely because each resembles B.
 for(const article of matching){const group=groups.find(g=>g.every(other=>relatedHeadlines(article,other)));if(group)group.push(article);else groups.push([article]);}
 const candidates=groups.filter(g=>g.length>1).map(group=>{
  const ids=group.map(a=>a.id).sort();return {id:'candidate-'+ids[0],revision:digest(group.map(a=>a.id+':'+a.headlineSha256).sort().join('|')),articleIds:ids,publisherCount:new Set(group.map(a=>a.publisher.trim().toLowerCase())).size,status:'awaiting_editor',method:'headline-overlap-v1',confirmedSameEvent:false,publicationAllowed:false};
 });
 return {version:1,collectedAt,scope:{sourceIds:['pib-en'],retainedDays:30,maxArticles:2000,matchingDays:7,maxMatchingArticles:250},feeds,articles:records,candidates,unmatchedArticleIds:groups.filter(g=>g.length===1).map(g=>g[0].id),counts:{articles:records.length,matchingArticles:matching.length,suggestedGroups:candidates.length,unmatchedArticles:groups.filter(g=>g.length===1).length,publishers:new Set(records.map(a=>a.publisher.trim().toLowerCase())).size},review:{automaticPublication:false,reason:'Headline similarity is a candidate relation, not confirmation of a shared event. Full-text evidence and editorial review are still required.'}};
}
