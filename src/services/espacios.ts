import { collection, doc, getDoc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '../config/firebase';
import { Espacio, Bloque, Piso } from '../types/espacio';

const COLLECTION = 'espacios';

// ─── CACHÉ OFFLINE ─────────────────────────────────────────────────────────
// Guardamos la lista de espacios en el dispositivo (AsyncStorage). Cuando hay
// internet se descargan de Firestore y se guardan; cuando NO hay internet se
// leen de esta copia local, así la vista de visitante funciona sin conexión.
const CACHE_KEY = 'indumap_espacios_cache_v1';

async function readCache(): Promise<Espacio[] | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as Espacio[]) : null;
  } catch {
    return null;
  }
}

async function writeCache(list: Espacio[]): Promise<void> {
  try {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(list));
  } catch {
    // Si falla el guardado local no rompemos el flujo online.
  }
}

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
  try {
    const q = query(collection(db, COLLECTION), where('bloque', '==', bloque));
    const snap = await getDocs(q);
    const list = snap.docs.map(toEspacio);
    // Mezcla en la caché: reemplaza los de este bloque y conserva los demás.
    const cached = (await readCache()) ?? [];
    await writeCache([...cached.filter(e => e.bloque !== bloque), ...list]);
    return list;
  } catch (err) {
    // Sin internet: devolver desde la copia local (filtrando por bloque).
    const cached = await readCache();
    if (cached) return cached.filter(e => e.bloque === bloque);
    throw err;
  }
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
  try {
    const snap = await getDocs(collection(db, COLLECTION));
    const list = snap.docs.map(toEspacio);
    await writeCache(list);   // guarda la copia completa para uso offline
    return list;
  } catch (err) {
    // Sin internet: devolver la copia local si existe.
    const cached = await readCache();
    if (cached) return cached;
    throw err;
  }
}

export async function updateEspacio(
  id: string,
  data: Partial<Pick<Espacio, 'nombre' | 'tipo' | 'responsable' | 'activo'>>,
): Promise<void> {
  await updateDoc(doc(db, COLLECTION, id), data);
  // Reflejar el cambio en la copia local para que la vista offline quede al día.
  const cached = await readCache();
  if (cached) {
    await writeCache(cached.map(e => e.id === id ? { ...e, ...data } : e));
  }
}
