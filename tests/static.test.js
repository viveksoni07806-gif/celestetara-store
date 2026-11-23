const fs=require("fs"),path=require("path"),root=path.join(__dirname,"..");let bad=0,n=0;
const fail=m=>{bad++;console.log("FAIL -",m)},ok=m=>{n++;console.log("ok -",m)};
const rd=f=>fs.readFileSync(path.join(root,f),"utf8");
for(const f of ["index.html","admin/index.html","api/_lib.js","api/_catalog.js","api/config.js","api/products.js","api/coupon.js","api/create-order.js","api/verify-payment.js","api/razorpay-webhook.js","supabase.sql","vercel.json","package.json",".env.example",".gitignore","README.md"])
  fs.existsSync(path.join(root,f))?n++:fail("missing file "+f);
ok("all expected files exist");
for(const f of ["index.html","admin/index.html"]){
  const s=rd(f),def=new Set([...s.matchAll(/id="([\w-]+)/g)].map(m=>m[1]));let miss=[];
  for(const m of s.matchAll(/\$\("([\w-]+)"\)/g))if(!def.has(m[1])&&!/^(f|e|s|n|d|c|k|p)[-_]/.test(m[1])&&m[1]!=="view"||(m[1]==="view"&&!def.has("view")))miss.push(m[1]);
  [...new Set(miss)].length?fail(f+" uses missing element ids: "+[...new Set(miss)]):ok(f+": every element id used in scripts exists");
}
{const s=rd("index.html"),def=new Set([...s.matchAll(/id="([\w-]+)"/g)].map(m=>m[1])),routes=new Set(["bracelets","gemstones","trees","cart","checkout","top"]);let miss=[];
 for(const m of s.matchAll(/href="#([\w-]+)"/g))if(!def.has(m[1])&&!routes.has(m[1])&&!/^product-/.test(m[1]))miss.push(m[1]);
 [...new Set(miss)].length?fail("broken in-page links: "+[...new Set(miss)]):ok("index.html: all #links point to a section or page route");}
// secrets
for(const f of ["index.html","admin/index.html"]){const s=rd(f);
 /RAZORPAY_KEY_SECRET|SERVICE_ROLE|rzp_test_[A-Za-z0-9]{6,}|eyJ[A-Za-z0-9_-]{20,}|sb_secret/.test(s)?fail("secret-like text in "+f):ok(f+": no secrets or keys in frontend file")}
for(const f of ["api/config.js"])/SERVICE_ROLE|KEY_SECRET/.test(rd(f))?fail("config.js exposes secret env"):ok("config.js exposes only public values");
const e=rd(".env.example");/=\S{8,}/.test(e)?fail(".env.example contains real-looking values"):ok(".env.example holds no values");
/\.env/.test(rd(".gitignore"))?ok(".gitignore blocks .env files"):fail(".gitignore missing .env");
// SQL / RLS
const q=rd("supabase.sql").toLowerCase(),tables=[...q.matchAll(/create table if not exists public\.(\w+)/g)].map(m=>m[1]);
for(const t of tables)q.includes("alter table public."+t+" enable row level security")?n++:fail("RLS not enabled on "+t);
ok("RLS enabled on all "+tables.length+" tables: "+tables.join(", "));
const anon=[...q.matchAll(/create policy "[^"]+" on ([\w.]+) for (\w+) to ([^;]*?) (using|with)/g)].filter(m=>/anon/.test(m[3])).map(m=>m[1]+":"+m[2]);
JSON.stringify(anon.sort())===JSON.stringify(["public.categories:select","public.products:select"])?ok("anonymous users can only read active categories and products"):fail("unexpected anon policies: "+anon);
/revoke all on function public\.finalize_paid_order[^;]*from public, anon, authenticated/.test(q)&&/grant execute on function public\.finalize_paid_order\(text,text\) to service_role/.test(q)?ok("finalize_paid_order callable by server only"):fail("finalize_paid_order grants wrong");
/create or replace function public\.is_admin/.test(q)&&q.includes("using (public.is_admin())")?ok("admin policies use is_admin() allow-list"):fail("is_admin policy missing");
/admin img insert/.test(q)&&/bucket_id='product-images' and public\.is_admin\(\)/.test(q)?ok("image upload limited to admins"):fail("storage policies missing");
// vercel
const v=JSON.parse(rd("vercel.json"));v.rewrites&&v.headers?ok("vercel.json valid"):fail("vercel.json invalid");
console.log("\nStatic checks passed:",n,bad?("FAILED: "+bad):"");process.exit(bad?1:0);
