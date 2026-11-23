const {sb,ready}=require("./_lib");
module.exports=async(req,res)=>{
  const code=String(req.query.code||"").trim().toUpperCase();
  if(!ready()||!/^[A-Z0-9_-]{2,30}$/.test(code))return res.status(404).json({error:"Coupon not valid"});
  try{
    const c=(await sb("GET","/coupons?code=eq."+code+"&active=eq.true&select=type,value,min_order,max_uses,used_count,expires_at"))[0];
    if(!c||(c.expires_at&&new Date(c.expires_at)<new Date())||(c.max_uses!=null&&c.used_count>=c.max_uses))return res.status(404).json({error:"Coupon not valid"});
    res.setHeader("Cache-Control","no-store");
    res.status(200).json({type:c.type,value:c.value,min:c.min_order});
  }catch(e){res.status(500).json({error:"Could not check coupon"})}
};
