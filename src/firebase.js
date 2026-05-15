// src/firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';

const firebaseConfig = {
  apiKey: "AIzaSyAF6XlXhQt3EYUTc72oI1IHp2wlt4BD6QI",
  authDomain: "vct-fantasy-1e373.firebaseapp.com",
  projectId: "vct-fantasy-1e373",
  storageBucket: "vct-fantasy-1e373.firebasestorage.app",
  messagingSenderId: "808736086474",
  appId: "1:808736086474:web:278bac505f2c931d569733",
  measurementId: "G-CR1HJCB31Z"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);
export const googleProvider = new GoogleAuthProvider();
export default app;