import{createHash}from'node:crypto';
import{relatedHeadlines}from'./story-index.mjs';
export const digest=value=>createHash('sha256').update(value).digest('hex');
export const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function allowedURL(value,source){const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password||u.port||!source.hosts.includes(u.hostname))throw Error('Unapproved source URL');u.hash='';u.searchParams.sort();for(const k of [...u.searchParams.keys()])if(k.startsWith('utm_')||['fbclid','gclid'].includes(k))u.searchParams.delete(k);return u.href;}
export function recordFrom(item,source,now=new Date(),previous){
 const url=allowedURL(item.link,source),title=String(item.title||'').replace(/\s+/g,' ').trim(),author=String(item.creator||item.author||'').replace(/\s+/g,' ').trim();
 const publishedAt=new Date(item.isoDate||item.pubDate||'');
 if(title.length<8||title.length>700||/[<>]/.test(title)||!Number.isFinite(publishedAt.getTime())||publishedAt>now||publishedAt.getTime()<now.getTime()-30*86400000)throw Error('Missing, future or stale publication metadata');
 if(source.kind==='reporting'&&!author)throw Error('Author required for attribution');
 const id='report-'+digest(source.publisherGroup+'|'+url).slice(0,24);
 return{id,url,title,author,sourceId:source.id,publisher:source.publisher,publisherGroup:source.publisherGroup,language:source.language,kind:source.kind,publishedAt:publishedAt.toISOString(),firstSeenAt:previous?.firstSeenAt||now.toISOString(),lastSeenAt:now.toISOString(),headlineSha256:digest(title),license:source.license,licenseUrl:source.licenseUrl||source.permissionUrl,permissionUrl:source.permissionUrl,datePrecision:item.datePrecision==='day'?'day':'timestamp',materialExamined:'feed_headline_and_publication_metadata',bodyRetrieved:false,reviewStatus:'unreviewed',sourceFeed:source.url};
}
export function validRecord(a,sources,now=new Date()){
 const s=sources.find(s=>s.enabled&&s.id===a?.sourceId);if(!s)return false;
 try{const expected=recordFrom({link:a.url,title:a.title,creator:a.author,isoDate:a.publishedAt,datePrecision:a.datePrecision},s,now);return a.id===expected.id&&a.headlineSha256===expected.headlineSha256&&a.language===s.language&&a.publisher===s.publisher&&a.publisherGroup===s.publisherGroup&&a.kind===s.kind&&a.sourceFeed===s.url&&a.license===s.license&&a.licenseUrl===(s.licenseUrl||s.permissionUrl)&&a.permissionUrl===s.permissionUrl&&a.bodyRetrieved===false&&a.reviewStatus==='unreviewed'&&a.materialExamined===expected.materialExamined&&['day','timestamp'].includes(a.datePrecision)&&Number.isFinite(Date.parse(a.firstSeenAt))&&Number.isFinite(Date.parse(a.lastSeenAt));}catch{return false;}
}
export function buildLatest(previous,incoming,feeds,sources,now=new Date()){
 const map=new Map();for(const a of [...(previous?.articles||[]),...incoming])if(validRecord(a,sources,now)){const source=sources.find(s=>s.id===a.sourceId);const clean=recordFrom({link:a.url,title:a.title,creator:a.author,isoDate:a.publishedAt,datePrecision:a.datePrecision},source,now,a);clean.lastSeenAt=a.lastSeenAt;map.set(a.id,clean);}
 const articles=[...map.values()].sort((a,b)=>b.publishedAt.localeCompare(a.publishedAt)||a.id.localeCompare(b.id)).slice(0,500);
 const recent=articles.filter(a=>Date.parse(a.publishedAt)>=now.getTime()-7*86400000).slice(0,150),used=new Set(),candidates=[];
 for(const a of recent){if(used.has(a.id))continue;const peers=[a];for(const b of recent){if(b===a||used.has(b.id)||b.language!==a.language)continue;if(peers.every(p=>relatedHeadlines({...p,publishedDate:p.publishedAt.slice(0,10)},{...b,publishedDate:b.publishedAt.slice(0,10)})))peers.push(b);}if(peers.length>1){peers.forEach(p=>used.add(p.id));candidates.push({id:'group-'+digest(peers.map(p=>p.id).sort().join('|')).slice(0,20),articleIds:peers.map(p=>p.id),publisherCount:new Set(peers.map(p=>p.publisherGroup)).size,status:'awaiting_editor',confirmedSameEvent:false,publicationAllowed:false});}}
 const successful=feeds.filter(f=>f.status==='ok'||f.status==='not_modified').length;
 return{version:1,checkedAt:now.toISOString(),status:successful===feeds.length?'ok':successful?'partial':'unavailable',scope:{retainedDays:30,maxArticles:500,matchingDays:7,sourceCount:sources.filter(s=>s.enabled).length,automaticStoryPublication:false},feeds,articles,candidates,counts:{articles:articles.length,publishers:new Set(articles.map(a=>a.publisherGroup)).size,languages:[...new Set(articles.map(a=>a.language))],suggestedGroups:candidates.length},limitations:'An attributed link index from selected feeds. No fact-checks, political ratings, full-text extraction or automatically approved stories.'};
}
export function validLatest(x,sources,now=new Date()){
 if(x?.version!==1||!['ok','partial','unavailable'].includes(x.status)||!Number.isFinite(Date.parse(x.checkedAt))||!Array.isArray(x.articles)||x.articles.length>500||!x.articles.every(a=>validRecord(a,sources,now))||new Set(x.articles.map(a=>a.id)).size!==x.articles.length||x.scope?.automaticStoryPublication!==false||x.scope.retainedDays!==30)return false;
 const ids=new Set(x.articles.map(a=>a.id));return Array.isArray(x.feeds)&&x.feeds.length===sources.filter(s=>s.enabled).length&&new Set(x.feeds.map(f=>f.id)).size===x.feeds.length&&x.feeds.every(f=>sources.some(s=>s.enabled&&s.id===f.id&&s.publisher===f.publisher&&s.language===f.language&&s.permissionUrl===f.permissionUrl)&&['ok','not_modified','failed'].includes(f.status))&&Array.isArray(x.candidates)&&x.candidates.every(c=>c.status==='awaiting_editor'&&c.confirmedSameEvent===false&&c.publicationAllowed===false&&Array.isArray(c.articleIds)&&c.articleIds.length>1&&c.articleIds.every(id=>ids.has(id)))&&x.counts?.articles===x.articles.length&&x.counts.publishers===new Set(x.articles.map(a=>a.publisherGroup)).size;
}
export {renderLatest} from './latest-render.mjs';
