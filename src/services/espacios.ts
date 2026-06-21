import { collection, doc, getDoc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Espacio, Bloque, Piso } from '../types/espacio';

const COLLECTION = 'espacios';

// El campo "id" ya no se guarda dentro del documento (es redundante con la
// clave del documento en Firestore). Lo reconstruimos aquí a partir de d.id.
function toEspacio(d: { id: string; data: () => any }): Espacio {
  return { id: d.id, ...d.data() } as Espacio;
}

export async function getEspacioById(id: string): Promise<Espacio | null> {
  const snap = await getDoc(doc(db, COLLECTION, id));
  return snap.exists() ? toEspacio(snap) : null;
}

export async function getEspaciosByBloque(bloque: Bloque): Promise<Espacio[]> {
  const q = query(collection(db, COLLECTION), where('bloque', '==', bloque));
  const snap = await getDocs(q);
  return snap.docs.map(toEspacio);
}

export async function getEspaciosByPiso(bloque: Bloque, piso: Piso): Promise<Espacio[]> {
  const q = query(
    collection(db, COLLECTION),
    where('bloque', '==', bloque),
    where('piso', '==', piso)
  );
  const snap = await getDocs(q);
  return snap.docs.map(toEspacio);
}

export async function getAllEspacios(): Promise<Espacio[]> {
  const snap = await getDocs(collection(db, COLLECTION));
  return snap.docs.map(toEspacio);
}

export async function updateEspacio(
  id: string,
  data: Partial<Pick<Espacio, 'nombre' | 'tipo' | 'responsable' | 'activo'>>,
): Promise<void> {
  await updateDoc(doc(db, COLLECTION, id), data);
}
