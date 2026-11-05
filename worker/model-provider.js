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
 else if(response.status===401)message='你的DeepSeek API密钥无效，请在账号页重新绑定自己的密钥。';
 else if(response.status===429)message='模型请求达到速率或并发限制，请稍后再试。';
 return {error:message,code,upstream_status:response.status};
}
