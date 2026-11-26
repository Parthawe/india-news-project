// Counts describe link provenance, not political leaning, factuality or independent events.
export function sampleScope(records){
 const groups=new Map();let official=0,reporting=0,unclassified=0;
 for(const a of records){if(a.kind==='official')official++;else if(a.kind==='reporting')reporting++;else unclassified++;if(a.publisherGroup)groups.set(a.publisherGroup,(groups.get(a.publisherGroup)||0)+1);}
 const largest=[...groups].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]))[0];
 return{links:records.length,official,reporting,unclassified,publisherGroups:groups.size,largest:largest?{id:largest[0],links:largest[1],percent:Math.round(largest[1]*100/records.length)}:null};
}

export const publisherGroupLabel=id=>({pib:'PIB',idr:'India Development Review',mongabay:'Mongabay',globalvoices:'Global Voices'}[id]||id);
