import {test} from 'node:test';import assert from 'node:assert/strict';
import {buildStoryIndex,relatedHeadlines} from '../story-index.mjs';
const now=new Date('2026-11-18T03:00:00Z');
const item=(n,title,extra={})=>({id:`pib-${2300000+n}`,title,url:`https://www.pib.gov.in/PressReleasePage.aspx?PRID=${2300000+n}`,publisher:'Press Information Bureau',language:'en',publishedDate:'2026-11-17',publishedDateText:'Posted On: 17 NOV 2026 9:29PM by PIB Delhi',collectedAt:now.toISOString(),sourceFeed:'https://www.pib.gov.in/RssMain.aspx',ministry:'Ministry example',...extra});
test('group suggestions are distinct from confirmed events, publisher diversity and publication approval',()=>{
 const a=item(1,'Haridwar river cleaning programme removes plastic waste'),b=item(2,'Haridwar river cleaning programme removes plastic waste near ghats');
 const index=buildStoryIndex(null,[a,b],[],now);assert.equal(index.candidates.length,1);assert.equal(index.candidates[0].publisherCount,1);assert.equal(index.candidates[0].confirmedSameEvent,false);assert.equal(index.candidates[0].publicationAllowed,false);assert.equal(index.articles[0].bodyRetrieved,false);
});
test('shared generic government wording does not establish a match; mismatched numbers and dates remain separate',()=>{
 assert.equal(relatedHeadlines(item(1,'Union Minister launches national farming programme'),item(2,'Union Minister launches national science programme')),false);
 assert.equal(relatedHeadlines(item(1,'Haridwar river cleaning removes 100 tonnes of plastic waste'),item(2,'Haridwar river cleaning removes 500 tonnes of plastic waste')),false);
 assert.equal(relatedHeadlines(item(1,'Haridwar river cleaning 2026 removes 100 tonnes of plastic waste'),item(2,'Haridwar river cleaning 2026 removes 500 tonnes of plastic waste')),false);
 assert.equal(relatedHeadlines(item(1,'गंगा नदी सफाई में १०० टन कचरा हटाया गया',{language:'hi'}),item(2,'गंगा नदी सफाई में ५०० टन कचरा हटाया गया',{language:'hi'})),false);
 assert.equal(relatedHeadlines(item(1,'Haridwar river cleaning removes plastic waste'),item(2,'Haridwar river cleaning removes plastic waste',{publishedDate:'2026-11-10',publishedDateText:'10 NOV 2026'})),false);
});
test('retries preserve first-seen provenance and stable revisions; changed source text invalidates revisions',()=>{
 const a=item(1,'Haridwar river cleaning programme removes plastic waste'),b=item(2,'Haridwar river cleaning programme removes plastic waste near ghats');
 const first=buildStoryIndex(null,[a,b],[],now);const later=buildStoryIndex(first,[a,b],[],new Date(now.getTime()+60000));
 assert.equal(later.articles.length,2);assert.equal(later.articles[0].firstSeenAt,first.articles[0].firstSeenAt);assert.equal(later.candidates[0].revision,first.candidates[0].revision);
 const changed=buildStoryIndex(first,[{...a,title:a.title+' near ghats'},b],[],now);assert.notEqual(changed.candidates[0].revision,first.candidates[0].revision);
});
test('unavailable retrieval never clears the index; unsupported hosts and injected approval fields cannot enter it',()=>{
 const a=item(1,'A public release with a traceable source');const first=buildStoryIndex(null,[a],[],now);
 assert.throws(()=>buildStoryIndex(first,[],[],now));
 const second=buildStoryIndex({...first,candidates:[{publicationAllowed:true}]},[a,item(2,'An arbitrary unsupported source',{url:'https://evil.test/?PRID=2300002'})],[],now);
 assert.equal(second.articles.length,1);assert.equal(second.review.automaticPublication,false);assert.equal(second.candidates.length,0);
});
test('matching does not chain unrelated reports through a broad intermediate headline',()=>{
 const a=item(1,'River water plastic waste cleaning ghats'),b=item(2,'River water plastic waste cleaning ghats pipeline barrage'),c=item(3,'Plastic waste cleaning ghats pipeline barrage');
 assert.equal(relatedHeadlines(a,b),true);assert.equal(relatedHeadlines(b,c),true);assert.equal(relatedHeadlines(a,c),false);
 const index=buildStoryIndex(null,[a,b,c],[],now);assert.equal(index.candidates.length,1);assert.equal(index.candidates[0].articleIds.length,2);assert.equal(index.unmatchedArticleIds.length,1);
});
