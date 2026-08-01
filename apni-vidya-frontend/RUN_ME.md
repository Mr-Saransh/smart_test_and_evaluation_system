# Apni Vidya — Frontend (backend ke hisaab se hi, extra kuch nahi)

Is pass mein frontend ko backend ke saath 1:1 align kar diya gaya hai:

## Kya hataya gaya
- **Poora demo/mock mode** (`demoApi`, `seed()`, `localStorage`/`window.storage`
  based fake data, `DEMO` flag, login-screen "tap a role" demo-credential
  shortcut) — ye sab local-only nakli data tha jiska koi real backend route
  nahi tha. Ab frontend **hamesha** real `/api/*` backend ko hit karta hai.

## Kya fix hua (backend se match karne ke liye)
- Parent-report **schedule ON/OFF toggle** pehle `PUT` bhej raha tha, lekin
  backend route sirf `PATCH /api/parent-reports/jobs/:id` hai — is se toggle
  fail ho jaata (404/405). Ab `PATCH` use hota hai.
- **Default channel = WhatsApp** har jagah (fee/planner reminders, custom
  notification send, auto parent-reports) — kyunki backend ka default
  channel bhi ab WhatsApp hai (fee-due notices aur test-results automatically
  WhatsApp par jaate hain).

## Verify kiya
File mein jitne bhi API calls hain (GET/POST/PUT/PATCH/DELETE), sabko backend
ke `src/routes/*.js` files ke against manually match kiya — ek bhi extra ya
missing endpoint nahi hai.

## Local mein chalane ke liye

```bash
npm install
npm run dev
```
`.env` mein `VITE_API_URL=/api` set hai.

## Production mein backend ke saath serve karna (recommended)

```bash
npm run build
cp -r dist/* ../apni-vidya-backend-v2/public/
```
Fir sirf backend chalao — ek hi port pe poora app (API + frontend).

## Roles jo cover hote hain
- **Admin/Staff**: Institute setup, Batches, Courses, Enrollment approve/reject,
  Timetable, Fee structures/records, Question bank, Tests, Attendance,
  Study material, Planner, Announcements, Notifications (SMS/WhatsApp),
  Parent-report scheduling, Batch/Student reports.
- **Student**: Home dashboard, Timetable, full Test player (timer, flag,
  auto-submit), Study material, Planner, Progress, Attendance, Announcements.
- **Parent**: Parent dashboard.
- **Auth**: Signup, Login, OTP-based forgot/reset password.
- **Payments**: Razorpay order + verify flow.

Note: AI/live-class/video-hosting/certificates/leaderboard/gamification
backend mein hi nahi hain, isliye frontend mein bhi nahi hain (jaisa pehle
discuss kiya).

