// In-memory fake of Supabase REST and Razorpay, used only by the tests.
const resp=(d,st=200)=>({ok:st<400,status:st,text:async()=>d===null?"":JSON.stringify(d),json:async()=>d});
function makeDb(){return{rzp:[],orders:[],items:[],
 cats:[{id:1,slug:"bracelets",name:"Bracelets",sizes:["Small (15 cm)","Medium (17 cm)","Large (19 cm)"],sort:1,active:true},{id:2,slug:"gemstones",name:"Gemstones",sizes:["Small piece"],sort:2,active:true},{id:4,slug:"rings",name:"Rings",sizes:["One size"],sort:3,active:true}],
 prods:[
 {id:1,category_id:1,name:"Amethyst Bracelet",stone:"Amethyst",intention:"peace",tone:"cool",color:"#8a5cc7",regular_price:1800,sale_price:null,stock:10,in_stock:true,images:[],description:"",active:true},
 {id:2,category_id:1,name:"Rose Quartz Bracelet",stone:"Rose Quartz",intention:"love",tone:"soft",color:"#e3a3b5",regular_price:1200,sale_price:null,stock:10,in_stock:true,images:[],description:"",active:true},
 {id:3,category_id:1,name:"Citrine Bracelet",stone:"Citrine",intention:"abundance",tone:"warm",color:"#e0b53c",regular_price:1500,sale_price:1200,stock:5,in_stock:true,images:[],description:"A sunny stone.",active:true},
 {id:5,category_id:1,name:"Black Onyx Bracelet",stone:"Black Onyx",intention:"protection",tone:"dark",color:"#1d1b22",regular_price:900,sale_price:null,stock:0,in_stock:true,images:[],description:"",active:true},
 {id:6,category_id:1,name:"Moonstone Bracelet",stone:"Moonstone",intention:"love",tone:"soft",color:"#cfd6e6",regular_price:2600,sale_price:null,stock:10,in_stock:false,images:[],description:"",active:true},
 {id:7,category_id:1,name:"Hidden Bracelet",stone:"X",intention:"peace",tone:"soft",color:"#fff",regular_price:500,sale_price:null,stock:9,in_stock:true,images:[],description:"",active:false},
 {id:20,category_id:4,name:"Test Ring",stone:"Onyx",intention:"focus",tone:"dark",color:"#222222",regular_price:2000,sale_price:null,stock:3,in_stock:true,images:["https://x.test/a.jpg","https://x.test/b.jpg"],description:"Added from admin.",active:true}],
 coupons:[{code:"WELCOME10",type:"percent",value:10,min_order:0,max_uses:null,used_count:0,expires_at:null,active:true},{code:"FLAT200",type:"flat",value:200,min_order:1500,max_uses:null,used_count:0,expires_at:null,active:true},
 {code:"OLD",type:"flat",value:100,min_order:0,max_uses:null,used_count:0,expires_at:"2020-01-01T00:00:00Z",active:true},{code:"USED",type:"flat",value:100,min_order:0,max_uses:1,used_count:1,expires_at:null,active:true}]}}
function fakeFetch(db){return async(url,o={})=>{const u=new URL(url),m=o.method||"GET",b=o.body?JSON.parse(o.body):undefined;
 if(u.host==="api.razorpay.com"){db.rzp.push(b);return resp({id:"order_T"+db.rzp.length})}
 if(u.host!=="sb.test")throw new Error("unexpected host "+u.host);
 if(!o.headers||!o.headers.apikey)throw new Error("missing apikey");
 const p=u.pathname.replace("/rest/v1",""),q=k=>u.searchParams.get(k);
 if(p==="/products"){let r=db.prods.filter(x=>x.active);if(q("id"))r=r.filter(x=>q("id").slice(4,-1).split(",").map(Number).includes(x.id));return resp(r)}
 if(p==="/categories")return resp(db.cats.filter(x=>x.active));
 if(p==="/coupons")return resp(db.coupons.filter(c=>c.code===q("code").slice(3)&&c.active));
 if(p==="/orders"&&m==="GET")return resp(db.orders.filter(x=>x.dedupe_key===q("dedupe_key").slice(3)&&x.payment_status==="pending"));
 if(p==="/orders"&&m==="POST"){const r={id:"u"+(db.orders.length+1),payment_status:"pending",order_status:"new",...b};db.orders.push(r);return resp([r],201)}
 if(p==="/orders"&&m==="PATCH"){db.orders.filter(x=>x.razorpay_order_id===q("razorpay_order_id").slice(3)&&x.payment_status==="pending").forEach(x=>Object.assign(x,b));return resp(null,204)}
 if(p==="/order_items"){db.items.push(...b);return resp(null,201)}
 if(p==="/rpc/finalize_paid_order"){const r=db.orders.find(x=>x.razorpay_order_id===b.p_rzp_order);if(!r)return resp("not_found");if(r.payment_status==="paid")return resp("already_paid");
  r.payment_status="paid";r.razorpay_payment_id=b.p_payment;db.items.filter(i=>i.order_id===r.id&&i.product_id).forEach(i=>{db.prods.find(x=>x.id===i.product_id).stock-=i.qty});
  if(r.coupon_code)db.coupons.find(c=>c.code===r.coupon_code).used_count++;return resp("paid")}
 throw new Error("unhandled "+m+" "+p)}}
const res=()=>({code:200,body:null,h:{},status(c){this.code=c;return this},json(b){this.body=b;return this},end(){return this},setHeader(k,v){this.h[k]=v}});
module.exports={makeDb,fakeFetch,res,resp};
