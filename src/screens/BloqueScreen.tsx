import { useState, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, TextInput, SafeAreaView,
} from 'react-native';
import { getEspaciosByBloque } from '../services/espacios';
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
  'OFICINA':            '#E65100',
  'INFORMATIVA':        '#37474F',
  'TALLER':             '#4E342E',
  'AUDITORIO':          '#AD1457',
  'ACCESO PRINCIPAL':   '#2E7D32',
  'SALIDA / EVACUACIÓN':'#B71C1C',
  'ENTRADA /SALIDA':    '#BF360C',
};

const TYPE_ICON: Partial<Record<TipoEspacio, string>> = {
  'AULA': '🎓', 'LABORATORIO': '🔬', 'BAÑOS': '🚻',
  'OFICINA': '🗂️', 'TALLER': '🔧', 'AUDITORIO': '🎭',
  'ACCESO PRINCIPAL': '🚪', 'SALIDA / EVACUACIÓN': '🚨',
  'ENTRADA /SALIDA': '↔️', 'INFORMATIVA': 'ℹ️',
};

// Grupos de filtros adicionales
const FILTER_GROUPS = [
  { key: 'PRACTICA', label: 'Prácticas', types: ['LABORATORIO', 'TALLER'] as TipoEspacio[] },
  { key: 'SERVICIOS', label: 'Servicios', types: ['BAÑOS', 'ACCESO PRINCIPAL', 'ENTRADA /SALIDA', 'SALIDA / EVACUACIÓN'] as TipoEspacio[] },
  { key: 'DOCENCIA', label: 'Docencia', types: ['AULA', 'AUDITORIO'] as TipoEspacio[] },
  { key: 'ADMIN', label: 'Oficinas', types: ['OFICINA', 'INFORMATIVA'] as TipoEspacio[] },
];


type LayoutItem =
  | { nombre: string; col: 'I' | 'D'; weight?: number }
  | { feature: 'BAÑOS' | 'PASILLO'; label: string; col: 'I' | 'D'; weight?: number };

const LAYOUT_CONFIG: Record<string, LayoutItem[]> = {
  'A-PLANTA BAJA': [
    { nombre: 'Decanato',                    col: 'I' },
    { nombre: 'Secretar',                    col: 'D', weight: 3.5 },  // Secretaría (área grande)
    { feature: 'PASILLO', label: 'Pasillo de entrada', col: 'D', weight: 1 },  // franja delgada
    { nombre: 'Subdecano',                   col: 'I' },
    { feature: 'BAÑOS', label: 'Baños',      col: 'I' },
    { nombre: 'talento humano',              col: 'D', weight: 2 },  // Dpto. De talento humano
    { nombre: 'Administración',              col: 'I' },  // Administración de edificio
    { nombre: 'Sala de docentes',            col: 'D', weight: 1.5 },  // más pequeña
    { nombre: 'Direcci',                     col: 'I' },  // Dirección de Carrera industrial
    { nombre: 'conferencias',                col: 'D' },  // Sala de conferencias
    { nombre: 'Info',                        col: 'D' },
  ],
  // 'A-PRIMERA PLANTA' usa un PLANO PROPIO (ver renderPlanoA1 en el componente),
  // por eso no se configura aquí.

  'A-SEGUNDA PLANTA': [
    { nombre: 'Direcci',                     col: 'I' },  // Dirección de carrera
    { nombre: 'reuni',                       col: 'I' },  // Sala de reunión
    { nombre: 'Sala de docentes',            col: 'D' },
    // Los laboratorios (14A 201-206) no están aquí → se distribuyen automáticamente
  ],
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
};

