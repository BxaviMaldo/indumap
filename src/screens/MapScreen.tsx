import { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  SafeAreaView, PanResponder, Image, TextInput,
} from 'react-native';
import { Canvas, useFrame } from '@react-three/fiber/native';
import { DataTexture, RGBAFormat, RepeatWrapping } from 'three';

// ─── COLORES DE BLOQUES ────────────────────────────────────────────────────────
const COLORS: Record<string, string> = {
  A: '#00A9E0', B: '#11806A', C: '#F08D1E', D: '#D5A021', E: '#ad0ca2',
  BAR: '#8B3A0F', BAÑOS: '#2A6F97',
};

// ─── ESTADO DE CÁMARA (module-level para performance) ─────────────────────────
const cam = { rotX: -0.42, rotY: 0.3, dist: 55 };

// ─── TEXTURAS PROCEDURALES ────────────────────────────────────────────────────
// Genera textura DataTexture con ruido, funciona sin archivos de imagen
function mkTex(r: number, g: number, b: number, sz = 64, amp = 10): DataTexture {
  const d = new Uint8Array(4 * sz * sz);
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  for (let y = 0; y < sz; y++) {
    for (let x = 0; x < sz; x++) {
      const i = (y * sz + x) * 4;
      const n = (Math.abs(Math.sin(x * 127.1 + y * 311.7) * 43758.5) % 1) * amp * 2 - amp;
      d[i]   = clamp(r + n);
      d[i+1] = clamp(g + n * 0.8);
      d[i+2] = clamp(b + n * 0.5);
      d[i+3] = 255;
    }
  }
  const t = new DataTexture(d, sz, sz, RGBAFormat);
  t.needsUpdate = true;
  t.wrapS = t.wrapT = RepeatWrapping;
  return t;
}

// Texturas generadas una sola vez
const TX = {
  wall: mkTex(240, 220, 178, 64, 9),   // crema/estuco
  col:  mkTex(210, 138, 120, 64, 11),  // salmón columnas
  slab: mkTex(190, 102,  85, 64, 7),   // losa oscura
  win:  mkTex( 18,  30,  48, 32, 3),   // vidrio oscuro
  winF: mkTex(195, 175, 148, 32, 5),   // marco ventana
  roof: mkTex(215, 160, 128, 64, 8),   // techo
  gnd:  mkTex( 42,  86,  25, 64, 14),  // césped
  path: mkTex(135, 112,  82, 64, 8),   // camino
  dirt: mkTex( 90,  70,  45, 32, 6),   // tierra
  bark: mkTex( 88,  60,  40, 16, 4),   // tronco
};
Object.values(TX).forEach(t => t.repeat.set(3, 2));

// ─── CONSTANTES ARQUITECTÓNICAS ───────────────────────────────────────────────
const FH   = 1.3;          // alto muro por piso
const SH   = 0.2;          // alto losa
const ST   = FH + SH;      // paso por piso
const COL_W = 0.28;        // ancho columna
const COL_P  = 0.22;       // profundidad columna (sobresale de muro)
const WIN_H  = FH * 0.64;  // alto ventana

// ─── BAY: espacio entre columnas con ventana ──────────────────────────────────
function Bay({ bx, y, bw, D }: { bx: number; y: number; bw: number; D: number }) {
  const fz  = D / 2;
  const wW  = bw - COL_W - 0.06;
  return (
    <group>
      {/* Columna izquierda — sobresale del muro */}
      <mesh position={[bx - bw / 2 + COL_W / 2, y + FH / 2, fz + COL_P / 2]} castShadow>
        <boxGeometry args={[COL_W, FH + SH * 0.6, COL_P + 0.05]} />
        <meshStandardMaterial map={TX.col} roughness={0.72} />
      </mesh>
      {/* Muro infill detrás de la ventana */}
      <mesh position={[bx, y + FH / 2, fz - 0.12]} castShadow>
        <boxGeometry args={[wW, FH, 0.18]} />
        <meshStandardMaterial map={TX.wall} roughness={0.88} />
      </mesh>
      {/* Marco exterior de ventana */}
      <mesh position={[bx, y + FH * 0.54, fz + 0.02]}>
        <boxGeometry args={[wW - 0.04, WIN_H + 0.08, 0.06]} />
        <meshStandardMaterial map={TX.winF} roughness={0.7} />
      </mesh>
      {/* Vidrio oscuro */}
      <mesh position={[bx, y + FH * 0.54, fz + 0.06]}>
        <boxGeometry args={[wW - 0.12, WIN_H, 0.05]} />
        <meshStandardMaterial map={TX.win} roughness={0.08} metalness={0.38} />
      </mesh>
    </group>
  );
}

