// Catalog: reads real products, sizes and stock from Supabase and prices the cart on the server.
// The browser only sends product ids, sizes and quantities. Prices and totals are never trusted.
const {sb}=require("./_lib");
const E=m=>Object.assign(new Error(m),{user:1});
const eff=p=>p.sale_price!=null&&p.sale_price<p.regular_price?p.sale_price:p.regular_price;
const INVALID="Your cart has an invalid item. Please refresh and try again.";
async function priceCart(items){
  const need=new Set(),parsed=[];
  for(const it of items){
    const q=it&&it.q;if(!Number.isInteger(q)||q<1||q>10||typeof it.k!=="string")throw E(INVALID);
    if(it.k[0]==="b"){const cb=it.cb;if(!Array.isArray(cb)||!cb.length||cb.length>40||!cb.every(Number.isInteger))throw E("Invalid custom bracelet");cb.forEach(i=>need.add(i));parsed.push({custom:true,cb,q})}
    else{const id=parseInt(it.k,10);if(!Number.isInteger(id))throw E(INVALID);need.add(id);parsed.push({id,size:it.k.slice(String(id).length),q})}
  }
  const [prods,cats]=await Promise.all([
    sb("GET","/products?active=eq.true&id=in.("+[...need].join(",")+")&select=id,name,regular_price,sale_price,stock,in_stock,category_id"),
    sb("GET","/categories?active=eq.true&select=id,slug,sizes")]);
  const P=Object.fromEntries(prods.map(p=>[p.id,p])),C=Object.fromEntries(cats.map(x=>[x.id,x]));
  let sub=0;const lines=[],rows=[],use={},sig=[];
  for(const x of parsed){
    if(x.custom){let t=300;for(const id of x.cb){const p=P[id];if(!p||!C[p.category_id]||C[p.category_id].slug!=="bracelets")throw E("Invalid custom bracelet");t+=Math.round(eff(p)/30/10)*10}
      sub+=t*x.q;lines.push(x.q+"x Custom bracelet");sig.push(["c",x.cb,x.q]);
      rows.push({product_id:null,product_name:"Custom bracelet",size:null,qty:x.q,unit_price:t,custom:{stones:x.cb}})}
    else{const p=P[x.id];if(!p)throw E("A product in your cart is no longer available.");const cat=C[p.category_id];
      if(!cat||!(cat.sizes||[]).includes(x.size))throw E("Invalid size for "+p.name);
      use[p.id]=(use[p.id]||0)+x.q;if(!p.in_stock||use[p.id]>p.stock)throw E(p.name+" is out of stock or has limited stock.");
      const u=eff(p);sub+=u*x.q;lines.push(x.q+"x "+p.name+" ("+x.size+")");sig.push([p.id,x.size,x.q]);
      rows.push({product_id:p.id,product_name:p.name,size:x.size,qty:x.q,unit_price:u,custom:null})}
  }
  return {sub,lines,rows,sig};
}
async function applyCoupon(code,sub){
  if(!code)return 0;
  if(!/^[A-Z0-9_-]{2,30}$/.test(code))throw E("Coupon not valid");
  const cp=(await sb("GET","/coupons?code=eq."+code+"&active=eq.true&select=*"))[0];
  if(!cp||(cp.expires_at&&new Date(cp.expires_at)<new Date())||(cp.max_uses!=null&&cp.used_count>=cp.max_uses))throw E("Coupon not valid");
  if(sub<cp.min_order)throw E("This coupon needs a minimum order of ₹"+cp.min_order);
  return cp.type==="percent"?Math.round(sub*cp.value/100):Math.min(cp.value,sub);
}
module.exports={priceCart,applyCoupon,eff,E};
