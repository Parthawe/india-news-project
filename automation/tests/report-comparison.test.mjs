import{load}from'cheerio';
import test from'node:test';import assert from'node:assert/strict';import{comparisonIds,comparisonState,comparisonMix,renderComparisonBody,readingLinkAttributes}from'../report-comparison.mjs';
const id=n=>'report-'+String(n).padStart(24,'0'),article=(n,group='g'+n)=>({id:id(n),publisher:'Test publisher '+group,publisherGroup:group,title:'Original headline '+n,url:'https://example.com/'+n,language:'en',kind:'reporting',publishedAt:'2026-11-26T12:00:00Z',datePrecision:'timestamp'});
test('comparison links accept up to three public report ids and deduplicate repeats',()=>{assert.deepEqual(comparisonIds([id(1),id(1),id(2)].join(',')).ids,[id(1),id(2)]);assert.equal(comparisonIds([1,2,3,4].map(id).join(',')).tooMany,true);assert.deepEqual(comparisonIds([1,2,3,4].map(id).join(',')).ids,[]);});
test('malformed ids are disclosed and cannot become arbitrary fetch URLs',()=>{const state=comparisonIds(id(1)+',https://evil.example/,<script>');assert.equal(state.invalid,true);assert.deepEqual(state.ids,[id(1)]);assert.deepEqual(comparisonIds(null).ids,[]);});
test('expired shared selections remain explicitly unavailable',()=>{const state=comparisonState([article(1)],[id(1),id(2)]);assert.equal(state.selected.length,1);assert.deepEqual(state.missing,[id(2)]);const html=renderComparisonBody([article(1)],[id(1),id(2)]);assert.match(html,/unavailable in the current index/);assert.match(html,/at least two available/);assert.equal((html.match(/data-compare-card=/g)||[]).length,1);});
test('publisher groups count once and inconsistent editions stay outside the spectrum',()=>{const list=[article(1,'a'),article(2,'a'),article(3,'b')];const mix=comparisonMix(list,a=>a.id===id(1)?'left':a.id===id(2)?'right':'centre');assert.equal(mix.total,2);assert.deepEqual(mix.counts,{left:0,centre:1,right:0,outside:1});const shared=comparisonMix(list,()=> 'left');assert.equal(shared.counts.left,2);});
test('official, issue-dependent and unknown outcomes are not turned into Centre',()=>{const list=[article(1),article(2),article(3)],labels=['official','issue-dependent','unassessed'];const mix=comparisonMix(list,a=>labels[Number(a.id.slice(-1))-1]);assert.equal(mix.counts.centre,0);assert.equal(mix.counts.outside,3);});
test('comparison preserves headline-only limits, source evidence, language and escaped text',()=>{const a={...article(1),language:'hi',title:'शीर्षक <script>bad</script>'},html=renderComparisonBody([a,article(2)],[id(1),id(2)],'en','/india-news-project');assert.match(html,/Same event not confirmed/);assert.match(html,/Article framing unreviewed/);assert.match(html,/Headline only/);assert.match(html,/lang="hi"/);assert.match(html,/&lt;script&gt;/);assert.doesNotMatch(html,/<script>/);assert.match(html,/data-reading-source-id/);assert.match(html,/\/india-news-project\/en\/method\/#coverage-gaps/);assert.match(html,/not all coverage/);});
test('source-link markers escape publisher attributes and contain no article body',()=>{const attrs=readingLinkAttributes({...article(1),publisher:'"><img src=x onerror=bad>'});assert.doesNotMatch(attrs,/<img/);assert.match(attrs,/&quot;&gt;&lt;img/);assert.doesNotMatch(attrs,/body|transcript/);});

test('comparison bars use publisher-group proportions and disclose every count including zero categories',()=>{
 const list=[{...article(1,'organiser'),publisher:'Organiser'},{...article(2,'scroll'),publisher:'Scroll'},{...article(3,'unknown'),publisher:'Unknown'}];
 for(const selected of [list,list.slice(0,2),[list[0],{...list[0],id:id(4)},list[2]]]){
  const mix=comparisonMix(selected),$=load(renderComparisonBody(selected,selected.map(a=>a.id)));
  for(const key of ['left','centre','right','outside']){
   const count=mix.counts[key],segment=$('.report-mix-track .'+key),label=$('[data-mix-category="'+key+'"]');
   assert.equal(segment.length,count?1:0);
   if(count)assert.equal(segment.attr('style'),`width:${100*count/mix.total}%`);
   assert.match(label.text(),new RegExp('\\('+count+'/'+mix.total+'\\)'));
  }
  assert.match($('.report-selected-mix').text(),/not all coverage/);
 }
});
