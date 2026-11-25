import {test} from 'node:test';import assert from 'node:assert/strict';
import sources from '../reporting-sources.json' with {type:'json'};
import {recordFrom} from '../latest-core.mjs';import {indiaDay,buildIntake} from '../intake-core.mjs';
const now=new Date('2026-11-25T20:00:00Z'),source=sources.find(s=>s.id==='mongabay-en');
const make=(date='2026-11-25T19:00:00Z',suffix='a')=>recordFrom({link:'https://india.mongabay.com/2026/11/'+suffix+'/',title:'River pollution evidence examined in regional reporting',creator:'QA fixture',isoDate:date},source,now);
test('India publication day, duplicate links and evidence states are explicit',()=>{
 assert.equal(indiaDay('2026-11-25T18:31:00Z'),'2026-11-26');
 const a=make(),x=buildIntake(null,[a,a,{...a,body:'private',report:'not reviewed'}],sources,'2026-11-26',now);
 assert.equal(x.counts.links,1);assert.equal(x.counts.shortfall,99);assert.equal(x.articles[0].body,undefined);assert.equal(x.counts.fullTextAnalyses,0);assert.equal(x.analysisStatus,'metadata_only');
 assert.equal(buildIntake(null,[a],sources,'2026-11-25',now).counts.links,0);
});
test('late arrivals merge without losing earlier same-day links or admitting forged findings',()=>{
 const a=make(),b=make('2026-11-25T19:10:00Z','b');const first=buildIntake(null,[a],sources,'2026-11-26',now);
 const next=buildIntake(first,[b,{...a,bodyRetrieved:true}],sources,'2026-11-26',now);
 assert.equal(next.counts.links,2);assert.equal(next.counts.shortfall,98);
 const dayOnly={...make('2026-11-25T00:00:00Z','day'),datePrecision:'day'};
 assert.equal(buildIntake(null,[dayOnly],sources,'2026-11-25',now).counts.links,1);
 assert.throws(()=>buildIntake(null,[],sources,'2026-11-27',now));
});
