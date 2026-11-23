const crypto=require("crypto");
const {sb,ready}=require("./_lib");
const {priceCart,applyCoupon,E}=require("./_catalog");
const bad=(res,m)=>res.status(400).json({error:m});
module.exports=async(req,res)=>{
  if(req.method!=="POST")return res.status(405).json({error:"Method not allowed"});
  const keyId=process.env.RAZORPAY_KEY_ID,secret=process.env.RAZORPAY_KEY_SECRET;
  if(!keyId||!secret||!ready())return res.status(500).json({error:"Payments are not configured yet"});
  let b=req.body;if(typeof b==="string"){try{b=JSON.parse(b)}catch{return bad(res,"Invalid request")}}
  b=b||{};const c=b.customer||{},s=v=>typeof v==="string"?v.trim():"";
  const cu={name:s(c.name),tel:s(c.tel),email:s(c.email),a1:s(c.a1),a2:s(c.a2),city:s(c.city),st:s(c.st),pin:s(c.pin)};
  if(cu.name.length<2||cu.name.length>80)return bad(res,"Enter your full name");
  if(!/^[6-9]\d{9}$/.test(cu.tel))return bad(res,"Enter a valid 10-digit mobile number");
  if(!/^\S+@\S+\.\S+$/.test(cu.email)||cu.email.length>120)return bad(res,"Enter a valid email");
  if(cu.a1.length<6||cu.a1.length>150||cu.a2.length>100)return bad(res,"Enter your complete address");
  if(cu.city.length<2||cu.city.length>60||!cu.st||cu.st.length>40)return bad(res,"Enter your city and state");
  if(!/^\d{6}$/.test(cu.pin))return bad(res,"Enter a 6-digit PIN code");
  if(!Array.isArray(b.items)||!b.items.length||b.items.length>20)return bad(res,"Your cart is empty");
  try{
    const {sub,lines,rows,sig}=await priceCart(b.items);
    const code=s(b.coupon).toUpperCase(),disc=await applyCoupon(code,sub),total=sub-disc;
    if(total<1)throw E("Invalid total");
    // Duplicate protection: the same cart, coupon, phone and email within 30 minutes reuses the pending order.
    const key=crypto.createHash("sha256").update(JSON.stringify([sig,code,total,cu.tel,cu.email.toLowerCase()])).digest("hex");
    const since=new Date(Date.now()-30*60*1000).toISOString();
    const dup=(await sb("GET","/orders?dedupe_key=eq."+key+"&payment_status=eq.pending&created_at=gte."+since+"&select=razorpay_order_id,total&limit=1"))[0];
    if(dup&&dup.razorpay_order_id)return res.status(200).json({orderId:dup.razorpay_order_id,amount:dup.total*100,currency:"INR",keyId});
    const r=await fetch("https://api.razorpay.com/v1/orders",{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Basic "+Buffer.from(keyId+":"+secret).toString("base64")},
      body:JSON.stringify({amount:total*100,currency:"INR",receipt:"ct_"+Date.now(),notes:{name:cu.name,phone:cu.tel,city:cu.city,coupon:code||"none",items:lines.join(", ").slice(0,250)}})});
    const d=await r.json();
    if(!r.ok){console.error("Razorpay order error",r.status,d&&d.error&&d.error.description);return res.status(502).json({error:"Could not start payment. Please try again."})}
    const o=(await sb("POST","/orders",{razorpay_order_id:d.id,customer_name:cu.name,phone:cu.tel,email:cu.email,address:(cu.a1+" "+cu.a2).trim(),city:cu.city,state:cu.st,pin:cu.pin,subtotal:sub,discount:disc,total,coupon_code:code||null,dedupe_key:key},"return=representation"))[0];
    await sb("POST","/order_items",rows.map(x=>({...x,order_id:o.id})));
    return res.status(200).json({orderId:d.id,amount:total*100,currency:"INR",keyId});
  }catch(e){
    if(e.user)return bad(res,e.message);
    console.error("create-order failed",e.message);return res.status(500).json({error:"Could not start payment. Please try again."});
  }
};
