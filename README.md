# ConfFlow — AI-Powered Research Conference Platform

A complete, role-based conference management system with AI-assisted peer review.

## 🚀 Deploy to Vercel

### Step 1 — Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/confflow.git
git push -u origin main
```

### Step 2 — Import to Vercel
1. Go to [vercel.com](https://vercel.com) → New Project → Import your GitHub repo
2. Vercel will auto-detect settings from `vercel.json`

### Step 3 — Set Environment Variables in Vercel
Go to Project → Settings → Environment Variables and add:

| Variable | Value |
|----------|-------|
| `FIREBASE_API_KEY` | Your Firebase API key |
| `FIREBASE_AUTH_DOMAIN` | `yourproject.firebaseapp.com` |
| `FIREBASE_PROJECT_ID` | `your-project-id` |
| `FIREBASE_STORAGE_BUCKET` | `yourproject.firebasestorage.app` |
| `FIREBASE_MESSAGING_SENDER_ID` | Your sender ID |
| `FIREBASE_APP_ID` | Your app ID |
| `FIREBASE_MEASUREMENT_ID` | Your measurement ID (optional) |

### Step 4 — Redeploy
After setting env vars, click **Redeploy** in Vercel. The `build.js` script will inject the real credentials into `firebase-config.js` automatically.

---

## 🔥 How it works

```
build.js runs on Vercel
    └─ reads FIREBASE_* env vars
    └─ writes real values into firebase-config.js

index.html loads:
    1. firebase-config.js  → sets window.__FIREBASE_CONFIG__
    2. firebase.js         → ES module, inits Firebase, exposes window.FirebaseServices
    3. app.js              → plain script, uses window.FirebaseServices for real auth
```

## 👤 Roles

| Role | Access |
|------|--------|
| **Author** | Submit papers, track status, camera-ready upload |
| **Reviewer** | View assigned papers, AI scores, write reviews |
| **Chair** | Full control — setup, assignments, decisions, analytics |

## 🛠 Tech Stack

- **Frontend**: Vanilla HTML/CSS/JS (zero framework dependencies)
- **Backend**: Firebase (Auth + Firestore + Storage + Analytics)
- **Hosting**: Vercel (static + edge)
- **Build**: Node.js build script for env injection

## License
MIT © 2025 ConfFlow
