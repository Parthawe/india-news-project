import{test}from'node:test';import assert from'node:assert/strict';import{incidentFrom}from'../incident.mjs';
test('only actual main production failures generate sanitised incident records',()=>{
 const event={workflow_run:{name:'Daily news and Pages',head_branch:'main',repository:{full_name:'Parthawe/india-news-project'},id:123,conclusion:'failure',logs:'private article text',token:'do-not-copy'}};
 const record=incidentFrom(event,'Parthawe/india-news-project');assert.ok(record.body.includes('/actions/runs/123'));assert.ok(!JSON.stringify(record).includes('do-not-copy'));assert.ok(!JSON.stringify(record).includes('private article text'));
 assert.equal(incidentFrom({workflow_run:{...event.workflow_run,conclusion:'success'}},'Parthawe/india-news-project'),null);assert.equal(incidentFrom({workflow_run:{...event.workflow_run,head_branch:'feature'}},'Parthawe/india-news-project'),null);
});
