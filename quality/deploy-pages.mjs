/** Deploy the current run's checked Pages artifact through GitHub's REST API.
 * The Pages action's job-scoped artifact SDK can report zero while REST sees it.
 * https://docs.github.com/en/rest/pages/pages#create-a-github-pages-deployment
 */
export async function deployPages({github,context,core,delay=ms=>new Promise(resolve=>setTimeout(resolve,ms)),polls=120}){
 const repo=context.repo;let artifact;
 for(let attempt=0;attempt<15;attempt++){
  const all=await github.paginate(github.rest.actions.listWorkflowRunArtifacts,{...repo,run_id:context.runId,per_page:100});
  const matches=all.filter(a=>a.name==='github-pages'&&!a.expired);
  if(matches.length>1)throw Error('Expected exactly one Pages artifact; duplicate artifacts require a clean workflow run.');
  if(matches.length===1){artifact=matches[0];break;}await delay(3000);
 }
 if(!artifact||!Number.isSafeInteger(artifact.id)||artifact.id<=0||!Number.isSafeInteger(artifact.size_in_bytes)||artifact.size_in_bytes<=0)throw Error('No valid Pages artifact for this workflow run.');
 if(artifact.workflow_run?.id&&artifact.workflow_run.id!==context.runId)throw Error('Pages artifact belongs to a different workflow run.');
 const token=await core.getIDToken();core.setSecret(token);
 const {data:deployment}=await github.request('POST /repos/{owner}/{repo}/pages/deployments',{...repo,artifact_id:artifact.id,pages_build_version:context.sha,oidc_token:token});
 if(!deployment.id)throw Error('GitHub did not return a Pages deployment ID.');
 core.info(`Created Pages deployment ${deployment.id} from artifact ${artifact.id}.`);
 const endpoint={...repo,deployment_id:deployment.id};
 for(let attempt=0;attempt<polls;attempt++){
  const {data}=await github.request('GET /repos/{owner}/{repo}/pages/deployments/{deployment_id}',endpoint);
  if(data.status==='succeed'){core.setOutput('page_url',deployment.page_url);return{deploymentId:deployment.id,artifactId:artifact.id,pageUrl:deployment.page_url};}
  if(['deployment_failed','deployment_content_failed','deployment_cancelled','deployment_lost'].includes(data.status))throw Error(`Pages deployment ended with ${data.status}.`);
  await delay(5000);
 }
 await github.request('POST /repos/{owner}/{repo}/pages/deployments/{deployment_id}/cancel',endpoint);
 throw Error('Pages deployment timed out and was cancelled.');
}
