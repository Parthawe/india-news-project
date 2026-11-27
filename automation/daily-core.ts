import{renderNewsLabels}from'./news-labels.mjs';
import {illustrationHTML} from "./illustrations.mjs";
export interface DailyItem { id:string; title:string; url:string; publisher:string; language:string; publishedDate:string; publishedDateText:string; collectedAt:string; sourceFeed:string; ministry:string }
export interface DailyEdition { version:1; date:string; collectedAt:string; target:5; status:"complete"|"partial"|"unavailable"; items:DailyItem[]; feeds:{url:string;status:string;accepted:number}[] }
export const indiaDate=(date=new Date())=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
export function canonicalRelease(value:string){const u=new URL(value);if(u.protocol!=='https:'||!['pib.gov.in','www.pib.gov.in'].includes(u.hostname)||u.username||u.password||u.port)throw Error('Unapproved source URL');const id=u.searchParams.get('PRID');if(!/^\d{5,10}$/.test(id||''))throw Error('Invalid release');return{key:'pib-'+id,url:'https://www.pib.gov.in/PressReleasePage.aspx?PRID='+id};}
export function publisherDate(text:string){const m=text.match(/\b(\d{1,2})\s+(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s+(20\d{2})\b/i);if(!m)return null;const month=['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'].indexOf(m[2].toUpperCase())+1;const iso=`${m[3]}-${String(month).padStart(2,'0')}-${m[1].padStart(2,'0')}`;const parsed=new Date(iso+'T12:00:00Z');return Number.isFinite(parsed.getTime())&&parsed.toISOString().slice(0,10)===iso?iso:null;}
export function validDate(value:unknown):value is string {
 if(typeof value!=='string'||!/^20\d{2}-\d{2}-\d{2}$/.test(value))return false;
 const parsed=new Date(value+'T12:00:00Z');
 return Number.isFinite(parsed.getTime())&&parsed.toISOString().slice(0,10)===value;
}
export function validItem(value:unknown):value is DailyItem {
 if(!value||typeof value!=='object')return false;
 const x=value as DailyItem;
 try{return typeof x.title==='string'&&x.title.trim().length>=10&&x.title.length<=600&&validDate(x.publishedDate)&&canonicalRelease(x.url).key===x.id&&x.publisher==='Press Information Bureau'&&['en','hi','mr'].includes(x.language)&&typeof x.ministry==='string'&&x.ministry.length<=250&&typeof x.publishedDateText==='string'&&publisherDate(x.publishedDateText)===x.publishedDate&&typeof x.collectedAt==='string'&&Number.isFinite(Date.parse(x.collectedAt))&&typeof x.sourceFeed==='string'&&new URL(x.sourceFeed).hostname==='www.pib.gov.in';}catch{return false;}
}
export function validEdition(value:unknown):value is DailyEdition {
 if(!value||typeof value!=='object')return false;
 const x=value as DailyEdition;
 return x.version===1&&validDate(x.date)&&typeof x.collectedAt==='string'&&Number.isFinite(Date.parse(x.collectedAt))&&x.target===5&&Array.isArray(x.items)&&x.items.length<=5&&x.items.every(validItem)&&new Set(x.items.map(i=>i.id)).size===x.items.length&&x.status===(x.items.length===5?'complete':x.items.length?'partial':'unavailable')&&Array.isArray(x.feeds)&&x.feeds.every(f=>typeof f.url==='string'&&typeof f.status==='string'&&Number.isInteger(f.accepted)&&f.accepted>=0);
}
export function selectDaily(candidates:DailyItem[],existing:DailyItem[],day:string,seen:Set<string>) {
 if(!validDate(day))throw Error('Invalid edition date');
 const cutoff=new Date(day+'T12:00:00Z');cutoff.setUTCDate(cutoff.getUTCDate()-2);const oldest=cutoff.toISOString().slice(0,10);
 const chosen:DailyItem[]=[],ids=new Set<string>(),titles=new Set<string>();
 const add=(item:DailyItem,isExisting:boolean)=>{
  if(chosen.length===5||!validItem(item)||item.publishedDate<oldest||item.publishedDate>day||ids.has(item.id)||(!isExisting&&seen.has(item.id)))return;
  const title=item.title.toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
  if(titles.has(title))return;
  chosen.push(item);ids.add(item.id);titles.add(title);
 };
 existing.forEach(item=>add(item,true));candidates.forEach(item=>add(item,false));return chosen;
}
const escape=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export function renderDaily(edition:DailyEdition,lang:'en'|'hi',base=''){const t=(en:string,hi:string)=>lang==='hi'?hi:en;const items=edition.items.filter(validItem).slice(0,5);return `<section id="daily-news" data-daily-news data-edition-date="${escape(edition.date)}" data-collected-at="${escape(edition.collectedAt)}" aria-label="${t('Daily official updates','रोज़ के आधिकारिक अपडेट')}"><div class="daily-news-heading"><h2>${t('Five daily updates','रोज़ के पाँच अपडेट')}</h2><span>${escape(edition.date)} · ${items.length}/5</span></div><p class="daily-news-note">${t('Automatically collected government releases from PIB. Publisher headlines are reproduced with attribution; claims have not been independently verified. This is one official source, not a multi-outlet comparison.','PIB की सरकारी विज्ञप्तियाँ अपने आप एकत्र होती हैं। शीर्षक स्रोत के श्रेय के साथ हैं; दावों की स्वतंत्र जाँच नहीं हुई है। यह एक आधिकारिक स्रोत है, कई प्रकाशकों की तुलना नहीं।')}</p>${items.length<5?`<p class="daily-news-status">${t('Fewer than five eligible new releases were available. The next scheduled run will retry; no items are invented to fill the list.','पाँच से कम योग्य नई विज्ञप्तियाँ मिलीं। अगला निर्धारित रन फिर कोशिश करेगा; सूची भरने के लिए खबरें नहीं बनाई जातीं।')}</p>`:''}<ol>${items.map(item=>`<li>${illustrationHTML({id:item.id,title:item.title},lang,base,true)}<a href="${escape(item.url)}" target="_blank" rel="noreferrer" lang="${item.language}">${escape(item.title)}</a><p>${escape(item.publisher)} · ${t('Official release','आधिकारिक विज्ञप्ति')} · <time datetime="${item.publishedDate}">${item.publishedDate}</time> · ${item.language==='hi'?'हिन्दी':item.language==='mr'?'मराठी':'English'}</p>${renderNewsLabels({publisher:item.publisher,publisherGroup:'pib',kind:'official'},lang,base)}${item.ministry?`<p>${escape(item.ministry)}</p>`:''}</li>`).join('')}</ol><p class="daily-news-note">${t('Selection date','चयन की तारीख')}: ${escape(edition.date)}. ${t('Original headlines retain their source language. No political ratings or AI summaries are generated by this job.','मूल शीर्षक स्रोत की भाषा में रहते हैं। यह जॉब राजनीतिक रेटिंग या एआई सारांश नहीं बनाती।')}</p><span id="daily-news-end" hidden></span></section>`;}
