#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════
# Apni Vidya — one-shot merge & run
#   1. Installs + builds the frontend (React/Vite)
#   2. Copies the build into the backend's public/ folder
#   3. Installs backend deps and runs DB migrations
#   4. Starts the backend — it now serves BOTH the API and the UI
#      on a single port. No separate frontend server, no CORS issues.
#
# Prerequisites (one-time, do this yourself first):
#   - Node.js 18+ and a running PostgreSQL database
#   - apni-vidya-backend-v2/.env filled in (copy from .env.example):
#       DATABASE_URL=postgresql://user:pass@localhost:5432/apni_vidya
#       JWT_SECRET=<random 32+ char string>
#     (SMS/WhatsApp/Razorpay are optional — leave blank to run in
#      console-mock mode while you're just testing locally)
#
# Usage:
#   chmod +x merge_and_run.sh
#   ./merge_and_run.sh
# ═══════════════════════════════════════════════════════════════════
set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$ROOT_DIR/apni-vidya-frontend"
BACKEND_DIR="$ROOT_DIR/apni-vidya-backend-v2"

if [ ! -f "$BACKEND_DIR/.env" ]; then
  echo "⚠️  $BACKEND_DIR/.env nahi mila."
  echo "    cp apni-vidya-backend-v2/.env.example apni-vidya-backend-v2/.env"
  echo "    karke DATABASE_URL aur JWT_SECRET bhar do, fir ye script phir se chalao."
  exit 1
fi

echo "── [1/5] Frontend dependencies ──────────────────────────────"
cd "$FRONTEND_DIR"
npm install

echo "── [2/5] Building frontend (production bundle) ─────────────"
npm run build

echo "── [3/5] Copying build into backend/public ──────────────────"
rm -rf "$BACKEND_DIR/public"
mkdir -p "$BACKEND_DIR/public"
cp -r "$FRONTEND_DIR/dist/." "$BACKEND_DIR/public/"

echo "── [4/5] Backend dependencies + DB migrations ───────────────"
cd "$BACKEND_DIR"
npm install
npm run migrate

echo "── [5/5] Starting merged server ──────────────────────────────"
echo "    Poora app (API + UI) ab ek hi port par chalega — .env ka PORT dekho (default 3000)."
npm start
