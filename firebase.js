// ConfFlow — Firebase Configuration & Services
// ────────────────────────────────────────────
// Config is injected via firebase-config.js (window.__FIREBASE_CONFIG__)
// DO NOT hardcode credentials here.

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
  deleteDoc,
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

// ── Read config injected by firebase-config.js ───────────
const firebaseConfig = window.__FIREBASE_CONFIG__;

if (!firebaseConfig || !firebaseConfig.apiKey) {
  console.error('❌ Firebase config missing! Make sure firebase-config.js is loaded before firebase.js');
}

// ── Initialize ───────────────────────────────────────────
const app        = initializeApp(firebaseConfig);
const auth       = getAuth(app);
const db         = getFirestore(app);
const storage    = getStorage(app);
const analytics  = getAnalytics(app);
const googleProvider = new GoogleAuthProvider();
const githubProvider = new GithubAuthProvider();

// ── Auth Services ────────────────────────────────────────
export const AuthService = {

  async register(email, password, displayName, role, institution) {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName });
    await setDoc(doc(db, 'users', cred.user.uid), {
      uid: cred.user.uid,
      displayName,
      email,
      role,
      institution,
      createdAt: serverTimestamp(),
      avatar: null
    });
    logEvent(analytics, 'sign_up', { method: 'email' });
    return cred.user;
  },

  async login(email, password) {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    logEvent(analytics, 'login', { method: 'email' });
    return cred.user;
  },

  async loginWithGoogle() {
    const result = await signInWithPopup(auth, googleProvider);
    logEvent(analytics, 'login', { method: 'google' });
    return result.user;
  },

  async loginWithGithub() {
    const result = await signInWithPopup(auth, githubProvider);
    logEvent(analytics, 'login', { method: 'github' });
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

// ── User Services ────────────────────────────────────────
export const UserService = {
  async getProfile(uid) {
    const snap = await getDoc(doc(db, 'users', uid));
    return snap.exists() ? snap.data() : null;
  },

  async updateProfile(uid, data) {
    await updateDoc(doc(db, 'users', uid), { ...data, updatedAt: serverTimestamp() });
  }
};

// ── Conference Services ───────────────────────────────────
export const ConferenceService = {
  async create(data) {
    return await addDoc(collection(db, 'conferences'), {
      ...data,
      createdAt: serverTimestamp(),
      status: 'active',
      papersCount: 0
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

// ── Paper Services ────────────────────────────────────────
export const PaperService = {
  async submit(data, pdfFile) {
    let pdfUrl = null;
    if (pdfFile) {
      const storageRef = ref(storage, `papers/${Date.now()}_${pdfFile.name}`);
      const uploadTask = await uploadBytesResumable(storageRef, pdfFile);
      pdfUrl = await getDownloadURL(uploadTask.ref);
    }
    return await addDoc(collection(db, 'papers'), {
      ...data,
      pdfUrl,
      status: 'submitted',
      aiScore: null,
      reviewers: [],
      submittedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  },

  async getByAuthor(authorId) {
    const q = query(collection(db, 'papers'), where('authorId', '==', authorId), orderBy('submittedAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  async getByConference(confId) {
    const q = query(collection(db, 'papers'), where('conferenceId', '==', confId));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  async getByReviewer(reviewerId) {
    const q = query(collection(db, 'papers'), where('reviewers', 'array-contains', reviewerId));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  async updateStatus(paperId, status, note = '') {
    await updateDoc(doc(db, 'papers', paperId), {
      status,
      statusNote: note,
      updatedAt: serverTimestamp()
    });
  },

  onPaperChange(paperId, callback) {
    return onSnapshot(doc(db, 'papers', paperId), snap => {
      if (snap.exists()) callback({ id: snap.id, ...snap.data() });
    });
  }
};

// ── Review Services ───────────────────────────────────────
export const ReviewService = {
  async submit(data) {
    return await addDoc(collection(db, 'reviews'), {
      ...data,
      submittedAt: serverTimestamp()
    });
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

// ── Storage Service ───────────────────────────────────────
export const StorageService = {
  uploadWithProgress(path, file, onProgress) {
    const storageRef = ref(storage, path);
    const task = uploadBytesResumable(storageRef, file);
    return new Promise((resolve, reject) => {
      task.on('state_changed',
        snapshot => {
          const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          if (onProgress) onProgress(pct);
        },
        error => reject(error),
        async () => {
          const url = await getDownloadURL(task.ref);
          resolve(url);
        }
      );
    });
  },

  async delete(filePath) {
    await deleteObject(ref(storage, filePath));
  }
};

// ── Analytics ─────────────────────────────────────────────
export const Analytics = {
  track(eventName, params = {}) {
    logEvent(analytics, eventName, params);
  }
};

export { auth, db, storage, analytics };
export default app;
