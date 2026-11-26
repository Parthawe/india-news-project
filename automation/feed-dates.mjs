const hindiMonths=new Map([
 ['जनवरी',1],['फरवरी',2],['फ़रवरी',2],['मार्च',3],['अप्रैल',4],
 ['मई',5],['जून',6],['जुलाई',7],['अगस्त',8],['सितंबर',9],['सितम्बर',9],
 ['अक्टूबर',10],['नवंबर',11],['नवम्बर',11],['दिसंबर',12],['दिसम्बर',12],
].map(([name,month])=>[name.normalize('NFC'),month]));

// The localized form must supply a complete calendar date, time and offset.
// Never derive publication time from a URL, discovery time or modified date.
export function feedPublicationDate(value,language='en'){
 if(typeof value!=='string'||value.length>150)return null;
 const text=value.trim();
 if(!text)return null;
 const ordinary=Date.parse(text);
 if(Number.isFinite(ordinary))return new Date(ordinary).toISOString();
 if(language!=='hi')return null;
 const normalized=text.normalize('NFC').replace(/[०-९]/g,d=>String('०१२३४५६७८९'.indexOf(d)));
 const match=normalized.match(/^(\d{1,2})\s+([\p{L}\p{M}]+)\s+(\d{4})\s+(\d{2}):(\d{2}):(\d{2})\s+([+-])(\d{2}):?(\d{2})$/u);
 if(!match)return null;
 const[,dayText,monthText,yearText,hourText,minuteText,secondText,sign,offsetHourText,offsetMinuteText]=match;
 const day=Number(dayText),month=hindiMonths.get(monthText),year=Number(yearText),hour=Number(hourText),minute=Number(minuteText),second=Number(secondText),offsetHour=Number(offsetHourText),offsetMinute=Number(offsetMinuteText);
 if(!month||year<1000||day<1||day>31||hour>23||minute>59||second>59||offsetHour>14||offsetMinute>59||offsetHour===14&&offsetMinute!==0)return null;
 const local=new Date(Date.UTC(year,month-1,day,hour,minute,second));
 if(local.getUTCFullYear()!==year||local.getUTCMonth()!==month-1||local.getUTCDate()!==day)return null;
 const offset=(offsetHour*60+offsetMinute)*60000*(sign==='+'?1:-1);
 return new Date(local.getTime()-offset).toISOString();
}
