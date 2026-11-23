const crypto=require("crypto"),{sb,ready}=require("./_lib");
const handler=async(req,res)=>{
  if(req.method!=="POST")return res.status(405).end();
  const secret=process.env.RAZORPAY_WEBHOOK_SECRET;
  if(!secret||!ready())return res.status(500).end();
  const raw=await new Promise(r=>{if(typeof req.body==="string")return r(req.body);if(Buffer.isBuffer(req.body))return r(req.body.toString());const c=[];req.on("data",d=>c.push(d));req.on("end",()=>r(Buffer.concat(c).toString()))});
  const exp=crypto.createHmac("sha256",secret).update(raw).digest("hex"),got=String(req.headers["x-razorpay-signature"]||"");
  const a=Buffer.from(exp),g=Buffer.from(got);
  if(!(a.length===g.length&&crypto.timingSafeEqual(a,g)))return res.status(400).end();
  try{
    const ev=JSON.parse(raw),pay=ev.payload&&ev.payload.payment&&ev.payload.payment.entity;
    if(pay&&pay.order_id){
      if(ev.event==="payment.captured"||ev.event==="order.paid")await sb("POST","/rpc/finalize_paid_order",{p_rzp_order:pay.order_id,p_payment:pay.id});
      else if(ev.event==="payment.failed")await sb("PATCH","/orders?razorpay_order_id=eq."+encodeURIComponent(pay.order_id)+"&payment_status=eq.pending",{payment_status:"failed"});
    }
    return res.status(200).json({ok:true});
  }catch(e){console.error("webhook failed",e.message);return res.status(500).end()}
};
handler.config={api:{bodyParser:false}};
module.exports=handler;
