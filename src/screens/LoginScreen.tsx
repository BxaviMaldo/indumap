import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, ActivityIndicator, Alert, KeyboardAvoidingView,
  Platform, ScrollView, Image,
} from 'react-native';

import { loginAdmin, AdminLoginError } from '../services/auth';

type Props = {
  onVisitante: () => void;
  onAdmin: (cedula: string, mustChangePassword: boolean) => void;
};

export default function LoginScreen({ onVisitante, onAdmin }: Props) {
  const [cedula, setCedula] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleAdmin() {
    if (cedula.length !== 10) {
      Alert.alert('Número inválido', 'La cédula debe tener 10 dígitos.');
      return;
    }
    if (!password) {
      Alert.alert('Falta la contraseña', 'Ingresa tu contraseña.');
      return;
    }
    setLoading(true);
    try {
      const { mustChangePassword } = await loginAdmin(cedula, password);
      onAdmin(cedula, mustChangePassword);
    } catch (err) {
      const msg = err instanceof AdminLoginError ? err.message : 'No se pudo verificar. Revisa tu conexión.';
      Alert.alert('Acceso denegado', msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.flex}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

          {/* Logo */}
          <View style={s.logoWrap}>
            <Image
              source={require('../../assets/Logo_UG.png')}
              style={[s.logoImg, { borderRadius: 60 }]}
              resizeMode="contain"
            />
          </View>

          {/* Header institución */}
          <View style={s.header}>
            <Text style={s.headerTitle}>UNIVERSIDAD DE GUAYAQUIL</Text>
            <Text style={s.headerSub}>Facultad de Ingeniería Industrial</Text>
          </View>

          {/* Título */}
          <Text style={s.title}>Explora tu facultad</Text>
          <Text style={s.subtitle}>Seleccione su modalidad de acceso</Text>

          {/* Tarjeta Visitante */}
          <TouchableOpacity style={s.card} onPress={onVisitante} activeOpacity={0.7}>
            <View style={[s.cardIconWrap, { backgroundColor: '#00A9E010' }]}>
              <Text style={s.cardIconText}>👤</Text>
            </View>
            <View style={s.cardText}>
              <Text style={s.cardTitle}>Ingresar como Visitante o Estudiante</Text>
            </View>
            <Text style={s.cardArrow}>›</Text>
          </TouchableOpacity>

          {/* Separador */}
          <View style={s.divider}>
            <View style={s.dividerLine} />
            <Text style={s.dividerText}>o</Text>
            <View style={s.dividerLine} />
          </View>

          {/* Tarjeta Admin */}
          <View style={s.adminCard}>
            <View style={s.adminCardHeader}>
              <View style={[s.cardIconWrap, { backgroundColor: '#001D4110' }]}>
                <Text style={s.cardIconText}>🛡️</Text>
              </View>
              <View>
                <Text style={s.cardTitle}>Acceso Administrador</Text>
                <Text style={s.cardDesc}>Requiere Número de Cédula</Text>
              </View>
            </View>

            <Text style={s.label}>Número de Cédula (10 dígitos)</Text>
            <TextInput
              style={s.input}
              placeholder="0912345678"
              placeholderTextColor="#94A3B8"
              keyboardType="numeric"
              maxLength={10}
              value={cedula}
              onChangeText={setCedula}
            />

            <Text style={s.label}>Contraseña</Text>
            <TextInput
              style={s.input}
              placeholder="••••••••"
              placeholderTextColor="#94A3B8"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />

            <TouchableOpacity
              style={[s.btn, (loading || cedula.length !== 10 || !password) && s.btnDisabled]}
              onPress={handleAdmin}
              disabled={loading || cedula.length !== 10 || !password}
              activeOpacity={0.8}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.btnText}>🛡️  Continuar como Administrador</Text>
              }
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <Text style={s.footer}>InduMap © 2026</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const C = {
  navy:    '#001D41',
  cyan:    '#00A9E0',
  orange:  '#F08D1E',
  green:   '#11806A',
  gold:    '#D5A021',
  white:   '#F8FAFC',
  slate:   '#475569',
  border:  '#E2E8F0',
};

const s = StyleSheet.create({
  safe:           { flex: 1, backgroundColor: C.white },
  flex:           { flex: 1 },
  scroll:         { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 32, justifyContent: 'center' },

  logoWrap:       { alignItems: 'center', marginBottom: 16 },
  logoImg:        { width: 120, height: 120 },

  header:         { alignItems: 'center', marginBottom: 24 },
  headerTitle:    { color: C.navy, fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  headerSub:      { color: C.slate, fontSize: 12, marginTop: 2 },

  title:          { fontSize: 26, fontWeight: '900', color: C.navy, textAlign: 'center', marginBottom: 6 },
  subtitle:       { fontSize: 13, color: C.slate, textAlign: 'center', marginBottom: 24 },

  card:           { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 8, gap: 12, borderWidth: 1.5, borderColor: C.cyan, shadowColor: C.cyan, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 },
  cardIconWrap:   { width: 42, height: 42, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  cardIconText:   { fontSize: 22 },
  cardText:       { flex: 1 },
  cardTitle:      { fontSize: 14, fontWeight: '700', color: C.navy },
  cardDesc:       { fontSize: 12, color: C.slate, marginTop: 2 },
  cardArrow:      { fontSize: 24, color: C.cyan, fontWeight: '700' },

  divider:        { flexDirection: 'row', alignItems: 'center', marginVertical: 16, gap: 10 },
  dividerLine:    { flex: 1, height: 1, backgroundColor: C.border },
  dividerText:    { color: C.slate, fontSize: 13 },

  adminCard:      { backgroundColor: '#fff', borderRadius: 14, padding: 18, borderWidth: 1.5, borderColor: C.border, marginBottom: 24 },
  adminCardHeader:{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },

  label:          { fontSize: 13, fontWeight: '600', color: C.navy, marginBottom: 8 },
  input:          { backgroundColor: C.white, borderRadius: 10, borderWidth: 1.5, borderColor: C.border, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, color: '#222', marginBottom: 14 },
  btn:            { backgroundColor: C.navy, borderRadius: 10, paddingVertical: 15, alignItems: 'center' },
  btnDisabled:    { opacity: 0.4 },
  btnText:        { color: '#fff', fontSize: 14, fontWeight: '700' },

  footer:         { textAlign: 'center', color: '#94A3B8', fontSize: 11, marginTop: 65 },
});
