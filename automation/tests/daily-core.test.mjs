import {test} from 'node:test';
import assert from 'node:assert/strict';
import {canonicalRelease,publisherDate,indiaDate,selectDaily,validItem,validEdition,renderDaily} from '../daily-core.ts';
const item=(n,extra={})=>({id:`pib-${2300000+n}`,title:`Distinct government update number ${n}`,url:`https://www.pib.gov.in/PressReleasePage.aspx?PRID=${2300000+n}`,publisher:'Press Information Bureau',language:'en',publishedDate:'2026-11-17',publishedDateText:'Posted On: 17 NOV 2026 9:29PM by PIB Delhi',collectedAt:'2026-11-18T03:00:00Z',sourceFeed:'https://www.pib.gov.in/RssMain.aspx',ministry:'Ministry example',...extra});
const edition=items=>({version:1,date:'2026-11-18',collectedAt:'2026-11-18T03:00:00Z',target:5,status:items.length===5?'complete':items.length?'partial':'unavailable',items,feeds:[]});
test('PIB publication dates are required; collection dates never replace missing publication dates',()=>{
 assert.equal(publisherDate('Posted On: 17 NOV 2026 9:29PM'),'2026-11-17');
 for(const text of ['','31 FEB 2026','32 NOV 2026'])assert.equal(publisherDate(text),null);
 assert.equal(validItem(item(1,{publishedDate:'2026-99-99'})),false);
 assert.equal(validItem(item(1,{publishedDateText:'unknown'})),false);
 assert.equal(indiaDate(new Date('2026-11-17T20:00:00Z')),'2026-11-18');
});
test('release links are canonicalised and never accept arbitrary websites or credentials',()=>{
 assert.equal(canonicalRelease('https://pib.gov.in/PressReleasePage.aspx?lang=2&PRID=2300001').key,'pib-2300001');
 for(const url of ['javascript:alert(1)','https://evil.test/?PRID=2300001','https://secret@www.pib.gov.in/?PRID=2300001'])assert.throws(()=>canonicalRelease(url));
});
test('morning and afternoon runs retain the same five, deduplicate and fill only missing slots',()=>{
 const candidates=Array.from({length:8},(_,i)=>item(i));
 const morning=selectDaily(candidates,[],'2026-11-18',new Set());assert.equal(morning.length,5);
 assert.deepEqual(selectDaily(candidates.slice().reverse(),morning,'2026-11-18',new Set()),morning);
 const duplicates=[item(1),item(1),item(2,{title:item(1).title.toUpperCase()}),item(3)];
 assert.equal(selectDaily([],duplicates,'2026-11-18',new Set()).length,2);
 assert.equal(selectDaily(candidates,[item(0)],'2026-11-18',new Set()).length,5);
});
test('previously selected, stale and future-dated releases do not fill missing slots',()=>{
 const old=item(2,{publishedDate:'2026-11-10',publishedDateText:'10 NOV 2026'}),future=item(3,{publishedDate:'2026-11-19',publishedDateText:'19 NOV 2026'});
 assert.deepEqual(selectDaily([item(1),old,future,item(4)],[],'2026-11-18',new Set([item(1).id])),[item(4)]);
});
test('partial editions stay explicit and publisher text is escaped in both languages',()=>{
 const data=edition([item(1,{title:'A headline with <img src=x onerror=alert(1)> & a claim'})]);
 assert.equal(validEdition(data),true);
 for(const lang of ['en','hi']){const html=renderDaily(data,lang);assert.ok(html.includes('&lt;img'));assert.ok(!html.includes('<img'));assert.ok(html.includes('1/5'));assert.ok(html.includes('Press Information Bureau'));}
 assert.equal(validEdition({...data,collectedAt:null}),false);
 assert.equal(validEdition({...data,items:[item(1),item(1)]}),false);
 assert.equal(validEdition({...data,status:'complete'}),false);
});
