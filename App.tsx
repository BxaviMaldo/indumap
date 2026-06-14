import { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import LoginScreen from './src/screens/LoginScreen';
import MapScreen from './src/screens/MapScreen';
import BloqueScreen from './src/screens/BloqueScreen';

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

  // Pantalla de detalle de bloque
  return (
    <>
      <StatusBar style="light" />
      <BloqueScreen
        bloque={bloqueSeleccionado}
        onBack={() => setPantalla('mapa')}
      />
    </>
  );
}

const s = StyleSheet.create({});
