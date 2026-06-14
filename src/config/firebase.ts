import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Reemplaza estos valores con los de tu proyecto en Firebase Console
// https://console.firebase.google.com → Tu proyecto → Configuración → Agregar app web
const firebaseConfig = {
  apiKey: 'AIzaSyCq56NMgPbzEqB5fMbPbUHT_UKRjsoQJI8',
  authDomain: 'indumap-7b99a.firebaseapp.com',
  projectId: 'indumap-7b99a',
  storageBucket: 'indumap-7b99a.firebasestorage.app',
  messagingSenderId: '1047027928075',
  appId: '1:1047027928075:web:c6786b37f68cd4f1588b0e',
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const db = getFirestore(app);
export default app;