// ─── PANTALLA ─────────────────────────────────────────────────────────────────
export default function BloqueScreen({ bloque, onBack }: Props) {
  const [todos,      setTodos]      = useState<Espacio[]>([]);
  const [piso,       setPiso]       = useState<Piso>('PLANTA BAJA');
  const [search,     setSearch]     = useState('');
  const [tipoFiltro, setTipoFiltro] = useState<string | null>(null);
  const [selRoom,    setSelRoom]    = useState<Espacio | null>(null);

  useEffect(() => {
    getEspaciosByBloque(bloque as any).then(setTodos);
  }, [bloque]);

  // Espacios del piso actual
  const porPiso = useMemo(
    () => todos.filter(e => e.piso === piso),
    [todos, piso],
  );

  // Tipos presentes en este piso
  const tiposPresentes = useMemo(
    () => [...new Set(porPiso.map(e => e.tipo))],
    [porPiso],
  );

  // Filtro por tipo: ya NO oculta cuartos; solo sirve para MARCAR coincidencias.
  const matchesFilter = (e: Espacio) => {
    if (!tipoFiltro) return true;
    const group = FILTER_GROUPS.find(g => g.key === tipoFiltro);
    return group ? group.types.includes(e.tipo) : e.tipo === tipoFiltro;
  };

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
      opacity: dimmed ? 0.4 : (selected || marked) ? 1 : 0.9,
      borderWidth: (selected || marked) ? 2.5 : 0,
      borderColor: '#fff',
    };
  };

  // Busca un cuarto del piso por coincidencia parcial de nombre
  const findRoom = (needle: string) =>
    porPiso.find(r => r.nombre.toLowerCase().includes(needle.toLowerCase()));

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
      <Text style={s.cellTxt} numberOfLines={3}>{e.nombre}</Text>
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
      <Text style={s.cellTxt} numberOfLines={3}>{e.nombre}</Text>
    </TouchableOpacity>
  );
  const PasilloBox = (key: string, label: string, r: Rect) => (
    <View key={key} style={[s.featurePasillo, rectStyle(r)]}>
      <Text style={s.featurePasilloTxt} numberOfLines={2}>{label}</Text>
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
  const planoPropio = bloque === 'A' && piso === 'PRIMERA PLANTA';

  // Plano propio: Bloque A — Primer Piso
  const renderPlanoA1 = () => {
    const instituto = findRoom('instituto');
    const computo   = findRoom('computo') ?? findRoom('14a 101');
    const bano      = findRoom('baño');
    const biblio    = findRoom('biblioteca');
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

  // Chips: grupos predefinidos + tipos presentes en este piso
  const allFilters = [
    ...FILTER_GROUPS,
    ...tiposPresentes.map(t => ({ key: t, label: (TYPE_ICON[t] ?? '') + ' ' + t, types: [t] as TipoEspacio[] })),
  ].filter((f, i, arr) => arr.findIndex(x => x.key === f.key) === i);

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
                renderPlanoA1()
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
          <Text style={s.entradaLabel}>↓ Entrada principal</Text>
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
              <Text style={s.detailName}>{selRoom.nombre}</Text>
              <Text style={s.detailSub}>
                {TYPE_ICON[selRoom.tipo]} {selRoom.tipo}
                {selRoom.responsable ? ` · ${selRoom.responsable}` : ''}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setSelRoom(null)} style={s.detailClose}>
              <Text style={s.detailCloseTxt}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

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

  planWrap:       { alignItems: 'center', marginVertical: 8 },
  buildingOutline:{ borderWidth: 2, borderColor: '#2A4A6A', borderRadius: 6, overflow: 'hidden', backgroundColor: '#0B1829' },
  colBg:          { position: 'absolute', backgroundColor: '#0F2035' },
  corridorBg:     { position: 'absolute', backgroundColor: '#071220', alignItems: 'center', justifyContent: 'center' },
  corridorTxt:    { color: '#1E3A5F', fontSize: 8, fontWeight: '800', letterSpacing: 2, transform: [{ rotate: '90deg' }] },
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

  legend:       { marginHorizontal: 14, backgroundColor: C.card, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: C.border, marginBottom: 8 },
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
});
