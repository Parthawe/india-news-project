import {test} from 'node:test';
import assert from 'node:assert/strict';
import {matchingSample,groupReporting,editorialCandidateReport} from '../reporting-groups.mjs';
import {recordFrom,buildLatest,validLatest} from '../latest-core.mjs';
import sources from '../reporting-sources.json' with {type:'json'};

const now=new Date('2026-11-26T17:00:00Z');
const article=(id,title,patch={})=>({id,title,publisherGroup:'pib',publisher:'PIB',language:'en',kind:'official',publishedAt:'2026-11-26T12:00:00Z',datePrecision:'timestamp',headlineSha256:title,...patch});
test('publisher bursts do not exclude older reporting from the bounded matching sample',()=>{
 const burst=Array.from({length:200},(_,n)=>article('official-'+n,'Official bulletin '+n));
 const reports=[article('report-a','River pollution monitoring examines public health evidence',{publisherGroup:'a',kind:'reporting',publishedAt:'2026-11-25T12:00:00Z'}),article('report-b','River pollution monitoring examines public health evidence',{publisherGroup:'b',kind:'reporting',publishedAt:'2026-11-25T11:00:00Z'})];
 const result=groupReporting([...burst,...reports],now);
 assert.equal(result.grouping.sampledArticles,150);assert.equal(result.grouping.excludedByLimit,52);
 assert.equal(result.grouping.sampledPublisherGroups,3);
 assert.ok(result.candidates.some(c=>c.articleIds.includes('report-a')&&c.articleIds.includes('report-b')));
 assert.equal(result.grouping.crossPublisherCandidates,1);
 assert.deepEqual(result,groupReporting([...reports,...burst].reverse(),now));
});
test('sampling rotates source languages without treating translations as shared events',()=>{
 const items=Array.from({length:100},(_,n)=>article('en-'+n,'River pollution monitoring public health evidence'));
 items.push(article('hi-1','गंगा नदी प्रदूषण निगरानी स्वास्थ्य रिपोर्ट',{language:'hi'}));
 const{sampled}=matchingSample(items,now,4);
 assert.equal(sampled.filter(a=>a.language==='hi').length,1);
 const result=groupReporting(items,now,4);
 assert.equal(result.grouping.crossLanguageMatching,false);
 assert.ok(result.candidates.every(c=>c.languages.length===1&&c.publisherCount===1));
 assert.throws(()=>matchingSample(items,now,501));
});
test('matching uses seven India publication days and excludes future and expired metadata',()=>{
 const items=[article('inside','River pollution monitoring public health evidence',{publishedAt:'2026-11-19T19:00:00Z'}),article('outside','River pollution monitoring public health evidence',{publishedAt:'2026-11-19T18:00:00Z'}),article('future','River pollution monitoring public health evidence',{publishedAt:'2026-11-26T18:00:00Z'}),article('day-only','River pollution monitoring public health evidence',{datePrecision:'day',publishedAt:'2026-11-20T00:00:00Z'})];
 const result=matchingSample(items,now);
 assert.equal(result.cutoff,'2026-11-20');assert.deepEqual(new Set(result.sampled.map(a=>a.id)),new Set(['inside','day-only']));
});
test('candidate revisions change with examined headlines and never confer publication approval',()=>{
 const a=article('a','River pollution monitoring examines public health evidence'),b=article('b',a.title,{publisherGroup:'other',kind:'reporting'});
 const first=groupReporting([a,b],now).candidates[0];
 const changed=groupReporting([{...a,title:a.title+' locally',headlineSha256:'new-hash'},b],now).candidates[0];
 assert.equal(first.id,changed.id);assert.notEqual(first.revision,changed.revision);
 assert.notEqual(first.revision,groupReporting([{...a,publishedAt:'2026-11-26T11:00:00Z'},b],now).candidates[0].revision);
 assert.equal(first.confirmedSameEvent,false);assert.equal(first.publicationAllowed,false);assert.equal(first.status,'awaiting_editor');
});
test('complete-link grouping resists bridging and distinguishes conflicting headline numbers',()=>{
 const a=article('a','River water plastic waste cleaning ghats'),b=article('b','River water plastic waste cleaning ghats pipeline barrage'),c=article('c','Plastic waste cleaning ghats pipeline barrage');
 const result=groupReporting([a,b,c],now);
 assert.equal(result.candidates[0].articleIds.length,2);assert.equal(result.grouping.unmatchedArticles,1);
 assert.equal(groupReporting([article('x','River cleaning removes 100 tonnes plastic waste'),article('y','River cleaning removes 500 tonnes plastic waste')],now).candidates.length,0);
 assert.equal(groupReporting([article('x','गंगा नदी सफाई में १०० टन कचरा हटाया गया',{language:'hi'}),article('y','गंगा नदी सफाई में ५०० टन कचरा हटाया गया',{language:'hi'})],now).candidates.length,0);
});
test('the collector integrates grouping and private reports contain metadata, not untrusted raw bodies',()=>{
 const healthy=sources.filter(s=>s.enabled).map(s=>({id:s.id,publisher:s.publisher,language:s.language,permissionUrl:s.permissionUrl,status:'ok'}));
 const title='River pollution monitoring examines public health evidence';
 const records=['mongabay-en','globalvoices-en'].map((id,n)=>{const s=sources.find(s=>s.id===id);return recordFrom({link:'https://'+s.hosts[0]+'/2026/11/report-'+n,title,creator:'Example reporter',isoDate:'2026-11-26T12:00:00Z'},s,now)});
 const index=buildLatest(null,records,healthy,sources,now);
 assert.equal(validLatest(index,sources,now),true);assert.equal(index.grouping.crossPublisherCandidates,1);
 const report=editorialCandidateReport({...index,articles:index.articles.map(a=>({...a,body:'PRIVATE ARTICLE TEXT',token:'PRIVATE TOKEN'}))},now);
 assert.equal(report.candidates.length,1);assert.equal(report.publicationAllowed,false);
 assert.equal(report.candidates[0].sources.length,2);assert.equal(report.candidates[0].reviewChecks.length,4);
 assert.ok(!JSON.stringify(report).includes('PRIVATE'));assert.ok(report.limitations.includes('unconfirmed'));
 const empty=editorialCandidateReport({...index,articles:[]},now);assert.equal(empty.candidates.length,0);assert.equal(empty.grouping.sampledArticles,0);
});
