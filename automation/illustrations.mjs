import collection from './illustration-collection.json' with { type: 'json' };
export const illustrations = collection.items;
const byId = new Map(illustrations.map(item => [item.id, item]));
const rules = [
 ['ganga-cleaning', /ganga|gang[ae]s|गंगा/i], ['chandrayaan-3', /chandrayaan|moon|lunar|चंद्रयान/i],
 ['gujarat-budget', /gu-budget|gujarat.*budget|budget.*gujarat|ગુજરાત.*બજેટ/i], ['tamil-budget', /ta-budget|tamil.*budget|budget.*tamil|தமிழ.*பட்ஜெட்/i],
 ['kerala-floods', /kerala.*(?:rain|flood)|(?:rain|flood).*kerala|malappuram|alappuzha|aranmula/i], ['assam-floods', /assam.*flood|flood.*assam|en-assam|en-ne-rain|en-ne-air/i],
 ['telugu-rain', /paderu|te-rain|te-air-april|వర్ష/i], ['maharashtra-labour', /maharashtra|marathi|मराठी|महाराष्ट्र/i],
 ['health-budget', /health.*budget|budget.*health|hi-health|स्वास्थ्य.*बजट/i],
 ['budget-markets', /market|investor|बाज़ार|बाजार/i], ['budget-households', /middle.class|household|मध्यम वर्ग/i],
 ['air-pollution', /pollution|air quality|road.dust|delhi|प्रदूषण/i], ['heat', /extreme heat|heat|गर्मी/i], ['labour', /labour|labor|worker|श्रम|मज़दूर|मजदूर/i],
 ['privacy', /privacy|personal data|dpdp|गोपनीयता/i], ['statistics', /statistics|gdp|rebasing|सांख्यिकी|आँकड़/i],
 ['heat', /extreme heat|heat|गर्मी/i], ['elections', /election|ballot|चुनाव/i],
 ['agriculture', /agricultur|खेती|कृषि/i], ['farmers', /farmer|किसान/i], ['irrigation', /irrigation|सिंचाई/i],
 ['food-security', /food|grain|ration|खाद्य|अनाज/i], ['railways', /railway|रेलवे/i], ['aviation', /aviation|aircraft|विमान/i],
 ['roads', /road|highway|सड़क/i], ['transport', /transport|परिवहन/i], ['manufacturing', /manufactur|विनिर्माण/i],
 ['small-business', /msme|small business|उद्यम/i], ['trade', /trade|export|व्यापार|निर्यात/i],
 ['renewables', /solar|renewable|wind energy|नवीकरणीय/i], ['energy', /energy|power|ऊर्जा|बिजली/i],
 ['water', /water|जल|पानी/i], ['sanitation', /sanitation|स्वच्छता/i], ['examinations', /exam|परीक्षा/i],
 ['education', /education|school|शिक्षा|स्कूल/i], ['skills', /skill|training|कौशल|प्रशिक्षण/i],
 ['cybersecurity', /cyber|साइबर/i], ['connectivity', /telecom|digital infrastructure|broadband/i],
 ['judiciary', /court|justice|न्याय/i], ['parliament', /parliament|legislat|संसद/i],
 ['social-security', /social security|pension|सामाजिक सुरक्षा|पेंशन/i], ['women', /women|महिला/i],
 ['biodiversity', /biodiversity|wildlife|tiger|salamander|elephant|species|जैव|वन्य|बाघ|प्रजाति|বাঘ|জীববৈচিত্র/i], ['forests', /forest|जंगल/i],
 ['science', /isro|space|science|विज्ञान|अंतरिक्ष/i], ['floods', /flood|rain|बाढ़|बारिश/i],
 ['health', /health|hospital|स्वास्थ्य|अस्पताल/i], ['budgets', /budget|बजट/i],
 ['policy-review', /prs-|policy|governance|नीति/i],
];
export function illustrationFor(input = {}) {
 if (typeof input === 'string') input = { id: input };
 if (byId.has(input.id)) return byId.get(input.id);
 const text = [input.id || '', input.title || '', ...(input.topics || [])].join(' ');
 for (const [id, pattern] of rules) if (pattern.test(text)) return byId.get(id);
 return byId.get('year-in-review');
}
export function illustrationSrcSet(art,base=''){return [...(art.variants||[]),{path:art.path,width:1200}].map(v=>`${base}${v.path} ${v.width}w`).join(', ')}
export const illustrationSizes=compact=>compact?'auto, (max-width:480px) calc(100vw - 40px), 220px':'(max-width:700px) calc(100vw - 40px), (max-width:1100px) 70vw, 900px';
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function illustrationHTML(input, lang = 'en', base = '', compact = false) {
 const art = illustrationFor(input), hi = lang === 'hi';
 const alt = hi ? `${art.title.hi} पर कागज़ से बनी वैचारिक कलाकृति` : `Conceptual paper sculpture about ${art.title.en.toLowerCase()}`;
 const label = hi ? 'जनरेटिव मॉडल से बनाया चित्र। चित्रों की विधि पढ़ें।' : 'Illustration made with a generative model. Read about our illustrations.';
 return `<figure class="editorial-illustration${compact?' editorial-illustration--compact':''}" data-illustration="${escape(art.id)}"><img src="${base}${art.path}" srcset="${escape(illustrationSrcSet(art,base))}" sizes="${escape(illustrationSizes(compact))}" width="1200" height="600" loading="lazy" decoding="async" alt="${escape(alt)}"><a class="illustration-seal" href="${base}/${hi?'hi':'en'}/method/#illustrations" aria-label="${escape(label)}" title="${hi?'चित्र के बारे में':'About this illustration'}">INP</a></figure>`;
}
