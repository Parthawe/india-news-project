import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {retainNews,validRetention,validRecovery} from '../news-retention.mjs';
import {recoverIntake,recoveryDays} from '../recover-intake.mjs';
import {recordFrom,buildLatest,validLatest,renderLatest} from '../latest-core.mjs';
import sources from '../reporting-sources.json' with {type:'json'};
const now=new Date('2026-11-26T18:00:00Z');
const row=(id,patch={})=>({id,publishedAt:'2026-11-26T12:00:00Z',kind:'official',publisherGroup:'pib',language:'en',...patch});
const reporting=(id,language='hi',publisherGroup='small')=>row(id,{kind:'reporting',publisherGroup,language,publishedAt:'2026-11-05T12:00:00Z'});
test('official bursts cannot displace a smaller reporting stream within the index bound',()=>{
 const records=[...Array.from({length:2500},(_,i)=>row('o-'+i)),...Array.from({length:19},(_,i)=>reporting('hi-'+i))];
 const result=retainNews(records);assert.equal(result.articles.length,500);assert.equal(result.articles.filter(a=>a.kind==='reporting').length,19);
 assert.equal(result.retention.eligibleLinks,2519);assert.equal(result.retention.excludedByLimit,2019);assert.equal(result.retention.eligibleSourceMix.official,2500);
 assert.deepEqual(result,retainNews(records.reverse()));assert.ok(result.articles.every((a,i)=>i===0||result.articles[i-1].publishedAt>=a.publishedAt));assert.equal(validRetention(result.retention,500),true);
});
test('one reporting publisher or language cannot displace smaller publisher/language streams',()=>{
 const records=[...Array.from({length:1000},(_,i)=>reporting('big-en-'+i,'en','big')),...Array.from({length:200},(_,i)=>reporting('big-hi-'+i,'hi','big')),...Array.from({length:15},(_,i)=>reporting('small-hi-'+i))];
 const result=retainNews(records);assert.equal(result.articles.length,500);assert.equal(result.articles.filter(a=>a.publisherGroup==='small').length,15);assert.equal(result.articles.filter(a=>a.publisherGroup==='big'&&a.language==='hi').length,200);
 assert.equal(retainNews(records.slice(0,3)).articles.length,3);assert.equal(retainNews([]).articles.length,0);assert.throws(()=>retainNews(records,501));
});
test('fresh metadata wins archive conflicts while the earliest first-seen provenance survives',()=>{
 const source=sources.find(s=>s.id==='mongabay-hi');
 const raw={link:'https://hindi.mongabay.com/2026/11/05/example/',title:'नदी प्रदूषण पर मूल समाचार और स्थानीय समुदाय का सवाल',creator:'Example reporter',isoDate:'2026-11-05T12:00:00Z'};
 const old=recordFrom(raw,source,new Date('2026-11-06T12:00:00Z')),fresh=recordFrom({...raw,title:raw.title+' अद्यतन'},source,new Date('2026-11-25T12:00:00Z'));
 const feeds=sources.filter(s=>s.enabled).map(s=>({id:s.id,publisher:s.publisher,language:s.language,permissionUrl:s.permissionUrl,status:'ok'}));
 const index=buildLatest({articles:[fresh]},[{...old,body:'PRIVATE'}],feeds,sources,now);
 assert.equal(index.articles[0].title,fresh.title);assert.equal(index.articles[0].firstSeenAt,old.firstSeenAt);assert.equal(index.articles[0].lastSeenAt,fresh.lastSeenAt);assert.equal(index.articles[0].body,undefined);assert.equal(validLatest(index,sources,now),true);
 const html=renderLatest(index);assert.ok(html.includes('How links are retained'));assert.ok(html.includes('Before retention:'));assert.ok(html.includes('not a ranking'));
 const legacy={...index};delete legacy.retention;assert.equal(validLatest(legacy,sources,now),true);assert.ok(renderLatest(legacy).includes('predates'));
});
test('archive recovery restores eligible metadata without marking it freshly seen or leaking extras',async()=>{
 const folder=await mkdtemp(join(tmpdir(),'inp-retention-'));
 try{const source=sources.find(s=>s.id==='mongabay-hi'),a=recordFrom({link:'https://hindi.mongabay.com/2026/11/05/example/',title:'नदी प्रदूषण पर स्थानीय समुदाय की रिपोर्ट',creator:'Example reporter',isoDate:'2026-11-05T12:00:00Z'},source,new Date('2026-11-06T12:00:00Z'));
 await writeFile(join(folder,'2026-11-05.json'),JSON.stringify({version:1,date:'2026-11-05',articles:[{...a,body:'PRIVATE',token:'PRIVATE'}]}));
 const result=await recoverIntake(folder,sources,now);assert.equal(result.articles.length,1);assert.equal(result.articles[0].lastSeenAt,a.lastSeenAt);assert.equal(result.articles[0].firstSeenAt,a.firstSeenAt);assert.ok(!JSON.stringify(result).includes('PRIVATE'));assert.equal(result.recovery.readDays,1);assert.equal(result.recovery.missingDays,30);assert.equal(validRecovery(result.recovery),true);
 assert.equal(recoveryDays(new Date('2026-11-26T18:31:00Z'))[0],'2026-11-27');assert.equal(recoveryDays(now).length,31);
 }finally{await rm(folder,{recursive:true,force:true})}
});
test('bad, oversized, wrong-day and offsite archive material fails closed while valid records survive',async()=>{
 const folder=await mkdtemp(join(tmpdir(),'inp-retention-'));
 try{const source=sources.find(s=>s.id==='mongabay-hi'),a=recordFrom({link:'https://hindi.mongabay.com/2026/11/05/example/',title:'नदी प्रदूषण पर स्थानीय समुदाय की रिपोर्ट',creator:'Example reporter',isoDate:'2026-11-05T12:00:00Z'},source,now);
 await writeFile(join(folder,'2026-11-05.json'),JSON.stringify({version:1,date:'2026-11-05',articles:[a,{...a,url:'https://evil.test/'},{...a,bodyRetrieved:true},{...a,lastSeenAt:'2030-01-01T00:00:00Z'}]}));
 await writeFile(join(folder,'2026-11-06.json'),JSON.stringify({version:1,date:'2026-11-06',articles:[a]}));
 await writeFile(join(folder,'2026-11-07.json'),'not json');
 await writeFile(join(folder,'2026-11-08.json'),'x'.repeat(2500001));
 const x=await recoverIntake(folder,sources,now);assert.equal(x.articles.length,1);assert.equal(x.recovery.rejectedRecords,4);assert.equal(x.recovery.failures.length,2);assert.equal(x.recovery.status,'partial');assert.equal(validRecovery(x.recovery),true);
 assert.ok(x.recovery.failures.some(f=>f.reason==='archive_size_limit'));
 }finally{await rm(folder,{recursive:true,force:true})}
});
test('expired records are ordinary expiry and the oldest partial India day is scanned',async()=>{
 const folder=await mkdtemp(join(tmpdir(),'inp-retention-'));
 try{const source=sources.find(s=>s.id==='mongabay-hi');const make=(id,time)=>recordFrom({link:'https://hindi.mongabay.com/2026/10/27/'+id+'/',title:'नदी प्रदूषण पर स्थानीय समुदाय की रिपोर्ट',creator:'Example reporter',isoDate:time},source,new Date('2026-10-28T12:00:00Z'));
 const inside=make('inside','2026-10-27T19:00:00Z'),expired=make('expired','2026-10-27T17:00:00Z');
 await writeFile(join(folder,'2026-10-28.json'),JSON.stringify({version:1,date:'2026-10-28',articles:[inside]}));await writeFile(join(folder,'2026-10-27.json'),JSON.stringify({version:1,date:'2026-10-27',articles:[expired]}));
 const x=await recoverIntake(folder,sources,now);assert.deepEqual(x.articles.map(a=>a.id),[inside.id]);assert.equal(x.recovery.expiredRecords,1);assert.equal(x.recovery.status,'complete');
 }finally{await rm(folder,{recursive:true,force:true})}
});
test('malformed scope metadata is rejected without breaking older snapshots',()=>{
 assert.equal(validRetention(undefined,0),true);assert.equal(validRecovery(undefined),true);
 for(const value of[null,{},[],{policy:'invented'},{...retainNews([row('x')]).retention,retainedLinks:10},{...retainNews([row('x')]).retention,eligibleSourceMix:{links:1,official:1,reporting:0,unclassified:0,publisherGroups:1}}])assert.equal(validRetention(value,1),false);
 assert.equal(validRecovery({status:'complete',attemptedDays:31,readDays:31,missingDays:0,recoveredRecords:0,expiredRecords:0,rejectedRecords:0,failures:[{day:'2026-11-01',reason:'unknown'}]}),false);
});
