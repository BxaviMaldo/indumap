import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Espacio, Bloque, Piso } from '../types/espacio';

const COLLECTION = 'espacios';

export async function getEspacioById(id: string): Promise<Espacio | null> {
  const snap = await getDoc(doc(db, COLLECTION, id));
  return snap.exists() ? (snap.data() as Espacio) : null;
}

export async function getEspaciosByBloque(bloque: Bloque): Promise<Espacio[]> {
  const q = query(collection(db, COLLECTION), where('bloque', '==', bloque));
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data() as Espacio);
}

export async function getEspaciosByPiso(bloque: Bloque, piso: Piso): Promise<Espacio[]> {
  const q = query(
    collection(db, COLLECTION),
    where('bloque', '==', bloque),
    where('piso', '==', piso)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data() as Espacio);
}

export async function getAllEspacios(): Promise<Espacio[]> {
  const snap = await getDocs(collection(db, COLLECTION));
  return snap.docs.map(d => d.data() as Espacio);
}
