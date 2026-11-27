import {createHash} from 'node:crypto';
import {assessEligibility}from'./source-assessment.mjs';
export const blindspotPolicy={version:'inp-monitored-coverage-v3',windowDays:7,maximumSnapshotAgeHours:2,minimumCohort:3,minimumCoveringPublishers:3,underrepresentedRate:.2,otherRate:.6,minimumRateDifference:.4};
const day=t=>new Date(t).toLocaleDateString('en-CA',{timeZone:'Asia/Kolkata'});
const norm=s=>String(s).normalize('NFKC').toLocaleLowerCase('en-IN').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
export function eventDigest(event){const {review,...material}=event;return createHash('sha256').update(JSON.stringify(material)).digest('hex');}
export function evaluateBlindspots(index,registry,events,sources,now=new Date()){
 const checked=Date.parse(index?.checkedAt),fresh=Number.isFinite(checked)&&checked<=now.getTime()+300000&&now.getTime()-checked<=blindspotPolicy.maximumSnapshotAgeHours*3600000;
 const today=day(now),start=day(now.getTime()-6*86400000);
 const archiveOK=index.corpusScope==='archived_captured_metadata'&&index.archiveRecovery?.status==='complete';
 const articles=index.articles.filter(a=>{if(!Number.isFinite(Date.parse(a.publishedAt)))return false;const approved=sources.find(s=>s.enabled&&s.id===a.sourceId&&s.publisherGroup===a.publisherGroup);if(!approved)return false;try{const u=new URL(a.url);if(u.protocol!=='https:'||u.username||u.password||u.port||!approved.hosts.includes(u.hostname))return false}catch{return false}const d=a.datePrecision==='day'?a.publishedAt.slice(0,10):day(a.publishedAt);return d>=start&&d<=today&&Date.parse(a.publishedAt)<=now.getTime()});
 const groups=[...new Set(sources.filter(s=>s.enabled).map(s=>s.publisherGroup))];
 const sample=groups.map(group=>{
  const feeds=sources.filter(s=>s.enabled&&s.publisherGroup===group),profile=registry.profiles.find(p=>p.publisherGroup===group),check=assessEligibility(profile,now),health=feeds.map(s=>index.feeds.find(f=>f.id===s.id));
  const healthy=health.every(f=>f&&['ok','not_modified'].includes(f.status)&&Number.isFinite(Date.parse(f.lastSuccessAt))&&Date.parse(f.lastSuccessAt)<=now.getTime()+300000&&now.getTime()-Date.parse(f.lastSuccessAt)<=2*3600000);
  const continuity=health.every(f=>f?.coverageStatus==='continuous'&&Number.isFinite(Date.parse(f.continuousFrom))&&Date.parse(f.continuousFrom)<=now.getTime())?new Date(Math.max(...health.map(f=>Date.parse(f.continuousFrom)))).toISOString():null;
  const official=feeds.every(s=>s.kind==='official'),scope=check.eligible&&feeds.every(s=>profile.assessment.appliesTo.includes(s.publisher));
  const observed=articles.filter(a=>a.publisherGroup===group).sort((a,b)=>a.publishedAt.localeCompare(b.publishedAt)),active=observed.length>0;
  return{publisherGroup:group,name:profile?.name||group,profileId:profile?.id||null,sourceIds:feeds.map(s=>s.id),languages:[...new Set(feeds.map(s=>s.language))],official,healthy,active,assessmentLeaning:scope&&!official?check.leaning:null,continuousFrom:continuity,newestPublishedAt:observed.at(-1)?.publishedAt||null,newestDatePrecision:observed.at(-1)?.datePrecision||'timestamp',capturedLinks:observed.length,eligible:fresh&&healthy&&active&&!official&&scope,leaning:fresh&&healthy&&active&&!official&&scope?check.leaning:null,reasons:[...(!fresh?['collection_stale']:[]),...(!healthy?['feed_unavailable']:[]),...(!active?['no_recent_observations']:[]),...(official?['official_communication']:[]),...check.reasons,...(check.eligible&&!scope?['edition_scope_not_established']:[])]};
 });
 const cohorts={left:0,centre:0,right:0};for(const p of sample)if(p.eligible)cohorts[p.leaning]++;
 const findings=[],evaluations=events.map(event=>{
  const urls=new Set(event.urls),observed=[...new Set(articles.filter(a=>urls.has(a.url)).map(a=>a.publisherGroup))],reasons=[];
  const earliest=Date.parse(event.firstOccurredAt||''),excludedForOpportunity=sample.filter(p=>p.eligible&&(!Number.isFinite(earliest)||Date.parse(p.newestPublishedAt)<earliest||(p.newestDatePrecision==='day'&&day(p.newestPublishedAt)===day(earliest)))).map(p=>p.publisherGroup);
  const excludedForMonitoring=sample.filter(p=>p.eligible&&(!p.continuousFrom||!Number.isFinite(earliest)||Date.parse(p.continuousFrom)>earliest)).map(p=>p.publisherGroup);
  const eventEligible=p=>p.eligible&&!excludedForOpportunity.includes(p.publisherGroup)&&!excludedForMonitoring.includes(p.publisherGroup);
  const counts={left:0,centre:0,right:0};for(const p of sample)if(eventEligible(p))counts[p.leaning]++;
  if(excludedForMonitoring.length&&(counts.left<blindspotPolicy.minimumCohort||counts.right<blindspotPolicy.minimumCohort))reasons.push('event_monitoring_incomplete');
  if(!fresh)reasons.push('collection_stale');if(!archiveOK)reasons.push('coverage_archive_incomplete');if(sample.some(s=>!s.healthy))reasons.push('feed_health_incomplete');
  if(counts.left<blindspotPolicy.minimumCohort||counts.right<blindspotPolicy.minimumCohort)reasons.push('classified_cohorts_insufficient');
  const review=event.review,reviewDate=Date.parse(review?.reviewedAt||'');
  if(event.editorialStatus!=='approved'||event.sameEventApproved!==true||!review?.reviewer?.trim()||!['ai_editorial','human_editorial'].includes(review.type)||(review.type==='ai_editorial'&&review.humanReviewed!==false)||(review.type==='human_editorial'&&review.humanReviewed!==true)||!Number.isFinite(reviewDate)||reviewDate>now.getTime()||reviewDate<checked-30*86400000||Date.parse(review?.expiresAt||'')<now.getTime()||!Number.isFinite(Date.parse(review?.expiresAt||''))||review.evidenceHash!==eventDigest(event))reasons.push('event_review_pending');
  if(event.wireReview!=='completed'||!event.originNotes?.en||!event.originNotes?.hi)reasons.push('wire_origin_review_pending');
  const matchers=event.matchers||[],unreviewedMatches=articles.filter(a=>!urls.has(a.url)&&!event.excludedUrls?.includes(a.url)&&matchers.some(terms=>terms.every(term=>norm(a.title).includes(norm(term))))).map(a=>({url:a.url,title:a.title,publisherGroup:a.publisherGroup}));
  if(!matchers.length||unreviewedMatches.length)reasons.push('unreviewed_event_matches');
  if(!event.comparison?.length||!event.urls.every(url=>event.comparison.some(c=>c.url===url)))reasons.push('comparison_evidence_incomplete');
  const coverage={left:0,centre:0,right:0};for(const p of sample)if(eventEligible(p)&&observed.includes(p.publisherGroup))coverage[p.leaning]++;
  const observedMix={left:0,centre:0,right:0,unassessed:0};for(const group of observed){const p=sample.find(p=>p.publisherGroup===group);observedMix[p?.assessmentLeaning||'unassessed']++;}
  const rates=Object.fromEntries(['left','centre','right'].map(k=>[k,counts[k]?coverage[k]/counts[k]:null]));
  if(Object.values(coverage).reduce((a,b)=>a+b,0)<blindspotPolicy.minimumCoveringPublishers)reasons.push('covering_publishers_insufficient');
  let finding=null;if(!reasons.length){for(const side of['left','right']){const other=side==='left'?'right':'left';if(rates[side]<=blindspotPolicy.underrepresentedRate&&rates[other]>=blindspotPolicy.otherRate&&rates[other]-rates[side]>=blindspotPolicy.minimumRateDifference){finding={eventId:event.id,underrepresentedCohort:side,coverage,denominators:counts,rates,scope:'Captured metadata only; source cadence, specialism and feed depth can affect the pattern. No claim of motive or whole-side silence.'};findings.push(finding);}}}
  return{id:event.id,title:event.title,path:event.path,summary:event.summary||null,comparison:event.comparison||[],originNotes:event.originNotes||null,review:event.review||null,observedPublisherGroups:observed,unobservedPublisherGroups:groups.filter(g=>!observed.includes(g)),excludedForOpportunity,excludedForMonitoring,observedMix,unreviewedMatches,unmonitoredReferenceUrls:event.urls.filter(url=>!articles.some(a=>a.url===url)),reasons,coverage,denominators:counts,rates,finding};
 });
 return{version:2,method:blindspotPolicy.version,checkedAt:now.toISOString(),collectionCheckedAt:index.checkedAt,windowStart:start,windowEnd:today,scope:'Archived captured metadata from selected feeds; not full publisher archives or all Indian media.',archiveComplete:archiveOK,capturedLinks:articles.length,sample,classified:sample.filter(s=>s.eligible).length,cohorts,evaluations,findings,status:findings.length?'findings':evaluations.some(e=>e.reasons.length)?'insufficient_evidence':'no_qualifying_imbalance'};
}
