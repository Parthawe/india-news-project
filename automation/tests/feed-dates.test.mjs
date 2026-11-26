import {test} from 'node:test';
import assert from 'node:assert/strict';
import {feedPublicationDate} from '../feed-dates.mjs';
import {recordFrom,buildLatest,validLatest} from '../latest-core.mjs';
import sources from '../reporting-sources.json' with {type:'json'};

test('Hindi publisher timestamps preserve explicit dates, times and offsets',()=>{
 assert.equal(feedPublicationDate('26 नवम्बर 2026 13:54:38 +0000','hi'),'2026-11-26T13:54:38.000Z');
 assert.equal(feedPublicationDate('२६ नवंबर २०२६ १९:२४:३८ +०५३०','hi'),'2026-11-26T13:54:38.000Z');
 assert.equal(feedPublicationDate('26 नवंबर 2026 01:00:00 +05:30','hi'),'2026-11-25T19:30:00.000Z');
 assert.equal(feedPublicationDate('26 नवंबर 2026 23:00:00 -0530','hi'),'2026-11-27T04:30:00.000Z');
 assert.equal(feedPublicationDate('29 फ़रवरी 2028 00:00:00 +0000','hi'),'2028-02-29T00:00:00.000Z');
});
test('calendar errors, unknown months, missing offsets and unsupported locales stay unavailable',()=>{
 for(const value of['31 नवंबर 2026 13:54:38 +0000','29 फरवरी 2026 00:00:00 +0000','00 नवंबर 2026 00:00:00 +0000','26 अज्ञात 2026 13:54:38 +0000','26 नवंबर 2026 13:54:38','26 नवंबर 2026 24:00:00 +0000','26 नवंबर 2026 13:60:00 +0000','26 नवंबर 2026 13:54:60 +0000','26 नवंबर 2026 13:54:38 +1460','26 नवंबर 2026 13:54:38 +1430','कल',''])assert.equal(feedPublicationDate(value,'hi'),null,value);
 assert.equal(feedPublicationDate('26 नवम्बर 2026 13:54:38 +0000','en'),null);
 assert.equal(feedPublicationDate(null,'hi'),null);
});
test('all Hindi month names and common variants are explicit rather than guessed',()=>{
 const names=['जनवरी','फरवरी','मार्च','अप्रैल','मई','जून','जुलाई','अगस्त','सितंबर','अक्टूबर','नवंबर','दिसंबर'];
 names.forEach((name,n)=>assert.equal(feedPublicationDate(`01 ${name} 2026 00:00:00 +0000`,'hi'),`2026-${String(n+1).padStart(2,'0')}-01T00:00:00.000Z`));
 for(const[name,month]of[['सितम्बर','09'],['नवम्बर','11'],['दिसम्बर','12']])assert.equal(feedPublicationDate(`01 ${name} 2026 00:00:00 +0000`,'hi'),`2026-${month}-01T00:00:00.000Z`);
 assert.equal(feedPublicationDate('Thu, 26 Nov 2026 13:54:38 +0000'),'2026-11-26T13:54:38.000Z');
 assert.equal(feedPublicationDate('2026-11-26T13:54:38+00:00','hi'),'2026-11-26T13:54:38.000Z');
});
test('localized dates pass ordinary attribution, retention and future-date gates without inference',()=>{
 const source=sources.find(s=>s.id==='mongabay-hi'),now=new Date('2026-11-26T18:00:00Z');
 const raw={link:'https://hindi.mongabay.com/2026/11/26/example/',title:'गंगा नदी के जल प्रदूषण पर स्थानीय समुदाय की रिपोर्ट',creator:'Example reporter',pubDate:'26 नवम्बर 2026 13:54:38 +0000'};
 const a=recordFrom(raw,source,now);assert.equal(a.publishedAt,'2026-11-26T13:54:38.000Z');assert.equal(a.datePrecision,'timestamp');assert.equal(a.bodyRetrieved,false);
 for(const patch of[{pubDate:'27 नवंबर 2026 13:54:38 +0000'},{pubDate:'01 अक्टूबर 2026 13:54:38 +0000'},{pubDate:'26 नवम्बर 2026 13:54:38'},{creator:''}])assert.throws(()=>recordFrom({...raw,...patch},source,now));
 const healthy=sources.filter(s=>s.enabled).map(s=>({id:s.id,publisher:s.publisher,language:s.language,permissionUrl:s.permissionUrl,status:'ok'}));
 const index=buildLatest(null,[a],healthy,sources,now);assert.equal(validLatest(index,sources,now),true);assert.equal(index.articles[0].publishedAt,a.publishedAt);
});
