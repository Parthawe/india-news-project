import{test}from'node:test';import assert from'node:assert/strict';import{mkdtemp,mkdir,writeFile,rm}from'node:fs/promises';import{tmpdir}from'node:os';import{join}from'node:path';import{inspectFile}from'../hygiene.mjs';import{checkSite}from'../check-site.mjs';
test('credentials, private links and reference fonts cannot be tracked',()=>{
 assert.equal(inspectFile('.env.local',Buffer.from('placeholder')).length,1);
 assert.equal(inspectFile('public/fonts/economist-serif-roman.woff2',Buffer.from('font')).length,1);
 assert.equal(inspectFile('record.json',Buffer.from(JSON.stringify({token:'a'.repeat(64)}))).length,1);
 assert.equal(inspectFile('.env.example',Buffer.from('OPENAI_API_KEY=')).length,0);
});
test('delivery checks reject missing internal pages and broken evidence anchors',async()=>{
 const root=await mkdtemp(join(tmpdir(),'india-news-quality-'));try{await mkdir(join(root,'en'));await writeFile(join(root,'en/index.html'),'<h1>Test</h1><a href="/india-news-project/en/#missing">Source</a><a href="/india-news-project/no-page/">Missing</a>');let result=await checkSite(root);assert.equal(result.problems.length,2);await writeFile(join(root,'en/index.html'),'<h1 id="evidence">Test</h1><a href="#evidence">Source</a>');result=await checkSite(root);assert.equal(result.problems.length,0);}finally{await rm(root,{recursive:true,force:true});}
});

test('delivery validates responsive image candidates, not only the fallback image',async()=>{const root=await mkdtemp(join(tmpdir(),'inp-image-quality-'));try{await mkdir(join(root,'en'));await writeFile(join(root,'en/index.html'),'<h1>Image fixture</h1><img srcset="/india-news-project/missing.webp 480w" alt="Fixture">');assert.equal((await checkSite(root)).problems.length,1);await writeFile(join(root,'missing.webp'),'Fixture');assert.equal((await checkSite(root)).problems.length,0);}finally{await rm(root,{recursive:true,force:true})}});
