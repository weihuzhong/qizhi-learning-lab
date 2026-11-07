// Provider-specific options are server-only. Never take the provider URL from a visitor.
export function modelOptions(env,limit){
 const host=new URL(env.LLM_BASE_URL||'https://api.openai.com/v1').hostname;
 return host==='api.deepseek.com'
  ?{max_tokens:limit,thinking:{type:'disabled'}}
  :{max_completion_tokens:limit};
}
export async function modelError(response){
 let error={};try{error=(await response.json()).error||{}}catch{}
 const code=response.status===402?'insufficient_balance':String(error.code||error.type||'upstream_error');
 let message='模型服务返回异常（'+response.status+'），请检查个人模型配置或稍后重试。';
 if(response.status===402||['insufficient_quota','credit_balance_exhausted'].includes(code))message='你的DeepSeek API余额或额度不足，请前往自己的开放平台账户检查余额与限额；不会使用维护者额度。';
 else if(response.status===401||response.status===403)message='你的DeepSeek API密钥无效或无权访问，请在账号页重新绑定并测试。';
 else if(response.status===429)message='模型请求达到速率或并发限制，请稍后再试。';
 else if([400,404,422].includes(response.status))message='DeepSeek 未接受本次模型或请求参数（'+response.status+'），请联系维护者检查服务配置。';
 else if(response.status>=500)message='DeepSeek 服务暂时繁忙或不可用（'+response.status+'），已保存的内容可继续使用，请稍后重试。';
 return {error:message,code,upstream_status:response.status};
}

export async function modelFetch(url,options,timeout,fetcher=fetch){
 const signal=AbortSignal.timeout(timeout);
 const request={...options,signal,redirect:'error'};
 const first=await fetcher(url,request);
 if(![500,502,503,504].includes(first.status))return first;
 await first.body?.cancel().catch(()=>{});
 await new Promise(resolve=>setTimeout(resolve,400));
 return fetcher(url,request);
}