// ─── SECCIÓN RECTANGULAR DE EDIFICIO ─────────────────────────────────────────
function BSection({
  pos, rot, W, D, floors, bays, sel, hasDoor = false,
}: {
  pos: [number, number, number];
  rot?: [number, number, number];
  W: number; D: number; floors: number; bays: number; sel: boolean; hasDoor?: boolean;
}) {
  const bw     = W / bays;
  const totalH = floors * ST + SH;

  return (
    <group position={pos} rotation={(rot ?? [0, 0, 0]) as any}>

      {/* Cuerpo trasero del edificio (masa principal) */}
      <mesh position={[0, totalH / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[W, totalH, D]} />
        <meshStandardMaterial map={TX.wall} roughness={0.88} color={sel ? '#dad0ff' : '#ffffff'} />
      </mesh>

      {/* Losas horizontales entre pisos */}
      {Array.from({ length: floors + 1 }, (_, i) => (
        <mesh key={`sl${i}`} position={[0, i * ST, 0]} castShadow>
          <boxGeometry args={[W + 0.28, SH, D + 0.32]} />
          <meshStandardMaterial map={TX.slab} roughness={0.76} />
        </mesh>
      ))}

      {/* Bays (columnas + ventanas) por piso */}
      {Array.from({ length: floors }, (_, fi) =>
        Array.from({ length: bays }, (_, bi) => (
          <Bay
            key={`${fi}-${bi}`}
            bx={-W / 2 + bw / 2 + bi * bw}
            y={fi * ST + SH}
            bw={bw}
            D={D}
          />
        ))
      )}

      {/* Puerta central en fachada — solo si hasDoor */}
      {hasDoor && (
        <mesh position={[0, SH + FH * 0.38, D / 2 + 0.04]} castShadow>
          <boxGeometry args={[0.85, FH * 0.72, 0.07]} />
          <meshStandardMaterial color="#3A2010" roughness={0.85} />
        </mesh>
      )}

      {/* Columna final (cierre derecho) */}
      {Array.from({ length: floors }, (_, fi) => (
        <mesh key={`ecol${fi}`} position={[W / 2 - COL_W / 2, fi * ST + SH + FH / 2, D / 2 + COL_P / 2]} castShadow>
          <boxGeometry args={[COL_W, FH + SH * 0.6, COL_P + 0.05]} />
          <meshStandardMaterial map={TX.col} roughness={0.72} />
        </mesh>
      ))}

      {/* Techo plano con pretil */}
      <mesh position={[0, totalH + SH * 0.5 + 0.1, 0]}>
        <boxGeometry args={[W + 0.45, 0.28, D + 0.45]} />
        <meshStandardMaterial color="#001D41" roughness={0.6} />
      </mesh>
      <mesh position={[0, totalH + SH * 0.5 + 0.26, 0]}>
        <boxGeometry args={[W + 0.58, 0.16, D + 0.58]} />
        <meshStandardMaterial color="#001525" roughness={0.6} />
      </mesh>
    </group>
  );
}

// ─── ÁRBOL ────────────────────────────────────────────────────────────────────
function Tree({ p }: { p: [number, number, number] }) {
  return (
    <group position={p}>
      <mesh position={[0, 0.6, 0]} castShadow>
        <cylinderGeometry args={[0.09, 0.14, 1.2, 7]} />
        <meshStandardMaterial map={TX.bark} roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.7, 0]} castShadow>
        <sphereGeometry args={[0.62, 8, 6]} />
        <meshStandardMaterial color="#1A5C10" roughness={0.88} />
      </mesh>
    </group>
  );
}

