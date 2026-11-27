import{load}from'cheerio';
import{test}from'node:test';import assert from'node:assert/strict';
import sources from'../reporting-sources.json'with{type:'json'};
import{allowedURL,recordFrom,buildLatest,validLatest,renderLatest}from'../latest-core.mjs';
const now=new Date('2026-11-18T12:00:00Z'),source=sources.find(s=>s.id==='mongabay-en');
const raw={link:'https://india.mongabay.com/2026/11/test-report/',title:'Regional water reporting examines river pollution and public health evidence',creator:'Example author',isoDate:'2026-11-18T10:00:00Z'};
const healthy=sources.filter(s=>s.enabled).map(s=>({id:s.id,publisher:s.publisher,language:s.language,permissionUrl:s.permissionUrl,status:'ok',accepted:0,lastSuccessAt:now.toISOString()}));
test('reporting intake requires approved hosts, original attribution and actual publication dates',()=>{
 const a=recordFrom(raw,source,now);assert.equal(a.bodyRetrieved,false);assert.equal(a.reviewStatus,'unreviewed');
 for(const url of['http://india.mongabay.com/a','https://india.mongabay.com.evil.test/a','https://secret@india.mongabay.com/a','https://127.0.0.1/a'])assert.throws(()=>allowedURL(url,source));
 for(const patch of[{creator:''},{isoDate:'unavailable'},{isoDate:'2026-11-19T10:00:00Z'},{title:'<script>alert(1)</script>'}])assert.throws(()=>recordFrom({...raw,...patch},source,now));
 assert.equal(allowedURL(raw.link+'?utm_source=feed',source),raw.link);
});
test('outages retain valid dated records, exact duplicates collapse and stale records expire',()=>{
 const a=recordFrom(raw,source,now);const first=buildLatest(null,[a,a],healthy,sources,now);assert.equal(first.articles.length,1);assert.equal(validLatest(first,sources,now),true);
 const extra={...a,body:'must never be retained'};assert.equal(buildLatest(null,[extra],healthy,sources,now).articles[0].body,undefined);
 const failed=healthy.map(f=>({...f,status:'failed'}));const next=buildLatest(first,[],failed,sources,now);assert.equal(next.status,'unavailable');assert.equal(next.articles.length,1);
 assert.equal(buildLatest(first,[],healthy,sources,new Date('2026-12-25T00:00:00Z')).articles.length,0);
 const forged=structuredClone(first);forged.articles[0].publisher='Invented source';assert.equal(validLatest(forged,sources,now),false);
 const malicious=structuredClone(first);malicious.feeds[0].permissionUrl='javascript:alert(1)';assert.equal(validLatest(malicious,sources,now),false);
});
test('related headlines remain provisional and rendered headlines cannot inject HTML',()=>{
 const a=recordFrom(raw,source,now),other=sources.find(s=>s.id==='globalvoices-en');const b=recordFrom({...raw,link:'https://globalvoices.org/2026/11/18/river-report/'},other,now);
 const index=buildLatest(null,[a,b],healthy,sources,now);assert.equal(index.candidates.length,1);assert.equal(index.candidates[0].publicationAllowed,false);assert.equal(index.candidates[0].confirmedSameEvent,false);
 const html=renderLatest(index,'en','/india-news-project');assert.ok(html.includes('/india-news-project/images/editorial/'));assert.ok(html.includes('Example author'));assert.ok(!html.includes('AI verdict'));assert.ok(html.includes('Source health and permissions'));
});

test('report list preserves original headline links and source bars while disclosing tools and art',()=>{const a=recordFrom(raw,source,now),$=load(renderLatest(buildLatest(null,[a],healthy,sources,now),'en','/india-news-project'));assert.equal($('.latest-source-label').length,1);assert.equal($('.latest-record h2 a').attr('href'),a.url);assert.equal($('.latest-record>.news-labels .news-coverage-track').length,1);assert.equal($('.latest-provenance:not([open])').length,1);assert.equal($('.latest-provenance .editorial-illustration').length,1);assert.equal($('.latest-provenance [data-select-compare]').length,1);assert.equal($('.latest-provenance .latest-actions a').length>=2,true);assert.equal($('.latest-record>.editorial-illustration').length,0);});
