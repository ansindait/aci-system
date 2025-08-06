import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyB0gOJUmBNCh4yAxdLbVASjgadYsUCay0Y",
  authDomain: "portal-ansinda.firebaseapp.com",
  projectId: "portal-ansinda",
  storageBucket: "portal-ansinda.firebasestorage.app",
  messagingSenderId: "310332831418",
  appId: "1:310332831418:web:96a0b7e144353c59b17483"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);