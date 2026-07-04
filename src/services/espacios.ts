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

// Sin internet, Firestore no falla rápido: se queda esperando red. Con esto,
// si no responde en unos segundos, lanzamos error para usar la copia local.
const NET_TIMEOUT_MS = 3500;
function withTimeout<T>(p: Promise<T>): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('sin-conexion')), NET_TIMEOUT_MS)),
  ]);
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
  const cached = await readCache();
  try {
    const q = query(collection(db, COLLECTION), where('bloque', '==', bloque));
    const snap = await withTimeout(getDocs(q));
    const list = snap.docs.map(toEspacio);
    if (list.length > 0) {
      // Solo si vinieron datos reales: mezcla en la caché (reemplaza este bloque).
      const base = cached ?? [];
      await writeCache([...base.filter(e => e.bloque !== bloque), ...list]);
      return list;
    }
    // Respuesta vacía (probable sin conexión): usar la copia local.
    if (cached) return cached.filter(e => e.bloque === bloque);
    return list;
  } catch (err) {
    // Sin internet: devolver desde la copia local (filtrando por bloque).
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
  const cached = await readCache();
  try {
    const snap = await withTimeout(getDocs(collection(db, COLLECTION)));
    const list = snap.docs.map(toEspacio);
    if (list.length > 0) {
      await writeCache(list);   // solo sobrescribe la copia local si vinieron datos
      return list;
    }
    // Respuesta vacía (probable sin conexión): usar la copia local si existe.
    return cached && cached.length ? cached : list;
  } catch (err) {
    // Sin internet: devolver la copia local si existe.
    if (cached && cached.length) return cached;
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
