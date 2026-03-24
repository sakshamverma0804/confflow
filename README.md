# ConfFlow — AI-Powered Research Conference Platform

A complete, role-based conference management system with AI-assisted peer review, real-time tracking, and intelligent decision support.

## 🚀 Live Demo
Deploy to Vercel in 60 seconds — see below.

---

## 📁 File Structure

```
confflow/
├── index.html          # Main entry point (SPA)
├── package.json        # Dependencies & scripts
├── vercel.json         # Vercel deployment config
├── build.js            # Build & env injection script
├── .env                # Environment variables template
├── .gitignore          # Git ignore rules
│
├── css/
│   ├── main.css        # Base styles, variables, buttons, utilities
│   ├── nav.css         # Navbar & sidebar navigation
│   ├── home.css        # Landing page, conferences, auth pages
│   └── dashboard.css   # Dashboard components, tables, cards
│
└── js/
    ├── app.js          # Main application logic & state
    └── firebase.js     # Firebase services (Auth, Firestore, Storage)
```

---

## ⚡ Quick Start

### 1. Clone & Install
```bash
git clone https://github.com/yourusername/confflow.git
cd confflow
npm install
```

### 2. Configure Firebase
1. Create a project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable **Authentication** (Email/Password + Google + GitHub)
3. Enable **Firestore Database** (start in test mode)
4. Enable **Storage**
5. Copy your config:

```bash
cp .env .env.local
# Edit .env.local with your Firebase credentials
```

### 3. Run Locally
```bash
npm start
# Opens at http://localhost:3000
```

---

## 🌐 Deploy to Vercel

### Option A: Vercel CLI
```bash
npm install -g vercel
vercel login
vercel --prod
```

### Option B: Vercel Dashboard
1. Push to GitHub
2. Go to [vercel.com](https://vercel.com) → New Project
3. Import your GitHub repo
4. Add Environment Variables from `.env`
5. Click Deploy ✅

### Environment Variables (add in Vercel dashboard)
| Key | Value |
|-----|-------|
| `VITE_FIREBASE_API_KEY` | Your Firebase API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | `yourproject.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | `your-project-id` |
| `VITE_FIREBASE_STORAGE_BUCKET` | `yourproject.appspot.com` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Your sender ID |
| `VITE_FIREBASE_APP_ID` | Your app ID |

---

## 👤 Role-Based Access

| Role | Access |
|------|--------|
| **Author** | Submit papers, track status, camera-ready upload |
| **Reviewer** | View assigned papers, AI scores, write reviews |
| **Chair** | Full control — setup, assignments, decisions, analytics |
| **Admin** | Platform management, all conferences |

### Demo Login
- Sign up with any email
- Use `chair@...` → Chair dashboard
- Use `review@...` → Reviewer dashboard
- Any other → Author dashboard

---

## 🤖 AI Review System

ConfFlow's AI layer pre-evaluates every submission on:
- **Originality** (0–100): Novelty vs existing literature
- **Scientific Quality** (0–100): Methodology soundness  
- **Relevance** (0–100): Fit with conference tracks
- **Recommendation**: Accept / Reject / Borderline

To connect real AI review, integrate your NLP API in `js/firebase.js` → `PaperService.submit()`.

---

## 🔥 Firebase Schema

```
/users/{uid}
  displayName, email, role, institution, createdAt

/conferences/{confId}
  title, abbr, org, domain, location, tracks[], deadlines{}
  status, papersCount, chairId

/papers/{paperId}
  title, abstract, keywords, authorId, conferenceId
  track, coAuthors[], pdfUrl, status, aiScore
  submittedAt, updatedAt

/reviews/{reviewId}
  paperId, reviewerId, scores{}, comment
  confidentialNote, submittedAt

/assignments/{assignId}
  paperId, reviewerId, assignedAt, deadline
```

---

## 🛠 Tech Stack

- **Frontend**: Vanilla HTML/CSS/JS (no framework — zero dependencies)
- **Fonts**: Syne (display) + Plus Jakarta Sans (body) via Google Fonts
- **Backend**: Firebase (Auth + Firestore + Storage + Analytics)
- **Hosting**: Vercel
- **AI Layer**: Pluggable NLP API (OpenAI / custom model)

---

## 📄 License
MIT © 2025 ConfFlow
