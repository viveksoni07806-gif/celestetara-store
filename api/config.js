// Public values only (Supabase URL and anon key are safe in the browser; RLS protects the data).
module.exports=(req,res)=>{res.setHeader("Cache-Control","no-store");res.status(200).json({supabaseUrl:process.env.SUPABASE_URL||"",anonKey:process.env.SUPABASE_ANON_KEY||""})};
