const crypto=require("crypto"),{sb,ready}=require("./_lib");
module.exports=async(req,res)=>{
  if(req.method!=="POST")return res.status(405).json({error:"Method not allowed"});
  const secret=process.env.RAZORPAY_KEY_SECRET;
  if(!secret||!ready())return res.status(500).json({error:"Payments are not configured yet"});
  let b=req.body;if(typeof b==="string"){try{b=JSON.parse(b)}catch{return res.status(400).json({ok:false})}}
  const {razorpay_order_id:o,razorpay_payment_id:p,razorpay_signature:g}=b||{};
  if(![o,p,g].every(v=>typeof v==="string"&&v.length>5&&v.length<100))return res.status(400).json({ok:false});
  const exp=crypto.createHmac("sha256",secret).update(o+"|"+p).digest("hex");
  const a=Buffer.from(exp),c=Buffer.from(g);
  if(!(a.length===c.length&&crypto.timingSafeEqual(a,c)))return res.status(400).json({ok:false});
  try{await sb("POST","/rpc/finalize_paid_order",{p_rzp_order:o,p_payment:p});return res.status(200).json({ok:true})}
  catch(e){console.error("finalize failed",e.message);return res.status(500).json({ok:false})}
};
