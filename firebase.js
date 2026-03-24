// ConfFlow — Firebase Configuration & Services
// ────────────────────────────────────────────
// Replace config values with your Firebase project credentials
// from: https://console.firebase.google.com

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

// ── Firebase Config ──────────────────────────────────────
// TODO: Replace with your Firebase project config
const firebaseConfig = {
  apiKey: "__FIREBASE_API_KEY__",
  authDomain: "__FIREBASE_AUTH_DOMAIN__",
  projectId: "__FIREBASE_PROJECT_ID__",
  storageBucket: "your_project.appspot.com",
  messagingSenderId: "your_sender_id",
  appId: "your_app_id",
  measurementId: "G-XXXXXXXXXX"
};

// ── Initialize ───────────────────────────────────────────
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const analytics = getAnalytics(app);
const googleProvider = new GoogleAuthProvider();
const githubProvider = new GithubAuthProvider();

// ── Auth Services ────────────────────────────────────────
export const AuthService = {
  // Register with email/password
  async register(email, password, displayName, role, institution) {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName });
    // Store extra user data in Firestore
    await setDoc(doc(db, 'users', cred.user.uid), {
      uid: cred.user.uid,
      displayName,
      email,
      role,        // 'author' | 'reviewer' | 'chair' | 'admin'
      institution,
      createdAt: serverTimestamp(),
      avatar: null
    });
    logEvent(analytics, 'sign_up', { method: 'email' });
    return cred.user;
  },

  // Login with email/password
  async login(email, password) {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    logEvent(analytics, 'login', { method: 'email' });
    return cred.user;
  },

  // Google OAuth
  async loginWithGoogle() {
    const result = await signInWithPopup(auth, googleProvider);
    logEvent(analytics, 'login', { method: 'google' });
    return result.user;
  },

  // GitHub OAuth
  async loginWithGithub() {
    const result = await signInWithPopup(auth, githubProvider);
    logEvent(analytics, 'login', { method: 'github' });
    return result.user;
  },

  // Sign out
  async logout() {
    await signOut(auth);
  },

  // Auth state listener
  onAuthChange(callback) {
    return onAuthStateChanged(auth, callback);
  },

  // Get current user
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
  // Create conference
  async create(data) {
    return await addDoc(collection(db, 'conferences'), {
      ...data,
      createdAt: serverTimestamp(),
      status: 'active',
      papersCount: 0
    });
  },

  // Get all active conferences
  async getAll() {
    const q = query(collection(db, 'conferences'), where('status', '==', 'active'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  // Get single conference
  async getById(id) {
    const snap = await getDoc(doc(db, 'conferences', id));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  },

  // Update conference
  async update(id, data) {
    await updateDoc(doc(db, 'conferences', id), { ...data, updatedAt: serverTimestamp() });
  },

  // Real-time listener
  onConfChange(id, callback) {
    return onSnapshot(doc(db, 'conferences', id), snap => {
      if (snap.exists()) callback({ id: snap.id, ...snap.data() });
    });
  }
};

// ── Paper Services ────────────────────────────────────────
export const PaperService = {
  // Submit paper
  async submit(data, pdfFile) {
    // Upload PDF to Storage
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

  // Get papers by author
  async getByAuthor(authorId) {
    const q = query(collection(db, 'papers'), where('authorId', '==', authorId), orderBy('submittedAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  // Get papers by conference
  async getByConference(confId) {
    const q = query(collection(db, 'papers'), where('conferenceId', '==', confId));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  // Get papers assigned to reviewer
  async getByReviewer(reviewerId) {
    const q = query(collection(db, 'papers'), where('reviewers', 'array-contains', reviewerId));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  // Update paper status
  async updateStatus(paperId, status, note = '') {
    await updateDoc(doc(db, 'papers', paperId), {
      status,
      statusNote: note,
      updatedAt: serverTimestamp()
    });
  },

  // Real-time paper listener
  onPaperChange(paperId, callback) {
    return onSnapshot(doc(db, 'papers', paperId), snap => {
      if (snap.exists()) callback({ id: snap.id, ...snap.data() });
    });
  }
};

// ── Review Services ───────────────────────────────────────
export const ReviewService = {
  // Submit review
  async submit(data) {
    return await addDoc(collection(db, 'reviews'), {
      ...data,
      submittedAt: serverTimestamp()
    });
  },

  // Get reviews for a paper
  async getByPaper(paperId) {
    const q = query(collection(db, 'reviews'), where('paperId', '==', paperId));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  // Get reviews by reviewer
  async getByReviewer(reviewerId) {
    const q = query(collection(db, 'reviews'), where('reviewerId', '==', reviewerId));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }
};

// ── Storage Upload Helper ─────────────────────────────────
export const StorageService = {
  // Upload file with progress callback
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
    const storageRef = ref(storage, filePath);
    await deleteObject(storageRef);
  }
};

// ── Analytics Helpers ─────────────────────────────────────
export const Analytics = {
  track(eventName, params = {}) {
    logEvent(analytics, eventName, params);
  }
};

export { auth, db, storage, analytics };
export default app;
