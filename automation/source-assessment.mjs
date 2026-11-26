import {createHash} from 'node:crypto';
export const assessmentPolicy={version:'inp-source-assessment-v2',minimumArticles:12,minimumTopics:3,minimumAuthors:2,maximumAgeDays:180,maximumSampleAgeDays:180};
const canonical=value=>{try{const u=new URL(value);u.hash='';for(const k of [...u.searchParams.keys()])if(k.startsWith('utm_')||['gclid','fbclid'].includes(k))u.searchParams.delete(k);u.searchParams.sort();return u.href}catch{return ''}};
const https=value=>{try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&!u.port}catch{return false}};
const stable=value=>Array.isArray(value)?value.map(stable):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).filter(k=>value[k]!==undefined).sort().map(k=>[k,stable(value[k])])):value;
// Approval binds the actual assessment, sample, editions and supporting evidence.
// It is an integrity checksum, not a signature or a claim of independent review.
export function assessmentDigest(profile){const {approval,...assessment}=profile.assessment;return createHash('sha256').update(JSON.stringify(stable({id:profile.id,version:profile.version,aliases:profile.aliases,assessment,evidence:profile.evidence}))).digest('hex');}
export function assessEligibility(profile,now=new Date()){
 const a=profile?.assessment,reasons=[];const add=x=>{if(!reasons.includes(x))reasons.push(x)};
 if(!a||a.status!=='published'||!a.approval||profile?.review?.editorialStatus!=='approved')add('editorial_approval_pending');
 if(!a||!['left','centre','right'].includes(a.leaning))add('political_position_unassessed');
 if(a?.context!=='india'||a?.basis!=='india_reporting_sample')add('india_scope_not_established');
 if(a?.methodVersion!==assessmentPolicy.version)add('method_version_unrecognised');
 const evidence=new Set((profile?.evidence||[]).filter(e=>https(e.url)&&Number.isFinite(Date.parse(e.observedAt))&&Date.parse(e.observedAt)<=now.getTime()).map(e=>e.id));
 const evidenceMap=new Map((profile?.evidence||[]).map(e=>[e.id,e]));
 const sample=(a?.articleSample||[]).filter(s=>s.fullTextExamined===true&&s.reviewedText===true&&s.extractionStatus==='complete'&&s.note?.en?.trim()&&s.note?.hi?.trim()&&https(s.url)&&evidence.has(s.evidenceId)&&evidenceMap.get(s.evidenceId)?.type==='examined_article'&&canonical(evidenceMap.get(s.evidenceId)?.url)===canonical(s.url)&&s.countryContext==='india'&&/^\d{4}-\d{2}-\d{2}$/.test(s.publishedDate)&&Date.parse(s.publishedDate)<=now.getTime()&&now.getTime()-Date.parse(s.publishedDate)<=assessmentPolicy.maximumSampleAgeDays*86400000&&s.author?.trim()&&s.topic?.trim()&&['news','opinion','analysis'].includes(s.genre)&&/^[a-f0-9]{64}$/.test(s.materialHash||''));
 if(!a?.rationale?.en?.trim()||!a?.rationale?.hi?.trim()||!a?.evidenceIds?.length||a.evidenceIds.some(id=>!evidence.has(id))||!a.evidenceIds.some(id=>evidenceMap.get(id)?.type==='examined_article'))add('assessment_rationale_unsupported');
 const unique=[...new Map(sample.map(s=>[canonical(s.url),s])).values()],bylines=new Set(unique.filter(s=>s.authorKnown!==false).map(s=>s.author));
 if(unique.length<assessmentPolicy.minimumArticles||new Set(unique.map(s=>s.topic)).size<assessmentPolicy.minimumTopics||bylines.size<assessmentPolicy.minimumAuthors)add('reporting_sample_insufficient');
 const q=a?.qualification;
 if(!q?.sampling?.en?.trim()||!q.sampling.hi?.trim()||!q?.limitations?.en?.trim()||!q.limitations.hi?.trim()||!q?.counterexamples?.length||q.counterexamples.some(c=>!sample.some(s=>s.evidenceId===c.evidenceId)||!c.note?.en?.trim()||!c.note?.hi?.trim())||!q?.axes?.length||q.axes.some(x=>!x.rationale?.en?.trim()||!x.rationale?.hi?.trim()||!x.evidenceIds?.length||x.evidenceIds.some(id=>!sample.some(s=>s.evidenceId===id))))add('qualitative_review_incomplete');
 if(!a?.appliesTo?.length||a.appliesTo.some(name=>!profile.aliases.includes(name)))add('edition_scope_not_established');
 const review=Date.parse(a?.approval?.reviewedAt||''),expiry=Date.parse(a?.approval?.expiresAt||'');
 if(!Number.isFinite(review)||review>now.getTime()||now.getTime()-review>assessmentPolicy.maximumAgeDays*86400000||!Number.isFinite(expiry)||expiry<=review||expiry<now.getTime())add('review_missing_or_stale');
 if(!a?.approval?.reviewer?.trim()||!https(a?.approval?.recordUrl)||!['human_editorial','ai_editorial'].includes(a?.approval?.type))add('review_record_missing');
 if(a?.approval?.type==='ai_editorial'&&a.approval.humanReviewed!==false)add('review_attribution_invalid');
 if(a?.approval?.type==='human_editorial'&&a.approval.humanReviewed!==true)add('review_attribution_invalid');
 if(!a?.approval?.assessmentHash||!a||a.approval.assessmentHash!==assessmentDigest(profile))add('review_content_changed');
 const reviewed=reasons.every(r=>r==='political_position_unassessed');
 return{eligible:!reasons.length,reviewed,leaning:reasons.length?null:a.leaning,reasons,sampleArticles:unique.length,sampleTopics:new Set(unique.map(s=>s.topic)).size,sampleAuthors:bylines.size};
}
export function outletAssessments(registry,now=new Date()){
 return registry.profiles.flatMap(p=>{const check=assessEligibility(p,now);if(!check.eligible)return[];return p.assessment.appliesTo.map(publisher=>({publisher,leaning:check.leaning,status:'published',version:p.version,reviewer:p.assessment.approval.reviewer,rationale:p.assessment.rationale.en,context:'india',reviewedAt:p.assessment.approval.reviewedAt,expiresAt:p.assessment.approval.expiresAt,evidence:p.evidence.map(e=>e.url)}))});
}
