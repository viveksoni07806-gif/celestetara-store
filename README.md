# CELESTETARA store (Vercel + Supabase + Razorpay Test Mode)

Customer site: `/`   Admin dashboard: `/admin` (login chahiye)

## Files
- index.html: customer website (design same). Products/prices/stock ab database se aate hain.
- admin/index.html: admin dashboard
- api/_catalog.js: server par price + stock + coupon check (browser ke price par bharosa nahi)
- api/create-order.js, api/verify-payment.js: Razorpay Test Mode orders aur payment verify
- api/razorpay-webhook.js: Razorpay se payment confirmation (browser band ho jaye tab bhi)
- api/products.js, api/coupon.js, api/config.js: customer site ke liye
- supabase.sql: database, RLS security, image storage
- tests/: automatic tests (`npm test`)

## Setup order (ek ek step)
1. Supabase: naya project (Free plan, region Mumbai). Database password save karein.
2. Supabase > SQL Editor: supabase.sql paste karke Run.
3. Supabase > Authentication > Users > Add user: apna admin email + strong password (Auto confirm ON).
4. Supabase > SQL Editor mein ye chalayein (apna email likhein):
   insert into public.admins(email) values ('aapka-email@example.com');
5. Supabase > Authentication > Sign In / Providers: "Allow new users to sign up" OFF karein.
6. Supabase > Project Settings > API: Project URL, anon key, service_role key copy karein (service_role secret hai).
7. GitHub par repo banakar saari files upload karein. Vercel mein import karein (Framework: Other).
8. Vercel > Settings > Environment Variables (Production, Preview, Development):
   SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY,
   RAZORPAY_KEY_ID (rzp_test_...), RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET
9. Redeploy karein.
10. Razorpay Dashboard (Test Mode) > Settings > Webhooks > Add: URL https://AAPKI-SITE/api/razorpay-webhook,
    secret = wahi jo RAZORPAY_WEBHOOK_SECRET mein dala, events: payment.captured, order.paid, payment.failed.
11. https://AAPKI-SITE/admin par login karein, sample products delete/edit karein, apne products aur photos daalein.

## Security
- Secrets sirf Vercel environment variables mein. Frontend mein sirf Supabase URL aur anon key (public) hai.
- RLS: customers sirf active products aur categories padh sakte hain. Orders, coupons, inventory sirf admins dekh/badal sakte hain.
- Admin sirf wahi jiska email `admins` table mein hai. Naya signup band rakhein.
- Total, price, stock, coupon sab server par dobara check hota hai.

## Abhi nahi hai
Confirmation email/SMS, shipping charge rules, refunds, custom bracelet ka bead-wise stock, Live payments (Live keys baad mein).
