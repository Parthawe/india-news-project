import{sampleScope}from'../automation/sample-scope.mjs';
import{pathToFileURL}from'node:url';import{resolve}from'node:path';
export function collectionHealth(index,now=new Date()){
 const stamp=Date.parse(index?.checkedAt),age=now.getTime()-stamp;
 if(!Number.isFinite(stamp)||age< -300000)return{status:'fail',check:'collection',reason:'invalid_collection_timestamp'};
 if(age>12*3600000)return{status:'fail',check:'collection',reason:'collection_older_than_12_hours'};
 if(!Array.isArray(index.articles)||!index.articles.length||index.articles.length>500||!Array.isArray(index.feeds)||!index.feeds.length)return{status:'fail',check:'collection',reason:'invalid_or_empty_collection'};
 const failed=index.feeds.filter(f=>f.status==='failed').length,scope=sampleScope(index.articles),concentrated=Boolean(scope.largest&&scope.largest.percent>=80);
 return{status:failed===index.feeds.length?'fail':failed||concentrated?'warn':'pass',check:'collection',reason:failed?'source_failures':concentrated?'publisher_concentration':'fresh_metadata',sourceMix:scope,records:index.articles.length,failedFeeds:failed,checkedAt:index.checkedAt};
}
export async function checkReader(fetcher=fetch,now=new Date()){
 const root='https://parthawe.github.io/india-news-project',checks=[];
 async function read(url,json=false){const r=await fetcher(url,{signal:AbortSignal.timeout(12000),headers:{Accept:json?'application/json':'text/html'}});if(!r.ok)throw Error('http_'+r.status);if(!json){await r.body?.cancel();return null;}const text=await r.text();if(text.length>2500000)throw Error('response_limit');return JSON.parse(text)}
 for(const path of ['/en/','/hi/','/en/latest/','/en/chat/'])try{await read(root+path);checks.push({check:path,status:'pass'})}catch{checks.push({check:path,status:'fail',reason:'reader_page_unavailable'})}
 try{checks.push(collectionHealth(await read(root+'/news/latest-reporting.json',true),now))}catch{checks.push({check:'collection',status:'fail',reason:'metadata_unavailable'})}
 const previousDay=new Date(now.getTime()-86400000).toLocaleDateString('en-CA',{timeZone:'Asia/Kolkata'});
 try{const archive=await read(root+'/news/intake/'+previousDay+'.json',true),count=archive?.counts?.links;if(archive.date!==previousDay||!Number.isSafeInteger(count)||count<0)throw Error('invalid_archive');checks.push({check:'previous_india_day',status:count>=100?'pass':'warn',date:previousDay,links:count,shortfall:Math.max(0,100-count)})}catch{checks.push({check:'previous_india_day',status:'fail',reason:'daily_archive_unavailable',date:previousDay})}
 const queueExpected=process.env.NEWS_QUEUE_EXPECTED==='true';
 const queueFailure=reason=>({check:'analysis_queue',status:queueExpected?'fail':'warn',reason});
 try{const r=await fetcher('https://india-news-article-review.india-news-project.workers.dev/api/news/status',{signal:AbortSignal.timeout(10000)});if(r.status===404||r.status===503){await r.body?.cancel();checks.push(queueFailure('not_connected'));}else if(!r.ok){await r.body?.cancel();checks.push(queueFailure('status_http_error'));}else{const x=await r.json(),stamp=Date.parse(x.checkedAt),age=now.getTime()-stamp;if(!Number.isFinite(stamp)||age< -300000)checks.push(queueFailure('invalid_status_timestamp'));else if(age>=2*3600000)checks.push(queueFailure('status_older_than_2_hours'));else checks.push({check:'analysis_queue',status:'pass',reason:'fresh_status'});}}catch{checks.push(queueFailure('status_unavailable'))}

 return{checkedAt:now.toISOString(),status:checks.some(x=>x.status==='fail')?'fail':checks.some(x=>x.status==='warn')?'warn':'pass',checks,modelCalls:0};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){const result=await checkReader();console.log(JSON.stringify(result,null,2));for(const c of result.checks)if(c.status==='warn')console.log('::warning::'+c.check+': '+(c.reason||'daily target shortfall'));if(result.status==='fail')process.exitCode=1;}
