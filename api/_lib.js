const U=()=>process.env.SUPABASE_URL,K=()=>process.env.SUPABASE_SERVICE_ROLE_KEY;
const ready=()=>!!(U()&&K());
// Server-only Supabase REST helper. The service key never leaves the server.
async function sb(method,path,body,prefer){
  const k=K(),h={apikey:k,"Content-Type":"application/json"};
  if(!k.startsWith("sb_"))h.Authorization="Bearer "+k;
  if(prefer)h.Prefer=prefer;
  const r=await fetch(U().replace(/\/$/,"")+"/rest/v1"+path,{method,headers:h,body:body===undefined?undefined:JSON.stringify(body)});
  const t=await r.text();let d=null;try{d=t?JSON.parse(t):null}catch{}
  if(!r.ok){const e=new Error((d&&d.message)||"Database error");e.status=r.status;throw e}
  return d;
}
module.exports={sb,ready};
