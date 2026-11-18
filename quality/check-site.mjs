import{load}from'cheerio';import{readdir,readFile,stat}from'node:fs/promises';import{resolve,join,relative}from'node:path';import{pathToFileURL}from'node:url';
async function files(folder){const out=[];for(const entry of await readdir(folder,{withFileTypes:true})){if(entry.name.startsWith('.')||['automation','quality','node_modules','ops'].includes(entry.name))continue;const path=join(folder,entry.name);if(entry.isDirectory())out.push(...await files(path));else if(path.endsWith('.html'))out.push(path);}return out;}
export async function checkSite(folder,base='/india-news-project'){
 const root=resolve(folder),pages=await files(root),problems=[],cache=new Map();
 const document=async file=>{if(!cache.has(file))cache.set(file,load(await readFile(file,'utf8')));return cache.get(file);};
 for(const file of pages){const $=await document(file),page=relative(root,file);if(page==='index.html'||page.startsWith('news/fragment-'))continue;
  if(!$('h1').length)problems.push(page+': missing page heading');
  for(const node of $('a[href],link[rel=stylesheet][href],script[src],img[src]')){
   const value=$(node).attr(node.tagName==='script'||node.tagName==='img'?'src':'href');if(!value||value.startsWith('mailto:')||value.startsWith('tel:'))continue;
   const current=new URL(base+'/'+page.replace(/index\.html$/,''),'https://site.test');let url;try{url=new URL(value,current);}catch{problems.push(page+': invalid link');continue;}
   if(!['https:','http:'].includes(url.protocol)){problems.push(page+': unsupported link protocol');continue;}if(url.origin!==current.origin)continue;
   if(url.pathname!==base&&!url.pathname.startsWith(base+'/')){problems.push(page+': internal link escapes deployment base');continue;}
   let target=resolve(root,decodeURIComponent(url.pathname.slice(base.length)).replace(/^\//,''));if(!target.startsWith(root+'/')&&target!==root){problems.push(page+': link escapes site root');continue;}
   try{const info=await stat(target);if(info.isDirectory())target=join(target,'index.html');await stat(target);}catch{problems.push(page+': missing target '+url.pathname);continue;}
   if(url.hash&&target.endsWith('.html')){let id;try{id=decodeURIComponent(url.hash.slice(1));}catch{problems.push(page+': invalid anchor');continue;}
    // Private review identity hashes are application state, not document anchors.
    if(id.startsWith('review='))continue;const doc=await document(target);if(!doc('[id]').toArray().some(n=>doc(n).attr('id')===id))problems.push(page+': missing anchor '+id);
   }
  }
 }
 return{pages:pages.length,problems:[...new Set(problems)]};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){const result=await checkSite(process.argv[2]||'.');if(result.problems.length){for(const error of result.problems.slice(0,40))console.error(error);process.exitCode=1;}else console.log(`Internal links and anchors passed (${result.pages} HTML files).`);}
