import{test}from'node:test';import assert from'node:assert/strict';import{regionalReleaseLinks}from'../pib-regional.mjs';
test('regional intake keeps full publisher titles, canonicalises releases and rejects offsite links',()=>{
 const s={kind:'official',format:'pib_html',url:'https://www.pib.gov.in/allRel.aspx?reg=1&lang=9'};
 const html='<div class="content-area"><a title="पूर्ण मूळ शीर्षक आणि तपशील" href="/PressReleaseDetail.aspx?PRID=2342298">truncated...</a><a href="/PressReleasePage.aspx?PRID=2342298">duplicate release</a><a href="https://evil.test/?PRID=2342299">malicious release</a></div><a href="/PressReleasePage.aspx?PRID=2342290">Outside article list</a>';
 const x=regionalReleaseLinks(html,s);assert.equal(x.length,1);assert.equal(x[0].title,'पूर्ण मूळ शीर्षक आणि तपशील');assert.equal(x[0].link,'https://www.pib.gov.in/PressReleasePage.aspx?PRID=2342298');assert.throws(()=>regionalReleaseLinks(html,{...s,kind:'reporting'}));
});