// ─── BLOQUE GENÉRICO SELECCIONABLE ───────────────────────────────────────────
function SBlock({
  id, pos, rot, W, D, floors, bays, sel, onPress, hasDoor,
}: {
  id: string; pos: [number,number,number];
  rot?: [number,number,number];
  W: number; D: number; floors: number; bays: number;
  sel: boolean; onPress: () => void; hasDoor?: boolean;
}) {
  const ref = useRef<any>(null);
  const sc  = useRef(1);
  useFrame(() => {
    sc.current += ((sel ? 1.06 : 1) - sc.current) * 0.1;
    if (ref.current) ref.current.scale.y = sc.current;
  });
  return (
    <group ref={ref} onPointerDown={(e) => { e.stopPropagation(); onPress(); }}>
      <BSection pos={pos} rot={rot} W={W} D={D} floors={floors} bays={bays} sel={sel} hasDoor={hasDoor} />
    </group>
  );
}

// ─── TERRENO ──────────────────────────────────────────────────────────────────
function Ground() {
  return (
    <>
      {/* Césped principal */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, -18]} receiveShadow>
        <planeGeometry args={[80, 80]} />
        <meshStandardMaterial map={TX.gnd} roughness={0.95} color="#3A8A28" />
      </mesh>
      {/* Camino central N-S */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 2]}>
        <planeGeometry args={[2.2, 11]} />
        <meshStandardMaterial map={TX.path} roughness={0.88} />
      </mesh>

      {/* Nuevo camino horizontal (Este-Oeste) al filo superior */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 7]}>
        {/* El primer número (14) es el largo de izquierda a derecha. 
            El segundo (2.2) es el grosor del camino */}
        <planeGeometry args={[23, 2.2]} />
        <meshStandardMaterial map={TX.path} roughness={0.88} />
      </mesh>

      {/* Camino Entrada */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-3, 0, 12]}>
        <planeGeometry args={[2.2, 11]} />
        <meshStandardMaterial map={TX.path} roughness={0.88} />
      </mesh>

      {/* Plaza frontal 
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
        <planeGeometry args={[16, 6]} />
        <meshStandardMaterial map={TX.path} roughness={0.82} color="#B8A080" />
      </mesh>*/}

      {/* Camino lateral */}
      {[-12].map((x, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0, 5]}>
          <planeGeometry args={[1.5, 15]} />
          <meshStandardMaterial map={TX.path} roughness={0.88} />
        </mesh>
      ))}
      {/* Caminos lateral bloque D y E*/}
      {[-12].map((x, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0, -10]}>
          <planeGeometry args={[1.5, 22]} />
          <meshStandardMaterial map={TX.path} roughness={0.88} />
        </mesh>
      ))}
      {/* Árboles frente */}
      {[-2.5, 2.5].map((tx, i) => (
        <Tree key={i} p={[tx, 0, 2]} />
      ))}
    </>
  );
}

// ─── CONTROLADOR DE CÁMARA ────────────────────────────────────────────────────
function CamCtrl() {
  useFrame(({ camera }) => {
    const cx = Math.cos(-cam.rotX);
    camera.position.set(
      Math.sin(cam.rotY) * cam.dist * cx,
      Math.sin(-cam.rotX) * cam.dist,
      Math.cos(cam.rotY) * cam.dist * cx,
    );
    camera.lookAt(0, 2.5, -2);
  });
  return null;
}

