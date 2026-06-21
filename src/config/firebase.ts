import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, initializeFirestore } from 'firebase/firestore';
// @ts-expect-error — getReactNativePersistence solo existe en los tipos de la
// condición "react-native" de @firebase/auth; Metro la resuelve bien en
// runtime, pero `tsc` solo ve los tipos genéricos (web/node) de este paquete.
import { initializeAuth, getAuth, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Reemplaza estos valores con los de tu proyecto en Firebase Console
// https://console.firebase.google.com → Tu proyecto → Configuración → Agregar app web
export const firebaseConfig = {
  apiKey: 'AIzaSyCq56NMgPbzEqB5fMbPbUHT_UKRjsoQJI8',
  authDomain: 'indumap-7b99a.firebaseapp.com',
  projectId: 'indumap-7b99a',
  storageBucket: 'indumap-7b99a.firebasestorage.app',
  messagingSenderId: '1047027928075',
  appId: '1:1047027928075:web:c6786b37f68cd4f1588b0e',
};

const isNewApp = getApps().length === 0;
const app = isNewApp ? initializeApp(firebaseConfig) : getApps()[0];

// Auth con persistencia en AsyncStorage (si no, la sesión no sobrevive a un
// reinicio de la app y React Native muestra warnings sobre persistencia).
export const auth = isNewApp
  ? initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) })
  : getAuth(app);

// En React Native el transporte por streaming (WebChannel/gRPC) de Firestore
// suele fallar y deja la app en modo offline ("Could not reach Cloud Firestore
// backend"). Forzar long polling usa peticiones HTTP normales y soluciona ese
// problema de conectividad en dispositivos/emuladores.
export const db = isNewApp
  ? initializeFirestore(app, { experimentalForceLongPolling: true })
  : getFirestore(app);

// Log temporal para confirmar que Firestore arrancó con long polling.
// Si ves este mensaje en consola, el cambio SÍ se aplicó.
console.log('[Firebase] Firestore inicializado con long polling:', isNewApp);

export default app;
