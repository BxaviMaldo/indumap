import { collection, doc, getDoc, getDocs, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

const COLLECTION = 'admins';

export interface Admin {
  cedula: string;
  activo: boolean;
}

export async function getAllAdmins(): Promise<Admin[]> {
  const snap = await getDocs(collection(db, COLLECTION));
  return snap.docs.map(d => ({ cedula: d.id, activo: !!d.data()?.activo }));
}

export async function adminExists(cedula: string): Promise<boolean> {
  const snap = await getDoc(doc(db, COLLECTION, cedula));
  return snap.exists();
}

export async function registerAdmin(cedula: string): Promise<void> {
  await setDoc(doc(db, COLLECTION, cedula), { activo: true });
}

export async function setAdminActivo(cedula: string, activo: boolean): Promise<void> {
  await updateDoc(doc(db, COLLECTION, cedula), { activo });
}
