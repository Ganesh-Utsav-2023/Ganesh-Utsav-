import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const defaultConfig = {
  apiKey: "AIzaSyBGnj2i4lcxCbTITT5h6KK2lSEUNetVW3o",
  authDomain: "ganesh-utsav-a6a5b.firebaseapp.com",
  projectId: "ganesh-utsav-a6a5b",
  storageBucket: "ganesh-utsav-a6a5b.firebasestorage.app",
  messagingSenderId: "683828555679",
  appId: "1:683828555679:web:08a2bf02972c60be0397aa"
};

// Only use environment variables if they are explicitly configured for the target project "ganesh-utsav-a6a5b"
const envProjectId = (import.meta as any).env?.VITE_FIREBASE_PROJECT_ID;
const useEnv = envProjectId === "ganesh-utsav-a6a5b";

export const firebaseConfig = useEnv ? {
  apiKey: ((import.meta as any).env?.VITE_FIREBASE_API_KEY as string) || defaultConfig.apiKey,
  authDomain: ((import.meta as any).env?.VITE_FIREBASE_AUTH_DOMAIN as string) || defaultConfig.authDomain,
  projectId: ((import.meta as any).env?.VITE_FIREBASE_PROJECT_ID as string) || defaultConfig.projectId,
  storageBucket: ((import.meta as any).env?.VITE_FIREBASE_STORAGE_BUCKET as string) || defaultConfig.storageBucket,
  messagingSenderId: ((import.meta as any).env?.VITE_FIREBASE_MESSAGING_SENDER_ID as string) || defaultConfig.messagingSenderId,
  appId: ((import.meta as any).env?.VITE_FIREBASE_APP_ID as string) || defaultConfig.appId
} : defaultConfig;

export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
