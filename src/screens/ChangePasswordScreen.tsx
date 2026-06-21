import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { changeOwnPassword } from '../services/auth';
import { markPasswordChanged } from '../services/admins';

type Props = {
  cedula: string;
  onDone: () => void;
};

export default function ChangePasswordScreen({ cedula, onDone }: Props) {
  const [pass1, setPass1] = useState('');
  const [pass2, setPass2] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (pass1.length < 6) {
      Alert.alert('Contraseña muy corta', 'Debe tener al menos 6 caracteres.');
      return;
    }
    if (pass1 !== pass2) {
      Alert.alert('No coinciden', 'Las contraseñas no son iguales.');
      return;
    }
    setLoading(true);
    try {
      await changeOwnPassword(pass1);
      await markPasswordChanged(cedula);
      onDone();
    } catch {
      Alert.alert('Error', 'No se pudo cambiar la contraseña. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.flex}>
        <View style={s.content}>
          <Text style={s.icon}>🔒</Text>
          <Text style={s.title}>Cambia tu contraseña</Text>
          <Text style={s.subtitle}>
            Es tu primer ingreso como administrador. Por seguridad, debes establecer una contraseña nueva antes de continuar.
          </Text>

          <Text style={s.label}>Nueva contraseña</Text>
          <TextInput
            style={s.input}
            placeholder="Mínimo 6 caracteres"
            placeholderTextColor="#94A3B8"
            secureTextEntry
            value={pass1}
            onChangeText={setPass1}
          />

          <Text style={s.label}>Confirmar contraseña</Text>
          <TextInput
            style={s.input}
            placeholder="Repite la contraseña"
            placeholderTextColor="#94A3B8"
            secureTextEntry
            value={pass2}
            onChangeText={setPass2}
          />

          <TouchableOpacity
            style={[s.btn, (loading || !pass1 || !pass2) && s.btnDisabled]}
            onPress={handleSubmit}
            disabled={loading || !pass1 || !pass2}
            activeOpacity={0.8}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.btnTxt}>Guardar y continuar</Text>}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const C = { navy: '#001D41', cyan: '#00A9E0', white: '#F8FAFC', slate: '#475569', border: '#E2E8F0' };

const s = StyleSheet.create({
  safe:     { flex: 1, backgroundColor: C.white },
  flex:     { flex: 1 },
  content:  { flex: 1, justifyContent: 'center', paddingHorizontal: 28 },

  icon:     { fontSize: 40, textAlign: 'center', marginBottom: 12 },
  title:    { fontSize: 22, fontWeight: '900', color: C.navy, textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 13, color: C.slate, textAlign: 'center', marginBottom: 28, lineHeight: 19 },

  label:    { fontSize: 13, fontWeight: '600', color: C.navy, marginBottom: 8 },
  input:    { backgroundColor: C.white, borderRadius: 10, borderWidth: 1.5, borderColor: C.border, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, color: '#222', marginBottom: 16 },

  btn:      { backgroundColor: C.navy, borderRadius: 10, paddingVertical: 15, alignItems: 'center', marginTop: 8 },
  btnDisabled: { opacity: 0.4 },
  btnTxt:   { color: '#fff', fontSize: 14, fontWeight: '700' },
});
