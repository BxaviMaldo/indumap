import { useState, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, TextInput, SafeAreaView, Modal, Alert, Switch,
} from 'react-native';
import { getEspaciosByBloque, updateEspacio } from '../services/espacios';
import type { Espacio, Piso, TipoEspacio } from '../types/espacio';

// ─── CONSTANTES ───────────────────────────────────────────────────────────────
const PISOS: Piso[] = ['PLANTA BAJA', 'PRIMERA PLANTA', 'SEGUNDA PLANTA'];
const PISO_LABEL: Record<Piso, string> = {
  'PLANTA BAJA':    'Planta Baja',
  'PRIMERA PLANTA': 'Primer Piso',
  'SEGUNDA PLANTA': 'Segundo Piso',
  'PLANTA ALTA':    'Planta Alta',
};

const TYPE_COLOR: Partial<Record<TipoEspacio, string>> = {
  'AULA':               '#1565C0',
  'LABORATORIO':        '#6A1B9A',
  'BAÑOS':              '#00838F',
  'INFORMATIVA':        '#37474F',
  'AUDITORIO':          '#F57C00',
};

const TYPE_ICON: Partial<Record<TipoEspacio, string>> = {
  'AULA': '🎓', 'LABORATORIO': '🔬', 'BAÑOS': '🚻', 'INFORMATIVA': 'ℹ️', 'AUDITORIO': '🎭',
};

// Tipos que por ahora NO se muestran (ni en el plano, ni en filtros, ni leyenda).
const HIDDEN_TIPOS: TipoEspacio[] = [
  'OFICINA', 'TALLER', 'ACCESO PRINCIPAL',
  'SALIDA / EVACUACIÓN', 'ENTRADA /SALIDA',
];

// El nombre que se muestra en el plano: los baños siempre dicen "Baños".
const roomLabel = (e: Espacio) => (e.tipo === 'BAÑOS' ? 'Baños' : e.nombre);

// ¿El espacio es una "Sala de docentes"? Se identifica por el nombre, así se
// puede separar de las aulas normales aunque en la BD tenga tipo AULA.
const esSalaDocente = (e: Espacio) => e.nombre.toLowerCase().includes('docente');

// ¿Es un slot vacío "Disponible" (aún sin asignar por un administrador)?
const esDisponible = (e: Espacio) => e.nombre.trim().toLowerCase() === 'disponible';

// ¿Un espacio coincide con la clave de filtro indicada?
const matchKey = (e: Espacio, key: string) => {
  if (esDisponible(e)) return false;                         // los vacíos no entran a ningún filtro
  if (key === 'SALADOC') return esSalaDocente(e);            // solo salas de docentes
  if (key === 'AULA')    return e.tipo === 'AULA' && !esSalaDocente(e); // aulas SIN salas docentes
  return e.tipo === key;
};

// Tipos que un administrador puede asignar a un área (los que tienen color/filtro)
const TIPOS_EDITABLES: TipoEspacio[] = ['AULA', 'LABORATORIO', 'AUDITORIO', 'BAÑOS', 'INFORMATIVA'];

// Filtros disponibles (en orden). El icono va dentro de la etiqueta.
const FILTROS = [
  { key: 'AULA',        label: '🎓 Aulas' },
  { key: 'SALADOC',     label: '🧑‍🏫 Sala de docentes' },
  { key: 'LABORATORIO', label: '🔬 Laboratorios' },
  { key: 'AUDITORIO',   label: '🎭 Auditorio' },
  { key: 'BAÑOS',       label: '🚻 Baños' },
  { key: 'INFORMATIVA', label: 'ℹ️ Informativa' },
];


type LayoutItem =
  | { nombre: string; col: 'I' | 'D'; weight?: number }
  | { feature: 'BAÑOS' | 'PASILLO'; label: string; col: 'I' | 'D'; weight?: number };

const LAYOUT_CONFIG: Record<string, LayoutItem[]> = {
  // 'A-PLANTA BAJA' usa un PLANO PROPIO (ver renderPlanoA0 en el componente).
  // 'A-PRIMERA PLANTA' usa un PLANO PROPIO (ver renderPlanoA1 en el componente),
  // por eso no se configura aquí.

  // 'A-SEGUNDA PLANTA' usa un PLANO PROPIO (ver renderPlanoA2 en el componente).
};

// Una celda del plano: un cuarto real de Firestore o un elemento especial visual
type PlanCell =
  | { kind: 'room'; espacio: Espacio; weight: number }
  | { kind: 'feature'; id: string; feature: 'BAÑOS' | 'PASILLO'; label: string; weight: number };

// Usa LAYOUT_CONFIG si existe para la clave bloque+piso; si no, alterna izq/der
function distributeRooms(rooms: Espacio[], key: string) {
  const cfg = LAYOUT_CONFIG[key];
  const left: PlanCell[] = [], right: PlanCell[] = [];

  if (!cfg) {
    rooms.forEach((r, i) => (i % 2 === 0 ? left : right).push({ kind: 'room', espacio: r, weight: 1 }));
    return { left, right };
  }

  const used = new Set<string>();
  cfg.forEach(item => {
    const target = item.col === 'I' ? left : right;
    const weight = item.weight ?? 1;
    // Elementos especiales (BAÑOS / PASILLO): ocupan una celda con su peso
    if ('feature' in item) {
      target.push({ kind: 'feature', id: `${key}-${item.feature}-${item.label}`, feature: item.feature, label: item.label, weight });
      return;
    }
    const match = rooms.find(
      r => r.nombre.toLowerCase().includes(item.nombre.toLowerCase()) && !used.has(r.id),
    );
    if (match) { used.add(match.id); target.push({ kind: 'room', espacio: match, weight }); }
  });
  // Cuartos que no están en la config → alternos al final (peso 1)
  rooms.filter(r => !used.has(r.id)).forEach((r, i) =>
    (i % 2 === 0 ? left : right).push({ kind: 'room', espacio: r, weight: 1 }),
  );
  return { left, right };
}

