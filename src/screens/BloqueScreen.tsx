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

// ─── PLAN 2D — layout rectangular con dos columnas + pasillo central ─────────
const PLAN_W = 290;
const PLAN_H = 380;

// Columna izquierda
const COL_L = { x: 4,   y: 4, w: 108, h: PLAN_H - 8 };
// Pasillo central
const CORRIDOR = { x: 112, y: 4, w: 66, h: PLAN_H - 8 };
// Columna derecha
const COL_R = { x: 178, y: 4, w: 108, h: PLAN_H - 8 };

// Separa rooms en columna izquierda (índice par) y derecha (índice impar)
function distributeRooms(rooms: Espacio[]) {
  const left:  Espacio[] = [];
  const right: Espacio[] = [];
  rooms.forEach((r, i) => (i % 2 === 0 ? left : right).push(r));
  return { left, right };
}

function cellRect(col: 'left' | 'right', idx: number, total: number) {
  const col_def = col === 'left' ? COL_L : COL_R;
  const pad = 3;
  const t   = Math.max(total, 1);
  const ch  = (col_def.h - pad * 2) / t;
  return {
    x: col_def.x + pad,
    y: col_def.y + pad + idx * ch,
    w: col_def.w - pad * 2,
    h: ch - 2,
  };
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

  // Aplicar filtros
  const filtrados = useMemo(() => {
    let list = porPiso;
    if (tipoFiltro) {
      const group = FILTER_GROUPS.find(g => g.key === tipoFiltro);
      if (group) list = list.filter(e => group.types.includes(e.tipo));
      else       list = list.filter(e => e.tipo === tipoFiltro);
    }
    return list;
  }, [porPiso, tipoFiltro]);

  // Búsqueda (resalta coincidencias)
  const q = search.trim().toLowerCase();
  const highlighted = new Set(
    q ? filtrados.filter(e => e.nombre.toLowerCase().includes(q)).map(e => e.id) : [],
  );
  const isSearching = q.length > 0;

  // Distribución en el plano (columna izq par, columna der impar)
  const { left, right } = useMemo(() => distributeRooms(filtrados), [filtrados]);

  const renderCell = (e: Espacio, col: 'left' | 'right', idx: number, total: number) => {
    const r    = cellRect(col, idx, total);
    const bg   = TYPE_COLOR[e.tipo] ?? '#607D8B';
    const hit  = highlighted.has(e.id);
    const dim  = isSearching && !hit;
    return (
      <TouchableOpacity
        key={e.id}
        onPress={() => setSelRoom(prev => prev?.id === e.id ? null : e)}
        style={[
          s.cell,
          {
            position: 'absolute',
            left: r.x, top: r.y, width: r.w, height: r.h,
            backgroundColor: hit ? '#FFD600' : bg,
            opacity: dim ? 0.22 : selRoom?.id === e.id ? 1 : 0.9,
            borderWidth: selRoom?.id === e.id ? 2.5 : 0,
            borderColor: '#fff',
          },
        ]}
        activeOpacity={0.8}
      >
        <Text style={s.cellTxt} numberOfLines={3}>{e.nombre}</Text>
      </TouchableOpacity>
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

              {/* Rooms izquierda y derecha */}
              {left.map((e, i)  => renderCell(e, 'left',  i, left.length))}
              {right.map((e, i) => renderCell(e, 'right', i, right.length))}
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
            {filtrados.filter(e => highlighted.has(e.id)).map(e => (
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

  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 12, backgroundColor: C.navy },
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
