// Runs the real index.html scripts against stub DOM + the real API handlers + fake Supabase/Razorpay.
const vm=require("vm"),fs=require("fs"),crypto=require("crypto"),assert=require("assert"),{makeDb,fakeFetch,res}=require("./fake");
process.env.SUPABASE_URL="https://sb.test";process.env.SUPABASE_SERVICE_ROLE_KEY="service";process.env.SUPABASE_ANON_KEY="anon";
process.env.RAZORPAY_KEY_ID="rzp_test_abc";process.env.RAZORPAY_KEY_SECRET="sec";
const db=makeDb(),sbFetch=fakeFetch(db);global.fetch=sbFetch;const els={},H={click:[],change:[],keydown:[]},store={};
function mk(id){const e={id,innerHTML:"",textContent:"",value:"",hidden:false,style:{},dataset:{},disabled:false,files:[],classList:{toggle(){},add(){},remove(){},contains(){return false}},
 setAttribute(){},addEventListener(){},focus(){},scrollIntoView(){},insertAdjacentHTML(_,h){e.innerHTML+=h},querySelector(){return mk("q")},selectedOptions:[{text:"Medium (17 cm)"}],closest(){return null}};return e}
const el=id=>els[id]||(els[id]=mk(id));
Object.assign(el("sz"),{value:"Medium (17 cm)"});Object.assign(el("bs"),{value:"170"});Object.assign(el("bm"),{value:"8"});
const handlers={"create-order":require("../api/create-order"),"verify-payment":require("../api/verify-payment"),"products":require("../api/products"),"coupon":require("../api/coupon")};
let lastRz=null;
const ctx={console,location:{hash:""},localStorage:{getItem:k=>store[k]||null,setItem:(k,v)=>{store[k]=v}},
 document:{title:"",getElementById:el,querySelector:s=>s==="[data-place]"?el("place"):s.startsWith("footer")?el("footerShop"):el("qs"),querySelectorAll:()=>[],addEventListener:(t,f)=>H[t]&&H[t].push(f)},
 window:null,scrollTo(){},setTimeout,clearTimeout,Razorpay:function(o){this.o=o;lastRz=this;this.on=()=>{};this.open=()=>{}},
 fetch:async(url,o={})=>{if(url.startsWith("http"))return sbFetch(url,o);const u=new URL(url,"http://x"),h=handlers[u.pathname.replace("/api/","")],r=res();
  await h({method:o.method||"GET",query:Object.fromEntries(u.searchParams),body:o.body?JSON.parse(o.body):undefined,headers:{}},r);return{ok:r.code<400,status:r.code,json:async()=>r.body}}};
ctx.window=ctx;ctx.window.addEventListener=()=>{};vm.createContext(ctx);
const html=fs.readFileSync(__dirname+"/../index.html","utf8");
[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].forEach(m=>vm.runInContext(m[1],ctx));
const run=c=>vm.runInContext(c,ctx),tick=()=>new Promise(r=>setTimeout(r,30));
const click=d=>H.click.forEach(f=>{const t={dataset:d,id:d.id||"",classList:{contains:()=>false},parentNode:{querySelector:()=>({value:d.val||""})}};t.closest=()=>t;return f({target:t})});
let n=0;const ok=(c,m)=>{assert(c,m);n++;console.log("ok -",m)};
(async()=>{
await tick();
ok(run("find(20).imgs.length")===2&&run('find(20).cat')==="rings","product added in admin appears on the customer site with its images and new category");
ok(run("find(7)")===undefined,"hidden product does not appear");
ok(run("find(3).p")===1200&&run("find(3).r")===1500,"sale price and regular price come from the database");
ok(run("card(find(3))").includes("1,500")&&run("card(find(3))").includes("1,200"),"card shows regular price struck through and sale price");
ok(run("card(find(5))").includes("Sold out")&&!run("card(find(5))").includes("data-ad"),"stock 0 product shows Sold out and cannot be added");
ok(run("card(find(6))").includes("Sold out"),"product marked out of stock shows Sold out");
ok(!("trees" in run("CAT"))&&("rings" in run("CAT")),"categories follow the database");
ctx.location.hash="#product-5";run("route()");ok(el("view").innerHTML.includes("Sold out")&&!el("view").innerHTML.includes("data-addp"),"out-of-stock product page has no Add to cart / Buy now");
ctx.location.hash="#product-3";run("route()");ok(el("view").innerHTML.includes("data-addp")&&el("view").innerHTML.includes("data-buy")&&el("view").innerHTML.includes("A sunny stone."),"product page shows description from database with Add to cart and Buy now");
ctx.location.hash="#product-20";run("route()");ok(el("view").innerHTML.includes("https://x.test/a.jpg")&&el("view").innerHTML.includes("One size"),"uploaded images and category sizes show on product page");
ctx.location.hash="#rings";run("route()");ok(el("view").innerHTML.includes("Test Ring"),"new category page lists its products");
click({ad:"3"});click({ad:"3"});
ok(run("cart.length")===1&&run("cart[0].q")===2&&run("cart[0].p")===1200,"cart: add twice gives quantity 2 at sale price");
click({p:"0"});ok(run("cart[0].q")===3,"cart: increase quantity");click({m:"0"});click({m:"0"});ok(run("cart[0].q")===1,"cart: decrease quantity");
click({ad:"3"});
ok(store["ct-cart"]&&JSON.parse(store["ct-cart"]).c[0].q===2,"cart is saved so it survives a refresh");
await run('applyC("WELCOME10")');ok(run("tot().t")===2160,"coupon validated by backend: 10% off");
ctx.location.hash="#checkout";run("route()");ok(el("view").innerHTML.includes("Pay securely")&&el("view").innerHTML.includes("PIN code"),"checkout page renders with address form");
click({place:"1"});ok(lastRz===null&&el("e-name").textContent.length>0,"empty checkout form is blocked with errors");
Object.assign(els,{});const set=(k,v)=>{el("f-"+k).value=v};
set("name","Asha K");set("tel","9056607806");set("email","a@b.co");set("a1","12 Main Road");set("a2","");set("city","Ludhiana");set("st","Punjab");set("pin","141001");
click({place:"1"});await tick();await tick();
ok(lastRz&&lastRz.o.amount===216000&&lastRz.o.order_id&&lastRz.o.key==="rzp_test_abc","Razorpay opens with backend-created order, amount from database");
ok(!JSON.stringify(lastRz.o).includes("sec\""),"no secret passed to the browser");
const oid=lastRz.o.order_id,pid="pay_abc123";
await lastRz.o.handler({razorpay_order_id:oid,razorpay_payment_id:pid,razorpay_signature:crypto.createHmac("sha256","sec").update(oid+"|"+pid).digest("hex")});await tick();
ok(db.orders[0].payment_status==="paid"&&db.prods.find(p=>p.id===3).stock===3,"payment verified, order saved as paid, stock reduced");
ok(run("cart.length")===0&&el("ok").innerHTML.includes("Payment received"),"cart cleared and success message shown");
console.log("\nEnd-to-end tests passed:",n);
})().catch(e=>{console.error("FAIL",e.message);process.exit(1)});
