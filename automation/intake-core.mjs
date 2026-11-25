import {recordFrom,validRecord} from './latest-core.mjs';
// A dated link archive, not a ranking, story count or completed analysis queue.
export const indiaDay = value => new Date(value).toLocaleDateString('en-CA',{timeZone:'Asia/Kolkata'});
export function buildIntake(previous, records, sources, day, now=new Date()) {
 if(!/^\d{4}-\d{2}-\d{2}$/.test(day)||day>indiaDay(now))throw Error('Invalid intake day');
 const byURL=new Map();
 for(const a of [...(previous?.date===day?previous.articles||[]:[]),...records]){
  if(!validRecord(a,sources,now))continue;
  const publicationDay=a.datePrecision==='day'?a.publishedAt.slice(0,10):indiaDay(a.publishedAt);
  if(publicationDay!==day)continue;
  const source=sources.find(s=>s.id===a.sourceId);
  const clean=recordFrom({link:a.url,title:a.title,creator:a.author,isoDate:a.publishedAt,datePrecision:a.datePrecision},source,now,a);
  clean.lastSeenAt=a.lastSeenAt;byURL.set(clean.url,clean);
 }
 const articles=[...byURL.values()].sort((a,b)=>b.publishedAt.localeCompare(a.publishedAt)||a.id.localeCompare(b.id));
 return {version:1,date:day,timeZone:'Asia/Kolkata',checkedAt:now.toISOString(),target:{links:100,unit:'article_or_video_links',basis:'publication_day',ranking:'none'},counts:{links:articles.length,shortfall:Math.max(0,100-articles.length),publishers:new Set(articles.map(a=>a.publisherGroup)).size,languages:[...new Set(articles.map(a=>a.language))].sort(),fullTextAnalyses:0,transcriptAnalyses:0},analysisStatus:'metadata_only',articles,limitations:'Selected permitted feeds only. Links are not distinct stories or completed reviews. No daily minimum is guaranteed. No video transcript intake is enabled. Day-only publisher dates are retained as supplied.'};
}
