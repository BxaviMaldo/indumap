import { doc, getDoc } from 'firebase/firestore';
import { signInWithEmailAndPassword, signOut, updatePassword } from 'firebase/auth';
import { db, auth } from '../config/firebase';

export class AdminLoginError extends Error {}

// Login de admin: la cédula identifica el documento en Firestore (que guarda
// el email real), pero la autenticación real ocurre en Firebase Auth con
// email + contraseña.
export async function loginAdmin(
  cedula: string,
  password: string,
): Promise<{ mustChangePassword: boolean }> {
  const snap = await getDoc(doc(db, 'admins', cedula));
  if (!snap.exists()) throw new AdminLoginError('La cédula no está registrada como administrador.');

  const data = snap.data();
  if (!data?.activo) throw new AdminLoginError('Este administrador está inactivo.');
  if (!data?.email) throw new AdminLoginError('Esta cuenta no tiene un correo configurado.');

  try {
    await signInWithEmailAndPassword(auth, data.email, password);
  } catch {
    throw new AdminLoginError('Cédula o contraseña incorrectos.');
  }

  return { mustChangePassword: !!data.mustChangePassword };
}

export async function logoutAdmin(): Promise<void> {
  await signOut(auth).catch(() => {});
}

// Cambio de contraseña obligatorio en el primer ingreso (requiere sesión activa).
export async function changeOwnPassword(newPassword: string): Promise<void> {
  if (!auth.currentUser) throw new Error('No hay sesión activa.');
  await updatePassword(auth.currentUser, newPassword);
}
