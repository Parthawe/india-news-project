import profiles from './profile-links.json' with{type:'json'};
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const key=value=>String(value??'').trim().replace(/\s+/g,' ').toLocaleLowerCase('en-IN');
const current=(a,publisher,now)=>a&&a.publishers?.some(p=>key(p)===key(publisher))&&Number.isFinite(Date.parse(a.reviewedAt))&&Number.isFinite(Date.parse(a.expiresAt))&&Date.parse(a.reviewedAt)<=now&&Date.parse(a.expiresAt)>=now&&now-Date.parse(a.reviewedAt)<=180*86400000;
export function newsLabelInfo(item,now=Date.now(),catalogue=profiles){
 const profile=catalogue.find(p=>(!item.publisherGroup||p.group===item.publisherGroup)&&p.publishers?.some(p=>key(p)===key(item.publisher)));
 const official=item.kind==='official'||profile?.group==='pib';const a=profile?.assessment,review=profile?.review;
 const reviewed=!official&&current(review,item.publisher,now)&&['ai_editorial','human_editorial'].includes(review.type)&&review.humanReviewed===(review.type==='human_editorial');
 const assessed=reviewed&&current(a,item.publisher,now)&&review.outcome===a.leaning&&['left','centre','right'].includes(a.leaning);
 const leaning=official?'official':assessed?a.leaning:reviewed&&review.outcome==='issue-dependent'?'issue-dependent':'unassessed';
 return{leaning,official,reviewed:!!reviewed,review:reviewed?review:null,assessment:assessed?a:null,profilePath:profile&&/^\/sources\/[a-z0-9-]+$/.test(profile.path)?profile.path:null,publishers:1,material:['text','retrieved-text','partial','video-metadata'].includes(item.material)?item.material:'headline',framing:item.framing==='draft'?'draft':'unreviewed'};
}
// An ordinal category range, never a numerical bias score or coverage percentage.
export function renderLeaningRange(leaning,lang='en'){
 const names=lang==='hi'?['वाम','मध्य','दक्षिण']:['Left','Centre','Right'];
 const keys=['left','centre','right'];
 return `<span class="news-labels-axis${keys.includes(leaning)?' has-range':''}" data-leaning-range="${keys.includes(leaning)?leaning:'none'}" aria-hidden="true">${keys.map((k,i)=>`<span class="${k}${leaning===k?' is-active':''}"><span>${names[i]}</span></span>`).join('')}</span>`;
}
export function renderNewsLabels(item,lang='en',base='',now=Date.now()){
 const d=newsLabelInfo(item,now),t=(en,hi)=>lang==='hi'?hi:en,root=/^\/[a-z0-9-]+$/.test(base)?base:'',language=lang==='hi'?'hi':'en';
 const names={left:t('Left','वाम'),centre:t('Centre','मध्य'),right:t('Right','दक्षिण'),'issue-dependent':t('Issue-dependent','विषय-निर्भर'),unassessed:t('Unassessed','अनाकलित'),official:t('Official source','आधिकारिक स्रोत')};
 const position=d.assessment?t('Provisional ','अस्थायी ')+names[d.leaning]:names[d.leaning];
 const materials={headline:t('Headline only','केवल शीर्षक'),text:t('Text examined','पाठ जाँचा'),'retrieved-text':t('Text retrieved','पाठ प्राप्त'),partial:t('Partial material','आंशिक सामग्री'),'video-metadata':t('Video metadata','वीडियो मेटाडेटा')};
 const review=d.review;const status=d.official?t('Official communication stays outside political cohorts.','आधिकारिक संचार राजनीतिक समूहों से बाहर है।'):review?`${t(review.humanReviewed?'Human editorial review':'AI editorial review; not human-reviewed',review.humanReviewed?'मानव संपादकीय समीक्षा':'एआई संपादकीय समीक्षा; मानव समीक्षा नहीं')} · v${review.version} · ${escape(review.reviewedAt.slice(0,10))}`:t('No current, edition-matched political assessment is available.','इस संस्करण के लिए वर्तमान राजनीतिक आकलन उपलब्ध नहीं है।');
 return `<div class="news-labels" data-news-labels data-source-leaning="${d.leaning}" data-publisher="${escape(item.publisher)}" data-label-kind="${d.official?'official':'reporting'}" data-label-material="${d.material}" data-label-framing="${d.framing}"${d.review?` data-assessment-expires="${escape(d.review.expiresAt)}"`:''}><div class="news-labels-meta"><span>${materials[d.material]}</span><span>${t('1 captured publisher','1 संकलित प्रकाशक')}</span><span>${d.framing==='draft'?t('Framing: draft','प्रस्तुति: मसौदा'):t('Framing: unreviewed','प्रस्तुति: समीक्षा बाकी')}</span></div><details class="news-labels-detail"><summary><span class="news-labels-caption">${t('Publisher leaning','प्रकाशक का झुकाव')} <strong>${position}</strong></span>${renderLeaningRange(d.leaning,lang)}<svg class="news-labels-chevron" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" aria-hidden="true"><path d="m4 6 4 4 4-4"/></svg></summary><div class="news-labels-evidence"><p>${status}</p><p>${t('The highlighted band shows the assessed category. No finer numerical position is assigned.','रंगीन पट्टी आकलित श्रेणी दिखाती है। इससे अधिक बारीक संख्यात्मक स्थान तय नहीं किया गया है।')}</p><p>${t('This labels the publisher, not this article’s framing or accuracy. One captured publisher is not the total coverage of this event.','यह प्रकाशक का लेबल है, इस लेख की प्रस्तुति या सटीकता का नहीं। एक संकलित प्रकाशक इस घटना की कुल कवरेज नहीं है।')}</p>${review&&!d.assessment&&!d.official?`<p>${t('The sample review is complete, without an eligible Left/Centre/Right rating.','नमूने की समीक्षा पूरी है; वाम/मध्य/दक्षिण की योग्य रेटिंग नहीं है।')}</p>`:''}${d.profilePath?`<a href="${root}/${language}${d.profilePath}#political-assessment">${t('Assessment evidence & ownership','आकलन के सबूत और स्वामित्व')}</a>`:`<a href="${root}/${language}/sources">${t('Source assessment register','स्रोत आकलन सूची')}</a>`}<a href="${root}/${language}/method">${t('How labels work','लेबल की विधि')}</a></div></details></div>`;
}

// Static snapshots cannot keep an expired rating visible until the next collection.
export function expireNewsLabels(root,lang='en',base='',now=Date.now()){
 let changed=0;
 for(const node of root.querySelectorAll('[data-news-labels][data-assessment-expires]')){
  if(Date.parse(node.dataset.assessmentExpires)>=now)continue;
  const item={publisher:node.dataset.publisher,kind:node.dataset.labelKind,material:node.dataset.labelMaterial,framing:node.dataset.labelFraming};
  const row=node.closest('[data-latest-record]');if(row)row.dataset.sourceLeaning=newsLabelInfo(item,now).leaning;
  node.outerHTML=renderNewsLabels(item,lang,base,now);changed++;
 }
 if(changed)for(const latest of root.querySelectorAll('[data-latest-root]'))latest.dispatchEvent(new Event('input',{bubbles:true}));
 return changed;
}
