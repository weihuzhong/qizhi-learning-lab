import {setTimeout as delay} from 'node:timers/promises';

export function createPptWake(runnerURL,{fetcher=fetch,pause=delay}={}){
 const origin=new URL(runnerURL).origin;
 let pending=null;
 let nextWake=0;

 async function notify(){
  // The proxy can serve a starting page instead of passing the wake POST through.
  for(const wait of [0,2000,5000]){
   if(wait)await pause(wait);
   try{
    const health=await fetcher(origin+'/health',{redirect:'error',signal:AbortSignal.timeout(75000)});
    if(!health.ok){await health.body?.cancel();continue;}
    const identity=await health.json();
    if(identity.engine!=='ppt-master'||identity.integrity!==true)continue;
    const wake=await fetcher(origin+'/v1/wake',{method:'POST',redirect:'error',signal:AbortSignal.timeout(15000)});
    if(wake.status===202&&(await wake.json()).accepted===true)return true;
    await wake.body?.cancel();
   }catch{
    // A later attempt can reach the runner once its cold start finishes.
   }
  }
  return false;
 }

 return ()=>{
  if(pending)return pending;
  const wait=nextWake-Date.now();
  pending=(wait>0?pause(wait).then(notify):notify()).then(accepted=>{
   if(!accepted)console.warn('PPTMaster did not acknowledge queue wake');
   nextWake=Date.now()+15000;
   return accepted;
  }).finally(()=>{pending=null;});
  return pending;
 };
}