// ─── PLAN 2D — layout rectangular con dos columnas + pasillo central ─────────
const PLAN_W = 290;
const PLAN_H = 380;

// Columna izquierda
const COL_L = { x: 4,   y: 4, w: 108, h: PLAN_H - 8 };
// Pasillo central (alto base; el alto real según el piso se calcula en el componente)
const CORRIDOR = { x: 112, y: 4, w: 66, h: PLAN_H - 8 };
// Columna derecha
const COL_R = { x: 178, y: 4, w: 108, h: PLAN_H - 8 };

// Calcula el rectángulo de cada celda de una columna repartiendo el alto según
// los pesos (weight). Devuelve un rect por cada peso recibido.
function layoutColumn(
  weights: number[],
  colDef: { x: number; y: number; w: number; h: number },
) {
  const pad = 3;
  const total = weights.reduce((a, b) => a + b, 0) || 1;
  const usable = colDef.h - pad * 2;
  const rects: { x: number; y: number; w: number; h: number }[] = [];
  let y = colDef.y + pad;
  for (const w of weights) {
    const ch = usable * (w / total);
    rects.push({ x: colDef.x + pad, y, w: colDef.w - pad * 2, h: ch - 2 });
    y += ch;
  }
  return rects;
}

// ─── PROPS ────────────────────────────────────────────────────────────────────
type Props = {
  bloque: string;
  onBack: () => void;
  tipoUsuario?: 'visitante' | 'admin';
};

