(()=>{
 if(window.INPTheme)return;
 const key='inp-theme-v1',root=document.documentElement,media=window.matchMedia('(prefers-color-scheme: dark)');
 const valid=value=>['light','dark','system'].includes(value);let choice='system',unsaved=false;
 try{const stored=localStorage.getItem(key);if(valid(stored))choice=stored;}catch{}
 function sync(){for(const select of document.querySelectorAll('[data-theme-select]'))select.value=choice;for(const status of document.querySelectorAll('[data-theme-status]'))status.textContent=unsaved?(root.lang==='hi'?'इस डिवाइस पर सेटिंग सेव नहीं हुई।':'Preference could not be saved on this device.'):'';}
 function apply(){root.dataset.theme=choice==='system'?(media.matches?'dark':'light'):choice;root.dataset.themeChoice=choice;root.dataset.themeReady='true';sync();window.dispatchEvent(new Event('inp-theme-change'));}
 function setChoice(value){if(!valid(value))return;choice=value;unsaved=false;try{localStorage.setItem(key,value);}catch{unsaved=true;}apply();}
 window.INPTheme={get choice(){return choice;},setChoice,sync};
 apply();document.addEventListener('change',event=>{if(event.target.matches?.('[data-theme-select]'))setChoice(event.target.value);});
 media.addEventListener('change',()=>{if(choice==='system')apply();});window.addEventListener('storage',event=>{if(event.key!==key&&event.key!==null)return;choice=valid(event.newValue)?event.newValue:'system';unsaved=false;apply();});window.addEventListener('inp-theme-controls',sync);
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',sync,{once:true});else sync();
})();