// ─── BLOQUE E — forma de U, abre hacia +X (hacia A,B,C) ──────────────────────
function BlockE({ sel, onPress }: { sel: boolean; onPress: () => void }) {
  const ref = useRef<any>(null);
  const sc  = useRef(1);
  useFrame(() => {
    sc.current += ((sel ? 1.06 : 1) - sc.current) * 0.1;
    if (ref.current) ref.current.scale.y = sc.current;
  });
  return (
    <group ref={ref} position={[-10, 0, -17]} rotation={[0, Math.PI / 2, 0]} onPointerDown={(e) => { e.stopPropagation(); onPress(); }}>
      {/* Espalda de la U — corre a lo largo de Z, fachada hacia +X */}
      <BSection pos={[-27.1, 0, -10]} rot={[0, Math.PI / 2, 0]} W={7} D={2.8} floors={2} bays={4} sel={sel} />

      {/* Ala superior — corre a lo largo de X, fachada hacia -Z (interior U) */}
      <BSection pos={[-21, 0, -5]}  rot={[0, Math.PI, 0]}     W={15}  D={2.8} floors={2} bays={9} sel={sel} />
      {/* Fachada exterior */}
      <BSection pos={[-21, 0, -3.6]} rot={[0, 0, 0]} W={15} D={1.4} floors={2} bays={9} sel={sel} />

      {/* Ala inferior — corre a lo largo de X, fachada hacia +Z (interior U) */}
      <BSection pos={[-21, 0, -15]} rot={[0, 0, 0]}            W={15}  D={2.8} floors={2} bays={9} sel={sel} />
      {/* Fachada exterior */}
      <BSection pos={[-21, 0, -16.4]} rot={[0, Math.PI, 0]} W={15} D={1.4} floors={2} bays={9} sel={sel} />

      {/* Patio interior */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-21, 0.04, -10]} receiveShadow>
        <planeGeometry args={[5.5, 8]} />
        <meshStandardMaterial map={TX.gnd} roughness={0.95} color="#3A8A28" />
      </mesh>
    </group>
  );
}

// ─── BAÑOS ────────────────────────────────────────────────────────────────────
function Banios({ sel, onPress }: { sel: boolean; onPress: () => void }) {
  const W = 3.2, Dp = 3.2, H = FH + SH;
  const ref = useRef<any>(null);
  const sc  = useRef(1);
  useFrame(() => {
    sc.current += ((sel ? 1.06 : 1) - sc.current) * 0.1;
    if (ref.current) ref.current.scale.y = sc.current;
  });
  return (
    <group ref={ref} position={[-15, 0, -9.5]} onPointerDown={(e) => { e.stopPropagation(); onPress(); }}>
      {/* Cuerpo */}
      <mesh position={[0, H / 2, 0]} castShadow>
        <boxGeometry args={[W, H, Dp]} />
        <meshStandardMaterial map={TX.wall} roughness={0.88} color={sel ? '#C8E8FF' : '#ffffff'} />
      </mesh>
      {/* Losa base */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[W + 0.2, SH, Dp + 0.2]} />
        <meshStandardMaterial map={TX.slab} roughness={0.76} />
      </mesh>
      {/* Techo */}
      <mesh position={[0, H + 0.14, 0]}>
        <boxGeometry args={[W + 0.35, 0.22, Dp + 0.35]} />
        <meshStandardMaterial color="#001D41" roughness={0.6} />
      </mesh>
      {/* Puerta izquierda (señores) */}
      <mesh position={[-0.65, SH + H * 0.36, Dp / 2 + 0.03]}>
        <boxGeometry args={[0.72, H * 0.68, 0.06]} />
        <meshStandardMaterial color="#3A2010" roughness={0.85} />
      </mesh>
      {/* Puerta derecha (señoras) */}
      <mesh position={[0.65, SH + H * 0.36, Dp / 2 + 0.03]}>
        <boxGeometry args={[0.72, H * 0.68, 0.06]} />
        <meshStandardMaterial color="#3A2010" roughness={0.85} />
      </mesh>
      {/* Separador central entre puertas */}
      <mesh position={[0, SH + H * 0.4, Dp / 2 + 0.04]}>
        <boxGeometry args={[0.1, H * 0.72, 0.05]} />
        <meshStandardMaterial map={TX.col} roughness={0.7} />
      </mesh>
    </group>
  );
}