// ─── PANTALLA ─────────────────────────────────────────────────────────────────
export default function BloqueScreen({ bloque, onBack, tipoUsuario = 'visitante' }: Props) {
  const [todos,      setTodos]      = useState<Espacio[]>([]);
  const [piso,       setPiso]       = useState<Piso>('PLANTA BAJA');
  const [search,     setSearch]     = useState('');
  const [tipoFiltro, setTipoFiltro] = useState<string | null>(null);
  const [selRoom,    setSelRoom]    = useState<Espacio | null>(null);

  // ── Edición por administrador ──
  const esAdmin = tipoUsuario === 'admin';
  const [editRoom,    setEditRoom]    = useState<Espacio | null>(null);
  const [draftNombre, setDraftNombre] = useState('');
  const [draftTipo,   setDraftTipo]   = useState<TipoEspacio>('AULA');
  const [draftResp,   setDraftResp]   = useState('');
  const [draftActivo, setDraftActivo] = useState(true);
  const [saving,      setSaving]      = useState(false);

  const abrirEditar = (e: Espacio) => {
    setDraftNombre(esDisponible(e) ? '' : e.nombre);
    setDraftTipo(e.tipo);
    setDraftResp(e.responsable ?? '');
    setDraftActivo(e.activo !== false);
    setEditRoom(e);
  };

  // Aplica cambios al documento y al estado local (plano se actualiza al instante)
  const aplicarCambios = async (
    id: string,
    cambios: Partial<Pick<Espacio, 'nombre' | 'tipo' | 'responsable' | 'activo'>>,
  ) => {
    setSaving(true);
    try {
      await updateEspacio(id, cambios);
      setTodos(prev => prev.map(r => (r.id === id ? { ...r, ...cambios } : r)));
      setSelRoom(prev => (prev && prev.id === id ? { ...prev, ...cambios } : prev));
      setEditRoom(null);
      return true;
    } catch {
      Alert.alert('Error', 'No se pudo guardar el cambio. Revisa tu conexión.');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const guardarEdicion = () => {
    if (!editRoom) return;
    const nombre = draftNombre.trim();
    if (!nombre) { Alert.alert('Falta el nombre', 'Escribe un nombre para el área.'); return; }
    aplicarCambios(editRoom.id, { nombre, tipo: draftTipo, responsable: draftResp.trim(), activo: draftActivo });
  };

  // "Eliminar" = vaciar la zona (nombre, tipo y responsable) y dejarla como
  // "Disponible" para que un administrador la vuelva a asignar.
  const eliminarZona = () => {
    if (!editRoom) return;
    Alert.alert(
      'Eliminar zona',
      'Se borrarán el nombre, tipo y responsable. La zona quedará como "Disponible".',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => aplicarCambios(editRoom.id, {
            nombre: 'Disponible', tipo: 'AULA', responsable: '', activo: true,
          }),
        },
      ],
    );
  };

  useEffect(() => {
    getEspaciosByBloque(bloque as any).then(setTodos);
  }, [bloque]);

  // Espacios del piso actual (ocultando los tipos que no se usan por ahora)
  const porPiso = useMemo(
    () => todos.filter(e => e.piso === piso && !HIDDEN_TIPOS.includes(e.tipo)),
    [todos, piso],
  );

  // Filtro por tipo: ya NO oculta cuartos; solo sirve para MARCAR coincidencias.
  const matchesFilter = (e: Espacio) => !tipoFiltro || matchKey(e, tipoFiltro);

  // Búsqueda (resalta coincidencias) — sobre todos los espacios del piso
  const q = search.trim().toLowerCase();
  const highlighted = new Set(
    q ? porPiso.filter(e => e.nombre.toLowerCase().includes(q)).map(e => e.id) : [],
  );
  const isSearching = q.length > 0;

  // Distribución usando la config de layout — SIEMPRE con todos los cuartos del piso
  const layoutKey = `${bloque}-${piso}`;
  const { left, right } = useMemo(() => distributeRooms(porPiso, layoutKey), [porPiso, layoutKey]);

  // Rectángulos de cada celda repartiendo el alto según su peso (weight)
  const leftRects  = useMemo(() => layoutColumn(left.map(c => c.weight),  COL_L), [left]);
  const rightRects = useMemo(() => layoutColumn(right.map(c => c.weight), COL_R), [right]);

  // Estilo de una celda-cuarto según búsqueda / filtro / selección.
  // Centralizado para que TODOS los planos (genérico o propio) marquen igual.
  const roomStyle = (e: Espacio) => {
    // Slot vacío "Disponible": caja con borde punteado, lista para asignar
    if (esDisponible(e)) {
      const selected = selRoom?.id === e.id;
      return {
        backgroundColor: 'transparent',
        opacity: 1,
        borderWidth: selected ? 2.5 : 1.5,
        borderColor: selected ? '#fff' : '#3A5A7A',
        borderStyle: 'dashed' as const,
      };
    }
    const bg        = TYPE_COLOR[e.tipo] ?? '#607D8B';
    const searchHit = isSearching && highlighted.has(e.id);
    const filterHit = !!tipoFiltro && matchesFilter(e);
    const marked    = searchHit || filterHit;
    const dimmed    = !marked && (
      (isSearching && !highlighted.has(e.id)) ||
      (!!tipoFiltro && !matchesFilter(e))
    );
    const selected  = selRoom?.id === e.id;
    return {
      backgroundColor: searchHit ? '#FFD600' : bg,
      opacity: e.activo === false ? 0.35 : dimmed ? 0.4 : (selected || marked) ? 1 : 0.9,
      borderWidth: (selected || marked) ? 2.5 : 0,
      borderColor: '#fff',
    };
  };

  // Busca un cuarto del piso por coincidencia parcial de nombre (entre los visibles)
  const findRoom = (needle: string) =>
    porPiso.find(r => r.nombre.toLowerCase().includes(needle.toLowerCase()));

  // Igual que findRoom pero busca en TODO el piso (incluye tipos ocultos como
  // AUDITORIO). Útil para planos propios que sí quieren mostrar esos espacios.
  const findPiso = (needle: string) =>
    todos.find(r => r.piso === piso && r.nombre.toLowerCase().includes(needle.toLowerCase()));

  // Busca un cuarto por su id de documento (estable aunque cambie el nombre/tipo)
  const findId = (id: string) => todos.find(r => r.piso === piso && r.id === id);

  type Rect = { x: number; y: number; w: number; h: number };
  const rectStyle = (r: Rect) =>
    ({ position: 'absolute' as const, left: r.x, top: r.y, width: r.w, height: r.h });

  // ── Helpers de dibujo reutilizables por cualquier plano ──
  const RoomBox = (e: Espacio, r: Rect) => (
    <TouchableOpacity
      key={e.id}
      onPress={() => setSelRoom(prev => prev?.id === e.id ? null : e)}
      style={[s.cell, rectStyle(r), roomStyle(e)]}
      activeOpacity={0.8}
    >
      <Text style={s.cellTxt} numberOfLines={3}>{roomLabel(e)}</Text>
    </TouchableOpacity>
  );
  const AreaBox = (key: string, label: string, color: string, r: Rect) => (
    <View key={key} style={[s.cell, rectStyle(r), { backgroundColor: color, opacity: 0.9 }]}>
      <Text style={s.cellTxt} numberOfLines={3}>{label}</Text>
    </View>
  );
  // Como RoomBox, pero con key propia: permite dibujar VARIAS cajas que
  // representan el MISMO cuarto real (se marcan/seleccionan todas juntas).
  const LinkedRoomBox = (key: string, e: Espacio, r: Rect) => (
    <TouchableOpacity
      key={key}
      onPress={() => setSelRoom(prev => prev?.id === e.id ? null : e)}
      style={[s.cell, rectStyle(r), roomStyle(e)]}
      activeOpacity={0.8}
    >
      <Text style={s.cellTxt} numberOfLines={3}>{roomLabel(e)}</Text>
    </TouchableOpacity>
  );
  const PasilloBox = (key: string, label: string, r: Rect) => (
    <View key={key} style={[s.featurePasillo, rectStyle(r)]}>
      <Text style={s.featurePasilloTxt} numberOfLines={2}>{label}</Text>
    </View>
  );
  // Pasillo central con marca de "Entrada" (flecha ↑ + texto) al fondo.
  const CorridorBox = (r: Rect) => (
    <View key={`corr-${r.x}-${r.y}`} style={[s.corridorBg, rectStyle(r)]}>
      <Text style={s.corridorTxt}>PASILLO</Text>
      <View style={s.entradaWrap}>
        <Text style={s.entradaArrow}>↑</Text>
        <Text style={s.entradaTxt}>ENTRADA</Text>
      </View>
    </View>
  );

  // ── Celda del plano GENÉRICO (2 columnas + LAYOUT_CONFIG) ──
  const renderCell = (cell: PlanCell, r: Rect) => {
    if (cell.kind === 'feature') {
      if (cell.feature === 'PASILLO') return PasilloBox(cell.id, cell.label, r);
      return (
        <View key={cell.id} style={[s.featureBano, rectStyle(r)]}>
          <Text style={s.cellTxt} numberOfLines={2}>🚻 {cell.label}</Text>
        </View>
      );
    }
    return RoomBox(cell.espacio, r);
  };

  // ───────────────────────────────────────────────────────────────────────
  // PLANOS PROPIOS POR BLOQUE — cada bloque/piso puede tener su propio dibujo.
  // Si no hay uno propio, se usa el genérico de 2 columnas (LAYOUT_CONFIG).
  // ───────────────────────────────────────────────────────────────────────

  // ¿Este bloque/piso usa un plano propio en vez del genérico?
  // A y B tienen plano propio en sus tres pisos; C solo en planta baja (por ahora).
  const planoPropio =
    bloque === 'A' || bloque === 'B' || (bloque === 'C' && piso === 'PLANTA BAJA');

  // Plano propio: Bloque A — Planta Baja
  const renderPlanoA0 = () => {
    const decanato   = findId('DECANATO');
    const subdecano  = findId('SUBDECANO');
    const bano       = findId('BAÑOS_007');              // Baños 007
    const admin      = findId('ADM_DE_EDIFICIO');        // Administración de Edificio
    const direccion  = findId('DIR_DE_CARRERA');
    const secretaria = findId('SECRETARIA');             // Secretaría del Decanato
    const talento    = findId('TALENTO_HUMANO');         // Dpto. de Talento Humano
    const salaDoc    = findId('SALA_DOCENTES_001');      // Sala de Docentes 1
    return (
      <>
        {/* Pasillo central (baja por el medio hasta Dirección de Carrera) */}
        <View style={[s.corridorBg, rectStyle({ x: 112, y: 4, w: 66, h: 296 })]}>
          <Text style={s.corridorTxt}>PASILLO</Text>
        </View>

        {/* Izquierda: Decanato, Subdecano, Baños y Administración (alta) */}
        {decanato  && RoomBox(decanato,  { x: 4, y: 4,   w: 108, h: 70 })}
        {subdecano && RoomBox(subdecano, { x: 4, y: 76,  w: 108, h: 66 })}
        {bano      && RoomBox(bano,      { x: 4, y: 144, w: 108, h: 64 })}
        {admin     && RoomBox(admin,     { x: 4, y: 214, w: 108, h: 162 })}

        {/* Centro abajo: Dirección de Carrera */}
        {direccion && RoomBox(direccion, { x: 112, y: 300, w: 66, h: 76 })}

        {/* Derecha: Secretaría (grande), Pasillo de entrada, Talento Humano y Sala de Docentes */}
        {secretaria && RoomBox(secretaria, { x: 178, y: 4,   w: 108, h: 140 })}
        {PasilloBox('a0-pas', 'Pasillo de entrada', { x: 178, y: 150, w: 108, h: 58 })}
        {talento    && RoomBox(talento,    { x: 178, y: 214, w: 108, h: 80 })}
        {salaDoc    && RoomBox(salaDoc,    { x: 178, y: 298, w: 108, h: 78 })}
      </>
    );
  };

  // Plano propio: Bloque A — Primer Piso
  const renderPlanoA1 = () => {
    const instituto = findId('INST_POSTGRADO');
    const computo   = findId('LAB_14A_101');
    const bano      = findId('BAÑOS_004');
    const biblio    = findId('BIBLIOTECA');
    return (
      <>
        {/* Arriba: Instituto (izq) + Lab. Cómputo 14A 101 (der) */}
        {instituto && RoomBox(instituto, { x: 4,   y: 4, w: 108, h: 140 })}
        {computo   && RoomBox(computo,   { x: 178, y: 4, w: 108, h: 140 })}
        {/* Pasillo central: baja por el medio hasta la biblioteca central */}
        <View style={[s.corridorBg, rectStyle({ x: 112, y: 4, w: 66, h: 316 })]}>
          <Text style={s.corridorTxt}>PASILLO</Text>
        </View>

        {/* En medio: Baños (izq) + Pasillo de entrada (SOLO a la derecha) */}
        {bano && RoomBox(bano, { x: 4, y: 150, w: 108, h: 58 })}
        {PasilloBox('a1-pas', 'Pasillo de entrada', { x: 178, y: 150, w: 108, h: 58 })}

        {/* Abajo: Biblioteca. Izquierda y derecha altas hasta el borde inferior;
            la central, más pequeña, pegada al borde de abajo. Las tres son el
            mismo cuarto real → se marcan/seleccionan juntas. */}
        {biblio && LinkedRoomBox('a1-bib-l', biblio, { x: 4,   y: 214, w: 108, h: 162 })}
        {biblio && LinkedRoomBox('a1-bib-r', biblio, { x: 178, y: 214, w: 108, h: 162 })}
        {biblio && LinkedRoomBox('a1-bib-c', biblio, { x: 112, y: 320, w: 66,  h: 56 })}
      </>
    );
  };

  // Plano propio: Bloque A — Segundo Piso
  const renderPlanoA2 = () => {
    const lab202  = findId('LAB_14A_202');
    const lab201  = findId('LAB_14A_201');
    const aula202 = findId('AULA_14A_202');
    const aula201 = findId('AULA_14A_201');
    const dir     = findId('DIR_DE_CARRERA_TELEINFORMATICA');
    const bano    = findId('BAÑOS_006');
    const aula203 = findId('AULA_14A_203');
    const aula204 = findId('AULA_14A_204');
    const aula205 = findId('AULA_14A_205');
    const aula206 = findId('AULA_14A_206');
    const salaDoc = findId('SALA_DOCENTES_003');
    const reuni   = findId('SALA_REUNION_TUTORIAS');
    return (
      <>
        {/* Pasillo central (baja por el medio) */}
        <View style={[s.corridorBg, rectStyle({ x: 112, y: 46, w: 66, h: 330 })]}>
          <Text style={s.corridorTxt}>PASILLO</Text>
        </View>

        {/* Arriba al centro: Dirección de Carrera */}
        {dir && RoomBox(dir, { x: 112, y: 4, w: 66, h: 40 })}

        {/* Arriba: 2 áreas por lado (izq laboratorios, der aulas) */}
        {lab202  && RoomBox(lab202,  { x: 4,   y: 4,  w: 108, h: 70 })}
        {lab201  && RoomBox(lab201,  { x: 4,   y: 76, w: 108, h: 70 })}
        {aula202 && RoomBox(aula202, { x: 178, y: 4,  w: 108, h: 70 })}
        {aula201 && RoomBox(aula201, { x: 178, y: 76, w: 108, h: 70 })}

        {/* En medio: Baños (izq) + Pasillo de entrada (der, de frente al baño) */}
        {bano && RoomBox(bano, { x: 4, y: 152, w: 108, h: 56 })}
        {PasilloBox('a2-pas', 'Pasillo de entrada', { x: 178, y: 152, w: 108, h: 56 })}

        {/* Abajo izquierda: 3 aulas iguales + Sala de Reuniones (más chica) */}
        {aula203 && RoomBox(aula203, { x: 4, y: 214, w: 108, h: 44 })}
        {aula204 && RoomBox(aula204, { x: 4, y: 258, w: 108, h: 44 })}
        {aula205 && RoomBox(aula205, { x: 4, y: 302, w: 108, h: 44 })}
        {reuni   && RoomBox(reuni,   { x: 4, y: 346, w: 108, h: 30 })}

        {/* Abajo derecha: 2 áreas */}
        {salaDoc && RoomBox(salaDoc, { x: 178, y: 214, w: 108, h: 86 })}
        {aula206 && RoomBox(aula206, { x: 178, y: 300, w: 108, h: 76 })}
      </>
    );
  };

  // Plano propio: Bloque B — Planta Baja
  const renderPlanoB0 = () => {
    const lab001       = findId('LAB_14B_001');      // Laboratorio 14B 001
    const lab002       = findId('LAB_14B_002');      // Laboratorio 14B 002
    const bano         = findId('BAÑOS_002');        // Baños 002
    const conferencias = findId('SALA_CONFERENCIAS'); // Sala de Conferencias (AUDITORIO)
    const motoche      = findId('SALA_MOTOCHE');     // Sala Motoche (INFORMATIVA)
    return (
      <>
        {/* Pasillo central (baja desde debajo del baño hasta el fondo) */}
        {CorridorBox({ x: 112, y: 76, w: 66, h: 300 })}

        {/* Arriba al centro: Baños */}
        {bano && RoomBox(bano, { x: 112, y: 4, w: 66, h: 70 })}

        {/* Arriba: laboratorios (izq y der), altos */}
        {lab001 && RoomBox(lab001, { x: 4,   y: 4, w: 108, h: 204 })}
        {lab002 && RoomBox(lab002, { x: 178, y: 4, w: 108, h: 204 })}

        {/* Abajo: Sala de Conferencias (izq) + Sala Motoche (der) */}
        {conferencias && RoomBox(conferencias, { x: 4,   y: 214, w: 108, h: 162 })}
        {motoche      && RoomBox(motoche,      { x: 178, y: 214, w: 108, h: 162 })}
      </>
    );
  };

  // Plano propio: Bloque B — Primer Piso
  const renderPlanoB1 = () => {
    const lab101  = findId('LAB_14B_101');   // Laboratorio de Cómputo 14B 101
    const aula101 = findId('AULA_14B_101');
    const aula102 = findId('AULA_14B_102');
    const aula103 = findId('AULA_14B_103');
    return (
      <>
        {/* Pasillo central (completo) */}
        {CorridorBox({ x: 112, y: 4, w: 66, h: 372 })}

        {/* Izquierda: Lab. Cómputo 14B 101 (arriba) + Aula 14B 101 (abajo) */}
        {lab101  && RoomBox(lab101,  { x: 4, y: 4,   w: 108, h: 182 })}
        {aula101 && RoomBox(aula101, { x: 4, y: 190, w: 108, h: 186 })}

        {/* Derecha: Aula 14B 103 (arriba) + Aula 14B 102 (abajo) */}
        {aula103 && RoomBox(aula103, { x: 178, y: 4,   w: 108, h: 182 })}
        {aula102 && RoomBox(aula102, { x: 178, y: 190, w: 108, h: 186 })}
      </>
    );
  };

  // Plano propio: Bloque B — Segundo Piso
  const renderPlanoB2 = () => {
    const aula202 = findId('AULA_14B_202');
    const lab202  = findId('LAB_14B_202');
    const lab201  = findId('LAB_14B_201');
    const aula201 = findId('AULA_14B_201');
    return (
      <>
        {/* Pasillo central (completo) */}
        {CorridorBox({ x: 112, y: 4, w: 66, h: 372 })}

        {/* Izquierda: Aula 14B 202 (arriba) + Laboratorio 14B 201 (abajo) */}
        {aula202 && RoomBox(aula202, { x: 4, y: 4,   w: 108, h: 182 })}
        {lab201  && RoomBox(lab201,  { x: 4, y: 190, w: 108, h: 186 })}

        {/* Derecha: Laboratorio 14B 202 (arriba) + Aula 14B 201 (abajo) */}
        {lab202  && RoomBox(lab202,  { x: 178, y: 4,   w: 108, h: 182 })}
        {aula201 && RoomBox(aula201, { x: 178, y: 190, w: 108, h: 186 })}
      </>
    );
  };

  // Plano propio: Bloque C — Planta Baja
  const renderPlanoC0 = () => {
    const a006 = findId('AULA_14C_006');
    const a007 = findId('AULA_14C_007');
    const a005 = findId('AULA_14C_005');
    const a004 = findId('AULA_14C_004');
    const a003 = findId('AULA_14C_003');
    const bano = findId('BAÑOS_001');   // Baños
    const fue  = findId('FUESIIST');    // Fueiist - Asociación de Estudiantes
    const libre = findId('C_PB_LIBRE'); // Bloque vacío asignable por un administrador
    return (
      <>
        {/* Pasillo central */}
        <View style={[s.corridorBg, rectStyle({ x: 112, y: 4, w: 66, h: 372 })]}>
          <Text style={s.corridorTxt}>PASILLO</Text>
        </View>

        {/* Izquierda: 2 aulas, Pasillo de entrada (a la altura del baño) y el
            bloque vacío "Disponible" abajo (lo asigna un administrador). */}
        {a006 && RoomBox(a006, { x: 4, y: 4,   w: 108, h: 78 })}
        {a007 && RoomBox(a007, { x: 4, y: 86,  w: 108, h: 78 })}
        {PasilloBox('c0-pas', 'Pasillo de entrada', { x: 4, y: 168, w: 108, h: 54 })}
        {libre && RoomBox(libre, { x: 4, y: 226, w: 108, h: 150 })}

        {/* Derecha: aulas, Baños y FUESIIST */}
        {a005 && RoomBox(a005, { x: 178, y: 4,   w: 108, h: 78 })}
        {a004 && RoomBox(a004, { x: 178, y: 86,  w: 108, h: 78 })}
        {bano && RoomBox(bano, { x: 178, y: 168, w: 108, h: 54 })}
        {a003 && RoomBox(a003, { x: 178, y: 226, w: 108, h: 70 })}
        {fue  && RoomBox(fue,  { x: 178, y: 300, w: 108, h: 76 })}
      </>
    );
  };

  // Chips de filtro: solo los que tienen al menos un área en este piso
  const allFilters = FILTROS.filter(f => porPiso.some(e => matchKey(e, f.key)));

  return (
    <SafeAreaView style={s.safe}>

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={onBack}>
          <Text style={s.backTxt}>← Mapa</Text>
        </TouchableOpacity>
        <Text style={s.hTitle}>Bloque {bloque}</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Tabs de piso */}
      <View style={s.tabs}>
        {PISOS.filter(p => todos.some(e => e.piso === p)).map(p => (
          <TouchableOpacity
            key={p}
            style={[s.tab, piso === p && s.tabActive]}
            onPress={() => { setPiso(p); setSelRoom(null); }}
          >
            <Text style={[s.tabTxt, piso === p && s.tabTxtActive]}>
              {PISO_LABEL[p]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled">

        {/* Búsqueda */}
        <View style={s.searchWrap}>
          <TextInput
            style={s.searchInput}
            placeholder="Buscar espacio, aula, laboratorio..."
            placeholderTextColor="#64748B"
            value={search}
            onChangeText={v => { setSearch(v); setSelRoom(null); }}
          />
          {search.length > 0 && (
            <TouchableOpacity style={s.clearBtn} onPress={() => setSearch('')}>
              <Text style={s.clearTxt}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Chips de filtro */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterRow} contentContainerStyle={{ gap: 6, paddingHorizontal: 14 }}>
          <TouchableOpacity
            style={[s.fchip, tipoFiltro === null && s.fchipActive]}
            onPress={() => setTipoFiltro(null)}
          >
            <Text style={[s.fchipTxt, tipoFiltro === null && s.fchipTxtActive]}>Todos</Text>
          </TouchableOpacity>
          {allFilters.map(f => (
            <TouchableOpacity
              key={f.key}
              style={[s.fchip, tipoFiltro === f.key && s.fchipActive]}
              onPress={() => setTipoFiltro(tipoFiltro === f.key ? null : f.key)}
            >
              <Text style={[s.fchipTxt, tipoFiltro === f.key && s.fchipTxtActive]}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ─── PLANO 2D ─────────────────────────────────────────── */}
        <View style={s.planWrap}>
          {/* Contenedor del plano con borde de edificio */}
          <View style={s.buildingOutline}>
            <View style={{ width: PLAN_W, height: PLAN_H, position: 'relative' }}>

              {planoPropio ? (
                /* ── Plano propio del bloque/piso ── */
                bloque === 'B'
                  ? (piso === 'PLANTA BAJA' ? renderPlanoB0()
                      : piso === 'PRIMERA PLANTA' ? renderPlanoB1()
                      : renderPlanoB2())
                  : bloque === 'C' ? renderPlanoC0()
                  : piso === 'PLANTA BAJA' ? renderPlanoA0()
                  : piso === 'PRIMERA PLANTA' ? renderPlanoA1()
                  : renderPlanoA2()
              ) : (
                /* ── Plano genérico de 2 columnas ── */
                <>
                  {/* Columna izquierda (fondo) */}
                  <View style={[s.colBg, { left: COL_L.x, top: COL_L.y, width: COL_L.w, height: COL_L.h }]} />
                  {/* Pasillo central */}
                  <View style={[s.corridorBg, { left: CORRIDOR.x, top: CORRIDOR.y, width: CORRIDOR.w, height: CORRIDOR.h }]}>
                    <Text style={s.corridorTxt}>PASILLO</Text>
                  </View>
                  {/* Columna derecha (fondo) */}
                  <View style={[s.colBg, { left: COL_R.x, top: COL_R.y, width: COL_R.w, height: COL_R.h }]} />

                  {/* Divisores horizontales entre rooms */}
                  {Array.from({ length: Math.max(left.length, right.length) - 1 }, (_, i) => {
                    const total = Math.max(left.length, right.length, 1);
                    const y = COL_L.y + (COL_L.h / total) * (i + 1);
                    return (
                      <View key={`div${i}`} style={{ position: 'absolute', left: 4, top: y, width: COL_L.w + COL_R.w + CORRIDOR.w - 2, height: 1, backgroundColor: '#0B1829' }} />
                    );
                  })}

                  {/* Celdas izquierda y derecha (cada una con su rect por peso) */}
                  {left.map((c, i)  => renderCell(c, leftRects[i]))}
                  {right.map((c, i) => renderCell(c, rightRects[i]))}
                </>
              )}
            </View>
          </View>
          {/* <Text style={s.entradaLabel}>↓ Entrada principal</Text> */}
        </View>

        {/* Resultado de búsqueda */}
        {isSearching && (
          <View style={s.resultWrap}>
            <Text style={s.resultTitle}>
              {highlighted.size} resultado{highlighted.size !== 1 ? 's' : ''} para "{search}"
            </Text>
            {porPiso.filter(e => highlighted.has(e.id)).map(e => (
              <TouchableOpacity key={e.id} style={s.resultItem} onPress={() => setSelRoom(e)}>
                <View style={[s.resultDot, { backgroundColor: TYPE_COLOR[e.tipo] ?? '#888' }]} />
                <View>
                  <Text style={s.resultName}>{e.nombre}</Text>
                  <Text style={s.resultSub}>{e.tipo} · {PISO_LABEL[e.piso]}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Leyenda de tipos */}
        <View style={s.legend}>
          <Text style={s.legendTitle}>Leyenda</Text>
          <View style={s.legendGrid}>
            {Object.entries(TYPE_COLOR).map(([tipo, color]) => (
              <View key={tipo} style={s.legendItem}>
                <View style={[s.legendDot, { backgroundColor: color }]} />
                <Text style={s.legendTxt}>{tipo}</Text>
              </View>
            ))}
            <View style={s.legendItem}>
              <View style={[s.legendDot, { backgroundColor: '#FFD600' }]} />
              <Text style={s.legendTxt}>Búsqueda</Text>
            </View>
          </View>
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Panel de detalle al seleccionar celda */}
      {selRoom && (
        <View style={s.detail}>
          <View style={[s.detailBar, { backgroundColor: TYPE_COLOR[selRoom.tipo] ?? '#333' }]} />
          <View style={s.detailBody}>
            <View style={{ flex: 1 }}>
              <Text style={s.detailName}>{roomLabel(selRoom)}</Text>
              <Text style={s.detailSub}>
                {TYPE_ICON[selRoom.tipo]} {selRoom.tipo}
                {selRoom.responsable ? ` · ${selRoom.responsable}` : ''}
                {selRoom.activo === false ? ' · INACTIVO' : ''}
              </Text>
            </View>
            {esAdmin && (
              <TouchableOpacity onPress={() => abrirEditar(selRoom)} style={s.detailEdit}>
                <Text style={s.detailEditTxt}>✏️ Editar</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={() => setSelRoom(null)} style={s.detailClose}>
              <Text style={s.detailCloseTxt}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── Modal de edición (solo administradores) ── */}
      <Modal
        visible={!!editRoom}
        transparent
        animationType="slide"
        onRequestClose={() => setEditRoom(null)}
      >
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>Editar área</Text>

            <Text style={s.modalLabel}>Nombre</Text>
            <TextInput
              style={s.modalInput}
              value={draftNombre}
              onChangeText={setDraftNombre}
              placeholder="Ej. Sala de Docentes"
              placeholderTextColor="#64748B"
            />

            <Text style={s.modalLabel}>Tipo</Text>
            <View style={s.modalChips}>
              {TIPOS_EDITABLES.map(t => (
                <TouchableOpacity
                  key={t}
                  style={[s.modalChip, draftTipo === t && s.modalChipActive]}
                  onPress={() => setDraftTipo(t)}
                >
                  <Text style={[s.modalChipTxt, draftTipo === t && s.modalChipTxtActive]}>
                    {TYPE_ICON[t]} {t}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.modalLabel}>Responsable</Text>
            <TextInput
              style={s.modalInput}
              value={draftResp}
              onChangeText={setDraftResp}
              placeholder="Ej. Gestión Académica"
              placeholderTextColor="#64748B"
            />

            <View style={s.modalActivoRow}>
              <Text style={s.modalLabel}>Zona activa</Text>
              <Switch value={draftActivo} onValueChange={setDraftActivo} />
            </View>

            <TouchableOpacity style={s.modalDelete} onPress={eliminarZona} disabled={saving}>
              <Text style={s.modalDeleteTxt}>🗑️  Eliminar zona (dejar como Disponible)</Text>
            </TouchableOpacity>

            <View style={s.modalBtns}>
              <TouchableOpacity style={s.modalCancel} onPress={() => setEditRoom(null)} disabled={saving}>
                <Text style={s.modalCancelTxt}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.modalSave, saving && { opacity: 0.5 }]} onPress={guardarEdicion} disabled={saving}>
                <Text style={s.modalSaveTxt}>{saving ? 'Guardando…' : 'Guardar'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

// ─── ESTILOS ──────────────────────────────────────────────────────────────────
const C = { navy: '#001D41', bg: '#0B1829', card: '#0F2035', border: '#1E3A5F', text: '#E2E8F0', sub: '#64748B' };

const s = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: C.bg },

  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingTop: 40, paddingBottom: 12, backgroundColor: C.navy },
  backBtn:      { paddingVertical: 6, paddingHorizontal: 4 },
  backTxt:      { color: '#00A9E0', fontSize: 14, fontWeight: '700' },
  hTitle:       { color: '#fff', fontSize: 16, fontWeight: '900' },

  tabs:         { flexDirection: 'row', backgroundColor: C.navy, paddingHorizontal: 14, paddingBottom: 10, gap: 8 },
  tab:          { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center', backgroundColor: '#ffffff12' },
  tabActive:    { backgroundColor: '#00A9E0' },
  tabTxt:       { color: '#94A3B8', fontSize: 12, fontWeight: '600' },
  tabTxtActive: { color: '#fff', fontWeight: '800' },

  searchWrap:   { flexDirection: 'row', alignItems: 'center', marginHorizontal: 14, marginTop: 14, marginBottom: 8, backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.border, paddingHorizontal: 12 },
  searchInput:  { flex: 1, color: '#fff', fontSize: 13, paddingVertical: 10 },
  clearBtn:     { padding: 6 },
  clearTxt:     { color: C.sub, fontSize: 13 },

  filterRow:    { marginBottom: 12 },
  fchip:        { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: C.card, borderWidth: 1, borderColor: C.border },
  fchipActive:  { backgroundColor: '#00A9E0', borderColor: '#00A9E0' },
  fchipTxt:     { color: C.sub, fontSize: 11, fontWeight: '600' },
  fchipTxtActive:{ color: '#fff', fontWeight: '800' },

  planWrap:       { alignItems: 'center', marginVertical: 8, marginTop: 25},
  buildingOutline:{ borderWidth: 2, borderColor: '#2A4A6A', borderRadius: 6, overflow: 'hidden', backgroundColor: '#0B1829' },
  colBg:          { position: 'absolute', backgroundColor: '#0F2035' },
  corridorBg:     { position: 'absolute', backgroundColor: '#071220', alignItems: 'center', justifyContent: 'center' },
  corridorTxt:    { color: '#1E3A5F', fontSize: 8, fontWeight: '800', letterSpacing: 2, transform: [{ rotate: '90deg' }] },
  // Marca de "Entrada" al fondo del pasillo (misma letra que el pasillo, pero horizontal)
  entradaWrap:    { position: 'absolute', bottom: 8, left: 0, right: 0, alignItems: 'center' },
  entradaArrow:   { color: '#1E3A5F', fontSize: 14, fontWeight: '800', lineHeight: 16 },
  entradaTxt:     { color: '#1E3A5F', fontSize: 8, fontWeight: '800', letterSpacing: 2 },
  entradaLabel:   { color: C.sub, fontSize: 10, marginTop: 8 },

  cell:         { borderRadius: 3, alignItems: 'center', justifyContent: 'center', padding: 2 },
  cellTxt:      { color: '#fff', fontSize: 7, textAlign: 'center', fontWeight: '700', lineHeight: 9 },

  // Baños — celda de servicio (color teal, igual que el tipo BAÑOS)
  featureBano:    { borderRadius: 3, alignItems: 'center', justifyContent: 'center', padding: 2, backgroundColor: '#00838F', opacity: 0.92 },
  // Pasillo de entrada — franja tipo corredor (mismo look que el pasillo central)
  featurePasillo: { borderRadius: 3, alignItems: 'center', justifyContent: 'center', padding: 2, backgroundColor: '#071220' },
  // Misma tipografía que corridorTxt (tamaño 8, peso 800, espaciado 2), sin rotar
  featurePasilloTxt: { color: '#1E3A5F', fontSize: 8, textAlign: 'center', fontWeight: '800', letterSpacing: 2 },

  resultWrap:   { marginHorizontal: 14, marginBottom: 14 },
  resultTitle:  { color: '#FFD600', fontSize: 12, fontWeight: '700', marginBottom: 8 },
  resultItem:   { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.card, borderRadius: 10, padding: 12, marginBottom: 6, borderWidth: 1, borderColor: C.border },
  resultDot:    { width: 10, height: 10, borderRadius: 5 },
  resultName:   { color: '#fff', fontSize: 13, fontWeight: '700' },
  resultSub:    { color: C.sub, fontSize: 11, marginTop: 2 },

  legend:       { marginHorizontal: 14, marginTop: 25, backgroundColor: C.card, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: C.border, marginBottom: 8 },
  legendTitle:  { color: '#fff', fontSize: 12, fontWeight: '800', marginBottom: 10 },
  legendGrid:   { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  legendItem:   { flexDirection: 'row', alignItems: 'center', gap: 5, width: '47%' },
  legendDot:    { width: 10, height: 10, borderRadius: 5 },
  legendTxt:    { color: C.sub, fontSize: 10 },

  detail:       { flexDirection: 'row', backgroundColor: '#fff', marginHorizontal: 12, marginBottom: 16, borderRadius: 14, overflow: 'hidden', elevation: 8 },
  detailBar:    { width: 6 },
  detailBody:   { flex: 1, flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10 },
  detailName:   { fontSize: 15, fontWeight: '900', color: C.navy },
  detailSub:    { fontSize: 11, color: '#475569', marginTop: 3 },
  detailClose:  { width: 28, height: 28, borderRadius: 14, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  detailCloseTxt:{ fontSize: 12, color: '#475569', fontWeight: '700' },
  detailEdit:   { backgroundColor: '#00A9E0', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  detailEditTxt:{ color: '#fff', fontSize: 12, fontWeight: '800' },

  // ── Modal de edición ──
  modalOverlay:  { flex: 1, backgroundColor: '#00000088', justifyContent: 'flex-end' },
  modalCard:     { backgroundColor: C.bg, borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 20, borderTopWidth: 1, borderColor: C.border },
  modalTitle:    { color: '#fff', fontSize: 17, fontWeight: '900', marginBottom: 14 },
  modalLabel:    { color: C.sub, fontSize: 12, fontWeight: '700', marginTop: 10, marginBottom: 6 },
  modalInput:    { backgroundColor: C.card, borderRadius: 10, borderWidth: 1, borderColor: C.border, color: '#fff', fontSize: 14, paddingHorizontal: 12, paddingVertical: 10 },
  modalChips:    { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  modalChip:     { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: C.card, borderWidth: 1, borderColor: C.border },
  modalChipActive:{ backgroundColor: '#00A9E0', borderColor: '#00A9E0' },
  modalChipTxt:  { color: C.sub, fontSize: 12, fontWeight: '600' },
  modalChipTxtActive:{ color: '#fff', fontWeight: '800' },
  modalActivoRow:{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 },
  modalDelete:   { marginTop: 16, paddingVertical: 11, borderRadius: 10, borderWidth: 1, borderColor: '#B71C1C', alignItems: 'center' },
  modalDeleteTxt:{ color: '#EF5350', fontSize: 13, fontWeight: '700' },
  modalBtns:     { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 20 },
  modalCancel:   { paddingHorizontal: 16, paddingVertical: 11, borderRadius: 10, backgroundColor: C.card },
  modalCancelTxt:{ color: C.text, fontSize: 14, fontWeight: '700' },
  modalSave:     { paddingHorizontal: 20, paddingVertical: 11, borderRadius: 10, backgroundColor: '#00A9E0' },
  modalSaveTxt:  { color: '#fff', fontSize: 14, fontWeight: '800' },
});
