(()=>{
const mounted=new WeakMap();
function mount(container=document){
 const root=container.matches?.('[data-news-feed]')?container:container.querySelector('[data-news-feed]');
 if(!root)return()=>{};if(mounted.has(root))return mounted.get(root);
 const hi=root.dataset.language==='hi', t=(en,hin)=>hi?hin:en;
 const items=[...root.querySelectorAll('[data-feed-item]')];
 const knownTopics=[...root.querySelectorAll('input[name=topic]')].map(x=>x.value);
 const knownRegions=[...root.querySelectorAll('[name=region] option')].map(x=>x.value);
 const knownLanguages=[...root.querySelectorAll('[name=language] option')].map(x=>x.value);
 const ids=new Set(items.map(x=>x.dataset.feedItem));
 const key='india-news-feed-v1';let storage=true, topics=[],region='',language='',saved=[];
 try{const data=JSON.parse(localStorage.getItem(key)||'{}');topics=Array.isArray(data.topics)?data.topics.filter(x=>knownTopics.includes(x)):[];region=knownRegions.includes(data.region)?data.region:'';language=knownLanguages.includes(data.language)?data.language:'';saved=Array.isArray(data.saved)?data.saved.filter(x=>ids.has(x)):[];}catch{storage=false;}
 const views={top:[t('News, in perspective.','खबरें, पूरे संदर्भ में।'),t('Indian reporting. Different perspectives. Sources you can inspect.','भारतीय रिपोर्टिंग, अलग नज़रिए और जाँचने योग्य स्रोत।')],'for-you':[t('For you','आपके लिए'),t('Research comparisons shaped by the interests you choose.','आपकी चुनी रुचियों के अनुसार शोध तुलनाएँ।')],regional:[t('Regions','क्षेत्र'),t('Chapters that draw on regional reporting in this collection.','इस संग्रह में क्षेत्रीय रिपोर्टिंग पर आधारित अध्याय।')],'coverage-gaps':[t('Coverage Gaps','कवरेज में अंतर'),t('See what the available evidence can and cannot tell us.','देखें कि उपलब्ध सबूत क्या बता सकते हैं और क्या नहीं।')],saved:[t('Saved','सहेजे गए'),t('Your bookmarked research chapters.','आपके सहेजे शोध अध्याय।')]};
 let view=new URL(location.href).searchParams.get('view')||'top';if(view==='blindspots')view='coverage-gaps';if(!Object.hasOwn(views,view))view='top';
 function persist(){try{localStorage.setItem(key,JSON.stringify({topics,region,language,saved}));storage=true;}catch{storage=false;}}
 let previousView='';
 function render(updateURL=false){
  const research=root.querySelector('[data-feed-research-shell]');if(research&&previousView!==view){research.open=view!=='top';previousView=view;}
  for(const section of root.querySelectorAll('[data-feed-top-only]'))section.hidden=view!=='top';const daily=root.querySelector('[data-daily-container]');if(daily)daily.hidden=view!=='top';const focus=root.querySelector('[data-daily-focus]');if(focus)focus.hidden=view!=='top';
  let count=0;const isFiltered=['for-you','regional'].includes(view);
  for(const item of items){const data=item.dataset,ts=data.topics.split(' '),rs=data.regions.split(' ').filter(Boolean),ls=data.languages.split(' ');
   const matched=view==='saved'?saved.includes(data.feedItem):view==='coverage-gaps'?false:!isFiltered?true:
    (!topics.length||ts.some(topic=>topics.includes(topic)))&&(!region||rs.includes(region))&&(!language||ls.includes(language))&&(view!=='regional'||rs.length>0);
   item.hidden=!matched;if(matched)count++;
   const button=item.querySelector('[data-save-chapter]');const selected=saved.includes(data.feedItem);button.setAttribute('aria-pressed',String(selected));button.querySelector('[data-save-label]').textContent=selected?t('Saved','सहेजा गया'):t('Save','सहेजें');
  }
  root.querySelector('[data-feed-heading]').textContent=views[view][0];root.querySelector('[data-feed-intro]').textContent=views[view][1];
  for(const link of root.querySelectorAll('[data-feed-view]')){if(link.dataset.feedView===view)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');}
  root.querySelector('[data-saved-count]').textContent=String(saved.length);
  root.querySelector('[data-feed-blindspots]').hidden=view!=='coverage-gaps'&&view!=='top';
  root.querySelector('[data-feed-empty]').hidden=count>0||view==='coverage-gaps';
  root.querySelector('[data-empty-heading]').textContent=view==='saved'?t('Your reading list is empty','आपकी पढ़ने की सूची खाली है'):t('No matching chapters yet','अभी कोई मिलता अध्याय नहीं');
  root.querySelector('[data-empty-copy]').textContent=view==='saved'?t('Save a chapter using its bookmark button. It will be kept in this browser.','अध्याय के सहेजें बटन से उसे जोड़ें। यह इसी ब्राउज़र में रहेगा।'):t('Try fewer filters or inspect the full research register. We do not have matching material for every region and language.','कम फ़िल्टर चुनें या पूरा शोध संग्रह देखें। हर क्षेत्र और भाषा की मिलती सामग्री अभी उपलब्ध नहीं है।');
  root.querySelector('[data-feed-status]').textContent=view==='coverage-gaps'?t('See the monitored comparisons below.','नीचे निगरानी की तुलनाएँ देखें।'):`${count} ${t('research comparisons','शोध तुलनाएँ')}`+(view==='for-you'&&!topics.length&&!region&&!language?t(' · Choose your interests or follow a topic.',' · अपनी रुचियाँ चुनें या विषय फॉलो करें।'):'');
  const prefs=root.querySelector('[data-feed-preferences]');prefs.hidden=!isFiltered;
  if(isFiltered&&!topics.length&&!region&&!language)prefs.open=true;
  for(const input of root.querySelectorAll('input[name=topic]'))input.checked=topics.includes(input.value);
  root.querySelector('[name=region]').value=region;root.querySelector('[name=language]').value=language;
  for(const button of root.querySelectorAll('[data-follow-topic]')){const followed=topics.includes(button.dataset.followTopic);button.setAttribute('aria-pressed',String(followed));if(button.querySelector('[data-follow-label]'))button.querySelector('[data-follow-label]').textContent=followed?t('Following','फॉलो कर रहे हैं'):t('Follow','फॉलो करें');}
  root.querySelector('[data-feed-storage-note]').textContent=storage?t('Interests and saved chapters stay in this browser. No account or reading-history tracking.','रुचियाँ और सहेजे अध्याय इसी ब्राउज़र में रहते हैं। कोई खाता या पढ़ने के इतिहास की ट्रैकिंग नहीं।'):t('Browser storage is unavailable. Your choices work for this visit but will not be saved.','ब्राउज़र स्टोरेज उपलब्ध नहीं। विकल्प इस बार काम करेंगे, पर सहेजे नहीं जाएँगे।');
  if(updateURL){const url=new URL(location.href);if(view==='top')url.searchParams.delete('view');else url.searchParams.set('view',view);history.replaceState(history.state,'',url);window.dispatchEvent(new Event('inp-location-change'));}
  const other=document.querySelector('.lang-switch');if(other){const url=new URL(other.href,location.href);if(view==='top')url.searchParams.delete('view');else url.searchParams.set('view',view);other.href=url.href;}
 }
 function click(event){const target=event.target.closest('button,a');if(!target||!root.contains(target))return;
  if(target.dataset.feedView){event.preventDefault();view=target.dataset.feedView;render(true);}
  else if(target.dataset.sourceBreakdown){const details=document.getElementById(target.dataset.sourceBreakdown);if(details&&root.contains(details)){details.open=!details.open;target.setAttribute('aria-expanded',String(details.open));}}
  else if(target.dataset.followTopic){const shortcut=target.closest('.feed-topic-shortcuts');const topic=target.dataset.followTopic;topics=topics.includes(topic)?topics.filter(x=>x!==topic):[...topics,topic];view='for-you';persist();render(true);if(shortcut)root.querySelector('[data-feed-heading]').focus({preventScroll:true});}
  else if(target.dataset.saveChapter){const id=target.dataset.saveChapter;saved=saved.includes(id)?saved.filter(x=>x!==id):[...saved,id];persist();render();if(view==='saved'&&!saved.includes(id))(root.querySelector('[data-feed-item]:not([hidden]) [data-save-chapter]')||root.querySelector('[data-feed-show-all]')).focus();}
  else if(target.hasAttribute('data-reset-interests')){topics=[];region='';language='';persist();render(true);}
  else if(target.hasAttribute('data-feed-show-all')){view='top';render(true);}
 }
 function submit(event){if(!event.target.matches('[data-feed-preferences-form]'))return;event.preventDefault();const data=new FormData(event.target);topics=data.getAll('topic').filter(x=>knownTopics.includes(x));region=data.get('region')||'';language=data.get('language')||'';if(view!=='regional')view='for-you';persist();root.querySelector('[data-feed-preferences]').open=false;render(true);root.querySelector('[data-feed-heading]').focus({preventScroll:true});root.querySelector('[data-feed-heading]').scrollIntoView({block:'nearest'});}
 function pop(){let next=new URL(location.href).searchParams.get('view')||'top';if(next==='blindspots')next='coverage-gaps';view=Object.hasOwn(views,next)?next:'top';render();}
 function toggle(event){const details=event.target;if(!details.matches?.('.feed-references[id]'))return;const button=root.querySelector(`[data-source-breakdown="${details.id}"]`);button?.setAttribute('aria-expanded',String(details.open));}
 root.addEventListener('toggle',toggle,true);
 root.addEventListener('click',click);root.addEventListener('submit',submit);addEventListener('popstate',pop);render();
 root.dataset.feedReady='true';
 const dailyContainer=root.querySelector('[data-daily-container]');let disposed=false;
 if(dailyContainer?.dataset.refreshUrl){const endpoint=new URL(dailyContainer.dataset.refreshUrl,location.href);if(endpoint.origin===location.origin)fetch(endpoint,{signal:AbortSignal.timeout(10000)}).then(async response=>{if(!response.ok)return;const html=await response.text();if(disposed||html.length>100000)return;const doc=new DOMParser().parseFromString(html,'text/html');const section=doc.querySelector('section#daily-news[data-daily-news]');if(!section||doc.querySelector('script'))return;const current=dailyContainer.querySelector('[data-collected-at]')?.dataset.collectedAt;if(current&&Date.parse(section.dataset.collectedAt)<Date.parse(current))return;dailyContainer.innerHTML=section.outerHTML;render();}).catch(()=>{});}

 const cleanup=()=>{disposed=true;delete root.dataset.feedReady;root.removeEventListener('click',click);root.removeEventListener('toggle',toggle,true);root.removeEventListener('submit',submit);removeEventListener('popstate',pop);mounted.delete(root);};mounted.set(root,cleanup);return cleanup;
}
window.mountIndiaNewsFeed=mount;mount();
})();
