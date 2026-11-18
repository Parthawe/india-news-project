import {test} from 'node:test';
import assert from 'node:assert/strict';
import {illustrations,illustrationFor,illustrationHTML} from '../illustrations.mjs';
test('illustration selection stays inside the reviewed local collection and never incorporates publisher markup',()=>{
 assert.equal(illustrations.length,60);
 assert.equal(new Set(illustrations.map(a=>a.id)).size,60);
 for(const art of illustrations)assert.match(art.path,/^\/images\/editorial\/[a-z0-9-]+\.webp$/);
 assert.equal(illustrationFor({title:'Ganga cleaning in Haridwar'}).id,'ganga-cleaning');
 assert.equal(illustrationFor({title:'Budget and health services'}).id,'health-budget');
 const html=illustrationHTML({id:'../../private',title:'<img src=x onerror=alert(1)>'},'hi','/india-news-project',true);
 assert.ok(html.includes('src="/india-news-project/images/editorial/year-in-review.webp"'));
 assert.ok(html.includes('/india-news-project/hi/method/#illustrations'));
 assert.ok(!html.includes('onerror'));
 assert.ok(html.includes('aria-label='));
});
