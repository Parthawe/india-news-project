import {execFileSync}from'node:child_process';import{readFile}from'node:fs/promises';import{resolve}from'node:path';import{pathToFileURL}from'node:url';
export function inspectFile(name,content){
 const problems=[];
 if(/(^|\/)(?:\.env[^/]*|\.dev\.vars[^/]*)$/.test(name)&&!name.endsWith('.env.example'))problems.push('Environment file must not be tracked');
 if(/(^|\/)(?:\.data|\.wrangler|artifacts|\.codex-attachments)\//.test(name)||/\.(?:sqlite|sqlite3|db)$/.test(name))problems.push('Private runtime material must not be tracked');
 if(/public\/fonts\/economist-.*\.woff2$/.test(name))problems.push('Unlicensed reference font must not be tracked');
 const patterns=[['API credential',/(?:sk-(?:proj|or-v1)-|ghp_|github_pat_)[A-Za-z0-9_-]{20,}/],['Private capability link',/[?#&]key=[a-f0-9]{64}/i],['Stored private review credential',/"token"\s*:\s*"[a-f0-9]{64}"/i],['Private key',/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/]];
 const text=content.toString('utf8');for(const [label,pattern]of patterns)if(pattern.test(text))problems.push(label+' detected');
 return problems.map(problem=>({file:name,problem}));
}
export async function checkTracked(root=process.cwd()){
 const names=execFileSync('git',['ls-files','-z','--cached'],{cwd:root,encoding:'utf8'}).split('\0').filter(Boolean);const problems=[];
 for(const name of names){let data;try{data=await readFile(resolve(root,name));}catch(error){if(error.code==='ENOENT')continue;throw error;}problems.push(...inspectFile(name,data));}
 return{files:names.length,problems};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){const result=await checkTracked(process.argv[2]);if(result.problems.length){for(const item of result.problems)console.error(item.file+': '+item.problem);process.exitCode=1;}else console.log(`Tracked-file hygiene passed (${result.files} files).`);}