// ─── BAR ──────────────────────────────────────────────────────────────────────
function Bar({ sel, onPress }: { sel: boolean; onPress: () => void }) {
  const W = 4.5, Dp = 2.6, H = FH + SH;
  const ref = useRef<any>(null);
  const sc  = useRef(1);
  useFrame(() => {
    sc.current += ((sel ? 1.06 : 1) - sc.current) * 0.1;
    if (ref.current) ref.current.scale.y = sc.current;
  });
  // Justo al lado izquierdo del Bloque A (A en x=-6.5, rot π/2 → ocupa z de -5.5 a 3.5)
  return (
    <group ref={ref} position={[-10.5, 0, 2]} onPointerDown={(e) => { e.stopPropagation(); onPress(); }}>
      {/* Cuerpo */}
      <mesh position={[0, H / 2, 0]} castShadow>
        <boxGeometry args={[W, H, Dp]} />
        <meshStandardMaterial map={TX.wall} roughness={0.88} color={sel ? '#FFE0C8' : '#FFF5EE'} />
      </mesh>
      {/* Losa base */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[W + 0.2, SH, Dp + 0.2]} />
        <meshStandardMaterial map={TX.slab} roughness={0.76} />
      </mesh>
      {/* Techo */}
      <mesh position={[0, H + 0.14, 0]}>
        <boxGeometry args={[W + 0.4, 0.22, Dp + 0.4]} />
        <meshStandardMaterial color="#001D41" roughness={0.6} />
      </mesh>
      {/* Toldo */}
      <mesh position={[0, H - FH * 0.15, Dp / 2 + 0.5]} rotation={[0.28, 0, 0]}>
        <boxGeometry args={[W, 0.07, 1.1]} />
        <meshStandardMaterial color="#8B3A0F" roughness={0.7} />
      </mesh>
      {/* Puerta central */}
      <mesh position={[0, SH + H * 0.36, Dp / 2 + 0.03]}>
        <boxGeometry args={[0.8, H * 0.68, 0.06]} />
        <meshStandardMaterial color="#3A2010" roughness={0.85} />
      </mesh>
      {/* Ventana izquierda */}
      <mesh position={[-1.4, SH + H * 0.55, Dp / 2 + 0.03]}>
        <boxGeometry args={[0.9, H * 0.45, 0.05]} />
        <meshStandardMaterial map={TX.win} roughness={0.1} metalness={0.3} />
      </mesh>
      {/* Ventana derecha */}
      <mesh position={[1.4, SH + H * 0.55, Dp / 2 + 0.03]}>
        <boxGeometry args={[0.9, H * 0.45, 0.05]} />
        <meshStandardMaterial map={TX.win} roughness={0.1} metalness={0.3} />
      </mesh>
    </group>
  );
}

// ─── CONFIG BLOQUES ───────────────────────────────────────────────────────────
// A: vertical izquierda | B: horizontal centro | C: vertical derecha
// D: al oeste del camino lateral, hasDoor en el centro
// E: U-shape independiente (componente BlockE)
const BLOQUES: {
  id: string;
  pos: [number,number,number];
  rot?: [number,number,number];
  W: number; D: number; floors: number; bays: number; hasDoor?: boolean;
}[] = [
  // Bloque A — vertical, izquierda
  { id: 'A', pos: [-6.5, 0, -1],   rot: [0,  Math.PI / 2, 0], W: 9,  D: 2.8, floors: 3, bays: 5 },
  // Bloque B — horizontal, centro
  { id: 'B', pos: [0,    0, -4.1],                              W: 11, D: 2.8, floors: 3, bays: 7 },
  // Bloque C — vertical, derecha
  { id: 'C', pos: [6.5,  0, -1],   rot: [0, -Math.PI / 2, 0], W: 9,  D: 2.8, floors: 3, bays: 5 },
  // Bloque D — con puerta central en fachada
  { id: 'D', pos: [-16.5, 0, -15], rot: [0,  Math.PI / 2, 0], W: 12, D: 2.8, floors: 2, bays: 9, hasDoor: true },
];

// ─── PANTALLA PRINCIPAL ───────────────────────────────────────────────────────
type Props = {
  tipoUsuario: 'visitante' | 'admin';
  cedula?: string;
  onSeleccionarBloque: (b: string) => void;
  onLogout: () => void;
};

