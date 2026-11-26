import{load}from'cheerio';import{canonicalRelease}from'./daily-core.ts';
export function regionalReleaseLinks(html,source){
 if(source.kind!=='official'||source.format!=='pib_html')throw Error('Unapproved regional page');
 const $=load(html),seen=new Set();return $('.content-area a[href*="PRID="]').map((i,e)=>{
  try{const link=canonicalRelease(new URL(e.attribs.href,source.url).href).url,title=($(e).attr('title')||$(e).text()).replace(/\s+/g,' ').trim();if(seen.has(link)||title.length<8)return null;seen.add(link);return{link,title};}catch{return null}
 }).get().slice(0,60);
}
