import { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import LoginScreen from './src/screens/LoginScreen';
import MapScreen from './src/screens/MapScreen';

type Pantalla = 'login' | 'mapa' | 'bloque';
type TipoUsuario = 'visitante' | 'admin';

export default function App() {
  const [pantalla, setPantalla] = useState<Pantalla>('login');
  const [tipoUsuario, setTipoUsuario] = useState<TipoUsuario>('visitante');
  const [cedula, setCedula] = useState('');
  const [bloqueSeleccionado, setBloqueSeleccionado] = useState('');

  if (pantalla === 'login') {
    return (
      <>
        <StatusBar style="dark" />
        <LoginScreen
          onVisitante={() => { setTipoUsuario('visitante'); setPantalla('mapa'); }}
          onAdmin={(c) => { setCedula(c); setTipoUsuario('admin'); setPantalla('mapa'); }}
        />
      </>
    );
  }

  if (pantalla === 'mapa') {
    return (
      <>
        <StatusBar style="light" />
        <MapScreen
          tipoUsuario={tipoUsuario}
          cedula={cedula}
          onSeleccionarBloque={(b) => { setBloqueSeleccionado(b); setPantalla('bloque'); }}
          onLogout={() => { setCedula(''); setPantalla('login'); }}
        />
      </>
    );
  }

  // Placeholder pantalla de bloque (próximo paso)
  return (
    <View style={s.placeholder}>
      <Text style={s.back} onPress={() => setPantalla('mapa')}>← Volver al mapa</Text>
      <Text style={s.title}>Bloque {bloqueSeleccionado}</Text>
      <Text style={s.sub}>Aquí irán los espacios del bloque</Text>
    </View>
  );
}

const s = StyleSheet.create({
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAFC' },
  back:        { position: 'absolute', top: 60, left: 20, color: '#00A9E0', fontSize: 15, fontWeight: '700' },
  title:       { fontSize: 28, fontWeight: '900', color: '#001D41' },
  sub:         { fontSize: 14, color: '#475569', marginTop: 8 },
});