export default function MapScreen({ tipoUsuario, cedula, onSeleccionarBloque, onLogout }: Props) {
  const [sel, setSel]       = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const lastT  = useRef({ x: 0, y: 0 });
  const pinchD = useRef(0);
  const toggle = (id: string) => setSel(p => p === id ? null : id);

  const pr = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dx) > 3 || Math.abs(gs.dy) > 3,
      onPanResponderGrant: (e) => {
        const ts = e.nativeEvent.touches;
        if (ts.length === 2)
          pinchD.current = Math.hypot(
            ts[1].pageX - ts[0].pageX,
            ts[1].pageY - ts[0].pageY,
          );
        lastT.current = { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY };
      },
      onPanResponderMove: (e) => {
        const ts = e.nativeEvent.touches;
        if (ts.length === 2) {
          const d = Math.hypot(ts[1].pageX - ts[0].pageX, ts[1].pageY - ts[0].pageY);
          if (pinchD.current > 0) {
            cam.dist *= pinchD.current / d;
            cam.dist = Math.max(8, Math.min(40, cam.dist));
          }
          pinchD.current = d;
        } else {
          const dx = e.nativeEvent.pageX - lastT.current.x;
          const dy = e.nativeEvent.pageY - lastT.current.y;
          lastT.current = { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY };
          cam.rotY += dx * 0.007;
          cam.rotX += dy * 0.005;
          cam.rotX = Math.max(-1.48, Math.min(-0.08, cam.rotX));
        }
      },
    })
  ).current;

  const selFloors = sel === 'E' ? 2
    : sel === 'BAR' || sel === 'BAÑOS' ? 1
    : BLOQUES.find(b => b.id === sel)?.floors ?? 0;

  const selLabel = sel === 'BAR' ? 'Bar'
    : sel === 'BAÑOS' ? 'Baños'
    : sel ? `Bloque ${sel}` : '';

  return (
    <SafeAreaView style={s.safe}>

      {/* Header */}
      <View style={s.header}>
        <View style={s.hRow}>
          <Image source={require('../../assets/Logo_UG.png')} style={s.logo} resizeMode="contain" />
          <View>
            <Text style={s.hTitle}>Campus FII — Eje Global</Text>
            <Text style={s.hSub}>
              {tipoUsuario === 'admin' ? `⚙️ Admin · ${cedula}` : '👤 Visitante · Vista 3D'}
            </Text>
          </View>
        </View>
        <TouchableOpacity style={s.xBtn} onPress={onLogout}>
          <Text style={s.xTxt}>✕</Text>
        </TouchableOpacity>
      </View>

      <View style={s.tip}>
        <Text style={s.tipTxt}>Arrastra para rotar · Pellizca para zoom · Toca un bloque</Text>
      </View>

      {/* Barra de búsqueda */}
      <View style={s.searchWrap}>
        <TextInput
          style={s.searchInput}
          placeholder="Buscar bloque o espacio..."
          placeholderTextColor="#64748B"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Canvas 3D */}
      <View style={s.cv} {...pr.panHandlers}>
        <Canvas
          camera={{ position: [9, 11, 20], fov: 44 }}
          style={StyleSheet.absoluteFill}
          shadows
        >
          {/* Iluminación arquitectónica de 3 puntos */}
          <ambientLight intensity={0.55} />
          <directionalLight
            position={[14, 20, 12]}
            intensity={1.6}
            castShadow
            shadow-mapSize-width={1024}
            shadow-mapSize-height={1024}
          />
          <directionalLight position={[-10, 8, -8]} intensity={0.25} color="#aac8ff" />
          <directionalLight position={[0, 2, 15]} intensity={0.18} color="#ffe8c0" />

          <CamCtrl />
          <Ground />

          {/* Bloques A, B, C (3 pisos) y D (2 pisos) */}
          {BLOQUES.map(b => (
            <SBlock
              key={b.id}
              id={b.id}
              pos={b.pos}
              rot={b.rot}
              W={b.W} D={b.D}
              floors={b.floors}
              bays={b.bays}
              hasDoor={b.hasDoor}
              sel={sel === b.id}
              onPress={() => toggle(b.id)}
            />
          ))}
          {/* Bloque E — U-shape independiente */}
          <BlockE sel={sel === 'E'} onPress={() => toggle('E')} />
          {/* Baños — entre D y E */}
          <Banios sel={sel === 'BAÑOS'} onPress={() => toggle('BAÑOS')} />
          {/* Bar — al lado del Bloque A */}
          <Bar sel={sel === 'BAR'} onPress={() => toggle('BAR')} />
        </Canvas>

        {/* Leyenda */}
        <View style={[s.legend, { bottom: sel ? 20 : 40 }]}>
          {(['A','B','C','D','E'] as string[]).map(id => (
            <TouchableOpacity
              key={id}
              style={[s.chip, sel === id && { borderColor: COLORS[id], backgroundColor: COLORS[id] + '38' }]}
              onPress={() => toggle(id)}
            >
              <View style={[s.dot, { backgroundColor: COLORS[id] }]} />
              <Text style={[s.chipTxt, sel === id && { color: '#fff', fontWeight: '700' }]}>
                Bloque {id}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={[s.chip, sel === 'BAR' && { borderColor: COLORS.BAR, backgroundColor: COLORS.BAR + '38' }]}
            onPress={() => toggle('BAR')}
          >
            <View style={[s.dot, { backgroundColor: COLORS.BAR }]} />
            <Text style={[s.chipTxt, sel === 'BAR' && { color: '#fff', fontWeight: '700' }]}>Bar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.chip, sel === 'BAÑOS' && { borderColor: COLORS.BAÑOS, backgroundColor: COLORS.BAÑOS + '38' }]}
            onPress={() => toggle('BAÑOS')}
          >
            <View style={[s.dot, { backgroundColor: COLORS.BAÑOS }]} />
            <Text style={[s.chipTxt, sel === 'BAÑOS' && { color: '#fff', fontWeight: '700' }]}>Baños</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Panel inferior al seleccionar */}
      {sel && selFloors > 0 && (
        <View style={s.panel}>
          <View style={[s.pBar, { backgroundColor: COLORS[sel] }]} />
          <View style={s.pBody}>
            <View>
              <Text style={s.pTitle}>{selLabel}</Text>
              <Text style={s.pSub}>
                {selFloors === 3 ? 'Planta Baja · 1ª Planta · 2ª Planta'
                  : selFloors === 2 ? 'Planta Baja · Planta Alta'
                  : 'Planta Baja'}
              </Text>
            </View>
            <TouchableOpacity
              style={[s.pBtn, { backgroundColor: COLORS[sel] }]}
              onPress={() => onSeleccionarBloque(sel)}
            >
              <Text style={s.pBtnTxt}>Ver espacios →</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

    </SafeAreaView>
  );
}

