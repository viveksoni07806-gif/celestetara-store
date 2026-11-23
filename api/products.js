const {sb,ready}=require("./_lib");
module.exports=async(req,res)=>{
  if(!ready())return res.status(500).json({error:"Not configured"});
  try{
    const [categories,products]=await Promise.all([
      sb("GET","/categories?active=eq.true&select=id,slug,name,sizes&order=sort,id"),
      sb("GET","/products?active=eq.true&select=*&order=id")]);
    let videos=[];try{videos=await sb("GET","/home_videos?active=eq.true&select=id,title,video_url&order=sort,id")}catch(e){}
    res.setHeader("Cache-Control","public, s-maxage=15, stale-while-revalidate=60");
    res.status(200).json({categories,videos,products:products.map(p=>({id:p.id,name:p.name,description:p.description,stone:p.stone,intention:p.intention,tone:p.tone,color:p.color,regular_price:p.regular_price,sale_price:p.sale_price,stock:p.stock,in_stock:p.in_stock,images:p.images,video_url:p.video_url||null,category_id:p.category_id}))});
  }catch(e){console.error("products",e.message);res.status(500).json({error:"Could not load products"})}
};
