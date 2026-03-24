// ConfFlow — Firebase Services
// ─────────────────────────────────────────────────────────
// Uses ES module imports (type="module" in index.html).
// Exposes all services on window.FirebaseServices so that
// app.js (a plain script, not a module) can use them.
// Fires a "firebase-ready" event when initialisation is done.

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  GithubAuthProvider,
  signOut,
  onAuthStateChanged,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  doc,
  addDoc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";
import {
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-storage.js";
import {
  getAnalytics,
  logEvent
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-analytics.js";

// ── Validate config injected by firebase-config.js ───────
const cfg = window.__FIREBASE_CONFIG__;
const configValid = cfg && cfg.apiKey && !cfg.apiKey.startsWith('PASTE_');

if (!configValid) {
  console.error(
    '❌ Firebase config is missing or still contains placeholder values.\n' +
    '   In Vercel: make sure FIREBASE_API_KEY and all other FIREBASE_* env vars are set.\n' +
    '   Locally: edit firebase-config.js with your real credentials.'
  );
  window.__FIREBASE_READY__ = false;
  window.dispatchEvent(new CustomEvent('firebase-ready', { detail: { ok: false } }));
} else {
  bootFirebase(cfg);
}

function bootFirebase(config) {
  let app, auth, db, storage, analytics;

  try {
    app       = initializeApp(config);
    auth      = getAuth(app);
    db        = getFirestore(app);
    storage   = getStorage(app);
    analytics = getAnalytics(app);
  } catch (err) {
    console.error('❌ Firebase initialisation failed:', err.message);
    window.__FIREBASE_READY__ = false;
    window.dispatchEvent(new CustomEvent('firebase-ready', { detail: { ok: false } }));
    return;
  }

  const googleProvider = new GoogleAuthProvider();
  const githubProvider = new GithubAuthProvider();

  function safeLog(event, params = {}) {
    try { logEvent(analytics, event, params); } catch (_) {}
  }

  // ── Auth Service ────────────────────────────────────────
  const AuthService = {

    async register(email, password, displayName, role, institution) {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName });
      await setDoc(doc(db, 'users', cred.user.uid), {
        uid: cred.user.uid, displayName, email, role, institution,
        createdAt: serverTimestamp(), avatar: null
      });
      safeLog('sign_up', { method: 'email' });
      return cred.user;
    },

    async login(email, password) {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      safeLog('login', { method: 'email' });
      return cred.user;
    },

    async loginWithGoogle() {
      const result = await signInWithPopup(auth, googleProvider);
      safeLog('login', { method: 'google' });
      return result.user;
    },

    async loginWithGithub() {
      const result = await signInWithPopup(auth, githubProvider);
      safeLog('login', { method: 'github' });
      return result.user;
    },

    async logout() {
      await signOut(auth);
    },

    onAuthChange(callback) {
      return onAuthStateChanged(auth, callback);
    },

    getCurrentUser() {
      return auth.currentUser;
    }
  };

  // ── User Service ────────────────────────────────────────
  const UserService = {
    async getProfile(uid) {
      const snap = await getDoc(doc(db, 'users', uid));
      return snap.exists() ? snap.data() : null;
    },
    async updateProfile(uid, data) {
      await updateDoc(doc(db, 'users', uid), { ...data, updatedAt: serverTimestamp() });
    }
  };

  // ── Conference Service ──────────────────────────────────
  const ConferenceService = {
    async create(data) {
      return await addDoc(collection(db, 'conferences'), {
        ...data, createdAt: serverTimestamp(), status: 'active', papersCount: 0
      });
    },
    async getAll() {
      const q = query(collection(db, 'conferences'), where('status', '==', 'active'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    },
    async getById(id) {
      const snap = await getDoc(doc(db, 'conferences', id));
      return snap.exists() ? { id: snap.id, ...snap.data() } : null;
    },
    async update(id, data) {
      await updateDoc(doc(db, 'conferences', id), { ...data, updatedAt: serverTimestamp() });
    },
    onConfChange(id, callback) {
      return onSnapshot(doc(db, 'conferences', id), snap => {
        if (snap.exists()) callback({ id: snap.id, ...snap.data() });
      });
    }
  };

  // ── Paper Service ───────────────────────────────────────
  const PaperService = {
    async submit(data, pdfFile) {
      let pdfUrl = null;
      if (pdfFile) {
        const storRef = ref(storage, `papers/${Date.now()}_${pdfFile.name}`);
        const task = await uploadBytesResumable(storRef, pdfFile);
        pdfUrl = await getDownloadURL(task.ref);
      }
      return await addDoc(collection(db, 'papers'), {
        ...data, pdfUrl, status: 'submitted', aiScore: null,
        reviewers: [], submittedAt: serverTimestamp(), updatedAt: serverTimestamp()
      });
    },
    async getByAuthor(authorId) {
      const q = query(collection(db, 'papers'), where('authorId', '==', authorId), orderBy('submittedAt', 'desc'));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    },
    async updateStatus(paperId, status, note = '') {
      await updateDoc(doc(db, 'papers', paperId), {
        status, statusNote: note, updatedAt: serverTimestamp()
      });
    },
    onPaperChange(paperId, callback) {
      return onSnapshot(doc(db, 'papers', paperId), snap => {
        if (snap.exists()) callback({ id: snap.id, ...snap.data() });
      });
    }
  };

  // ── Review Service ──────────────────────────────────────
  const ReviewService = {
    async submit(data) {
      return await addDoc(collection(db, 'reviews'), { ...data, submittedAt: serverTimestamp() });
    },
    async getByPaper(paperId) {
      const q = query(collection(db, 'reviews'), where('paperId', '==', paperId));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    },
    async getByReviewer(reviewerId) {
      const q = query(collection(db, 'reviews'), where('reviewerId', '==', reviewerId));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    }
  };

  // ── Storage Service ─────────────────────────────────────
  const StorageService = {
    uploadWithProgress(path, file, onProgress) {
      const storRef = ref(storage, path);
      const task = uploadBytesResumable(storRef, file);
      return new Promise((resolve, reject) => {
        task.on('state_changed',
          snap => { if (onProgress) onProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)); },
          reject,
          async () => resolve(await getDownloadURL(task.ref))
        );
      });
    },
    async delete(filePath) {
      await deleteObject(ref(storage, filePath));
    }
  };

  // ── Analytics ───────────────────────────────────────────
  const Analytics = {
    track(eventName, params = {}) { safeLog(eventName, params); }
  };

  // ── Expose on window (KEY: makes services available to app.js) ──
  window.FirebaseServices = { AuthService, UserService, ConferenceService, PaperService, ReviewService, StorageService, Analytics };
  window.__FIREBASE_READY__ = true;

  console.log('✅ Firebase initialised successfully');
  window.dispatchEvent(new CustomEvent('firebase-ready', { detail: { ok: true } }));
}