// ─── ESTILOS ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: '#001D41' },
  header:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 40, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#001D41' },
  hRow:    { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  logo:    { width: 44, height: 44, borderRadius: 22 },
  hTitle:  { color: '#fff', fontSize: 14, fontWeight: '800' },
  hSub:    { color: '#94A3B8', fontSize: 11 },
  xBtn:    { width: 32, height: 32, borderRadius: 16, backgroundColor: '#ffffff15', alignItems: 'center', justifyContent: 'center' },
  xTxt:    { color: '#fff', fontSize: 14 },
  tip:        { alignItems: 'center', paddingVertical: 5, backgroundColor: '#002255' },
  tipTxt:     { color: '#64748B', fontSize: 10 },
  searchWrap: { backgroundColor: '#002255', paddingHorizontal: 14, paddingBottom: 8 },
  searchInput:{ backgroundColor: '#001840', borderRadius: 10, borderWidth: 1, borderColor: '#1E3A5F', color: '#fff', fontSize: 13, paddingHorizontal: 14, paddingVertical: 8 },
  cv:      { flex: 1 },
  legend:  { position: 'absolute', left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: 6, paddingHorizontal: 10 },
  chip:    { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#ffffff10', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1.5, borderColor: '#ffffff20' },
  dot:     { width: 8, height: 8, borderRadius: 4 },
  chipTxt: { color: '#ccc', fontSize: 11 },
  panel:   { flexDirection: 'row', backgroundColor: '#fff', marginHorizontal: 12, marginBottom: 30, borderRadius: 14, overflow: 'hidden', elevation: 6 },
  pBar:    { width: 6 },
  pBody:   { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14 },
  pTitle:  { fontSize: 18, fontWeight: '900', color: '#001D41' },
  pSub:    { fontSize: 11, color: '#475569', marginTop: 2 },
  pBtn:    { borderRadius: 8, paddingVertical: 10, paddingHorizontal: 14 },
  pBtnTxt: { color: '#fff', fontWeight: '700', fontSize: 13 },
});
