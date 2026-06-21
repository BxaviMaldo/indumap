import { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import LoginScreen from './src/screens/LoginScreen';
import MapScreen from './src/screens/MapScreen';
import BloqueScreen from './src/screens/BloqueScreen';
import AdminConfigScreen from './src/screens/AdminConfigScreen';
import ChangePasswordScreen from './src/screens/ChangePasswordScreen';
import { logoutAdmin } from './src/services/auth';

type Pantalla = 'login' | 'mapa' | 'bloque' | 'admin-config' | 'cambiar-password';
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
          onAdmin={(c, mustChangePassword) => {
            setCedula(c);
            setTipoUsuario('admin');
            setPantalla(mustChangePassword ? 'cambiar-password' : 'mapa');
          }}
        />
      </>
    );
  }

  if (pantalla === 'cambiar-password') {
    return (
      <>
        <StatusBar style="dark" />
        <ChangePasswordScreen cedula={cedula} onDone={() => setPantalla('mapa')} />
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
          onAbrirConfig={() => setPantalla('admin-config')}
          onLogout={() => { logoutAdmin(); setCedula(''); setPantalla('login'); }}
        />
      </>
    );
  }

  if (pantalla === 'admin-config') {
    return (
      <>
        <StatusBar style="light" />
        <AdminConfigScreen onBack={() => setPantalla('mapa')} />
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
        tipoUsuario={tipoUsuario}
      />
    </>
  );
}

const s = StyleSheet.create({});
