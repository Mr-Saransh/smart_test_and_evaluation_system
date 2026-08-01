# Apni Vidya — Merged Setup (ek hi website, ek hi port)

Backend (`apni-vidya-backend-v2`) already is designed to serve the frontend's
built files directly (`src/server.js` mein `express.static` + SPA fallback
route already hai) — bas dono ko sahi tarike se jodne ka step missing tha.
Ab `merge_and_run.sh` woh sab ek command mein kar deta hai.

## Ek baar ka setup (pehli dafa hi karna hai)

1. PostgreSQL database ready rakho (local ya cloud — Railway/Supabase/Neon
   sab chalega).
2. Backend ke liye `.env` banao:
   ```bash
   cd apni-vidya-backend-v2
   cp .env.example .env
   ```
   Fir `.env` mein kam se kam ye 2 cheezein bharo:
   - `DATABASE_URL=postgresql://user:pass@host:5432/dbname`
   - `JWT_SECRET=` — koi bhi random 32+ character string (ye command chala
     ke bana sakte ho: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`)

   Baaki sab (SMS/WhatsApp/Razorpay) optional hai — khaali chhod do, wo
   console-log/mock mode mein chalega jab tak actual provider keys na daalo.

## Har baar chalane ke liye (ek hi command)

Project root (`apni_vidya_latest/`) se:
```bash
chmod +x merge_and_run.sh
./merge_and_run.sh
```
Ye script:
1. Frontend install + `npm run build` karta hai
2. Us build ko `apni-vidya-backend-v2/public/` mein copy karta hai
3. Backend install + DB migrations (`npm run migrate`) chalata hai
4. Backend start karta hai (`npm start`)

Terminal mein jo bhi port dikhega (default `http://localhost:3000`) — wahi
browser mein kholo. Ab UI aur API dono **ussi ek URL** se serve ho rahe hain,
isliye "backend se connected nahi" wala issue nahi aayega — koi separate
frontend server, koi cross-port/CORS mismatch nahi.

## Important — sandbox limitation (transparency)

Maine ye script yahan ke sandbox mein khud run/test nahi kar paya, kyunki mera
build tool (Vite ka `rolldown`) yahan ek missing native binding maang raha
hai jise download karne ke liye internet chahiye, aur is sandbox mein network
disabled hai (`npm has a bug related to optional dependencies` — well-known
npm issue #4828). Aapke normal machine par (jahan `npm install` internet ke
saath chal sakta hai) ye cleanly chalega. Agar phir bhi wahi error aaye,
solution wahi hai jo error khud bataata hai:
```bash
cd apni-vidya-frontend
rm -rf node_modules package-lock.json
npm install
```

## Roz-roz development ke liye (optional, merge ke bina)

Agar baar-baar full rebuild nahi karna, do terminals mein:
```bash
# Terminal 1
cd apni-vidya-backend-v2 && npm run dev

# Terminal 2
cd apni-vidya-frontend && npm run dev
```
`vite.config.js` mein ab ek dev-proxy add kar diya hai jo `/api/*` calls ko
automatically backend (default `localhost:3000`) tak forward kar deta hai —
isliye dev mode mein bhi frontend↔backend connected rahega, merge kiye bina.
Agar backend kisi aur port pe hai to `VITE_BACKEND_URL=http://localhost:XXXX`
env var set karke chalao.
