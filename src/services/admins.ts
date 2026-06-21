import { collection, doc, getDoc, getDocs, setDoc, updateDoc } from 'firebase/firestore';
import { initializeApp, deleteApp } from 'firebase/app';
import { createUserWithEmailAndPassword, getAuth, signOut } from 'firebase/auth';
import { db, firebaseConfig } from '../config/firebase';
import { sendProvisionalPasswordEmail } from './mail';

const COLLECTION = 'admins';

// Se lanza cuando el admin SÍ quedó creado (Auth + Firestore) pero el correo
// con la contraseña provisional no se pudo enviar. Trae la contraseña para
// que la pantalla la muestre y el admin actual la comparta manualmente.
export class EmailSendError extends Error {
  tempPassword: string;
  constructor(tempPassword: string) {
    super('El administrador se creó, pero no se pudo enviar el correo.');
    this.tempPassword = tempPassword;
  }
}

export interface Admin {
  cedula: string;
  email: string;
  activo: boolean;
  mustChangePassword: boolean;
}

export async function getAllAdmins(): Promise<Admin[]> {
  const snap = await getDocs(collection(db, COLLECTION));
  return snap.docs.map(d => ({
    cedula: d.id,
    email: d.data()?.email ?? '',
    activo: !!d.data()?.activo,
    mustChangePassword: !!d.data()?.mustChangePassword,
  }));
}

export async function adminExists(cedula: string): Promise<boolean> {
  const snap = await getDoc(doc(db, COLLECTION, cedula));
  return snap.exists();
}

function generateTempPassword(length = 10): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  let pwd = '';
  for (let i = 0; i < length; i++) pwd += chars[Math.floor(Math.random() * chars.length)];
  return pwd;
}

// Crea el usuario de Firebase Auth usando una app SECUNDARIA y temporal, para
// no cerrar la sesión del admin que está registrando (createUserWithEmail
// inicia sesión automáticamente en la instancia de Auth que se use).
async function createAuthUserWithoutSwitchingSession(email: string, password: string): Promise<void> {
  const secondary = initializeApp(firebaseConfig, `secondary-${Date.now()}`);
  const secondaryAuth = getAuth(secondary);
  try {
    await createUserWithEmailAndPassword(secondaryAuth, email, password);
  } finally {
    await signOut(secondaryAuth).catch(() => {});
    await deleteApp(secondary).catch(() => {});
  }
}

// Registra un nuevo administrador: crea su cuenta de Firebase Auth con una
// contraseña provisional, guarda el doc en Firestore y le envía el correo.
// Si el envío del correo falla, el admin SÍ queda creado (Auth + Firestore);
// se relanza el error para que la pantalla pueda mostrar la contraseña y que
// el admin actual la comparta manualmente.
export async function registerAdmin(cedula: string, email: string): Promise<{ tempPassword: string }> {
  if (await adminExists(cedula)) {
    throw new Error('Esa cédula ya está registrada como administrador.');
  }

  const tempPassword = generateTempPassword();

  try {
    await createAuthUserWithoutSwitchingSession(email, tempPassword);
  } catch (err: any) {
    if (err?.code === 'auth/email-already-in-use') {
      throw new Error('Ese correo ya está en uso por otra cuenta.');
    }
    throw new Error('No se pudo crear la cuenta del administrador.');
  }

  await setDoc(doc(db, COLLECTION, cedula), {
    cedula,
    tipo: 'admin',
    activo: true,
    email,
    mustChangePassword: true,
  });

  try {
    await sendProvisionalPasswordEmail(email, cedula, tempPassword);
  } catch {
    throw new EmailSendError(tempPassword);
  }

  return { tempPassword };
}

export async function setAdminActivo(cedula: string, activo: boolean): Promise<void> {
  await updateDoc(doc(db, COLLECTION, cedula), { activo });
}

export async function markPasswordChanged(cedula: string): Promise<void> {
  await updateDoc(doc(db, COLLECTION, cedula), { mustChangePassword: false });
}
