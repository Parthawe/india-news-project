// Collection history is separate from an article's publication date. A backfill
// cannot establish that we monitored a newsroom before it was first collected.
export function coverageObservation(previous,current,now=new Date()){
 const at=now.toISOString(),success=['ok','not_modified'].includes(current.status);
 const last=Date.parse(previous?.lastSuccessAt||''),since=Date.parse(previous?.continuousFrom||'');
 const previousContinuous=previous?.coverageStatus==='continuous'&&['ok','not_modified'].includes(previous.status)&&Number.isFinite(last)&&last<=+now&&+now-last<=2*3600000&&Number.isFinite(since)&&since<=last;
 const oldest=Date.parse(current.oldestPublishedAt||'');
 const horizonGap=current.status!=='not_modified'&&Number.isFinite(last)&&Number.isFinite(oldest)&&oldest>last;
 const reason=!success?'feed_unavailable':current.excluded>0?'metadata_excluded':current.status==='ok'&&!current.accepted?'empty_feed':horizonGap?'feed_horizon_gap':null;
 return{monitoringStartedAt:previous?.monitoringStartedAt||at,coverageStatus:reason?'incomplete':'continuous',continuousFrom:reason?null:previousContinuous?previous.continuousFrom:at,coverageReason:reason};
}
