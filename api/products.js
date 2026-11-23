const {sb,ready}=require("./_lib");
module.exports=async(req,res)=>{
  if(!ready())return res.status(500).json({error:"Not configured"});
  try{
    const [categories,products]=await Promise.all([
      sb("GET","/categories?active=eq.true&select=id,slug,name,sizes&order=sort,id"),
      sb("GET","/products?active=eq.true&select=id,name,description,stone,intention,tone,color,regular_price,sale_price,stock,in_stock,images,category_id&order=id")]);
    res.setHeader("Cache-Control","public, s-maxage=15, stale-while-revalidate=60");
    res.status(200).json({categories,products});
  }catch(e){console.error("products",e.message);res.status(500).json({error:"Could not load products"})}
};
