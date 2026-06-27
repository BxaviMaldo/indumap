import { useState, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, TextInput, SafeAreaView, Switch, Alert, ActivityIndicator,
} from 'react-native';
import { getAllEspacios, updateEspacio } from '../services/espacios';
import { getAllAdmins, registerAdmin, setAdminActivo, deleteAdmin, EmailSendError, type Admin } from '../services/admins';
import type { Espacio, TipoEspacio } from '../types/espacio';

const TIPOS: TipoEspacio[] = [
  'AULA', 'LABORATORIO', 'AUDITORIO', 'BAÑOS', 'INFORMATIVA',
  'TALLER', 'OFICINA', 'BODEGA', 'CENTRO MEDICO',
];

type Tab = 'espacios' | 'admins';

type Props = { onBack: () => void };

export default function AdminConfigScreen({ onBack }: Props) {
  const [tab, setTab] = useState<Tab>('espacios');

  // ── Espacios ──────────────────────────────────────────────────────────────
  const [espacios, setEspacios] = useState<Espacio[]>([]);
  const [loadingEsp, setLoadingEsp] = useState(true);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Espacio | null>(null);

  // Formulario de edición (estado local, se confirma con "Guardar")
  const [fNombre, setFNombre] = useState('');
  const [fTipo, setFTipo] = useState<TipoEspacio>('AULA');
  const [fResponsable, setFResponsable] = useState('');
  const [fActivo, setFActivo] = useState(true);
  const [saving, setSaving] = useState(false);

  const cargarEspacios = () => {
    setLoadingEsp(true);
    getAllEspacios().then(list => {
      setEspacios(list.sort((a, b) => a.bloque.localeCompare(b.bloque) || a.nombre.localeCompare(b.nombre)));
      setLoadingEsp(false);
    });
  };
  useEffect(cargarEspacios, []);

  const filtrados = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return espacios;
    return espacios.filter(e =>
      e.nombre.toLowerCase().includes(q) ||
      e.bloque.toLowerCase().includes(q) ||
      e.tipo.toLowerCase().includes(q),
    );
  }, [espacios, search]);

  const openEdit = (e: Espacio) => {
    setEditing(e);
    setFNombre(e.nombre);
    setFTipo(e.tipo);
    setFResponsable(e.responsable ?? '');
    setFActivo(e.activo);
  };

  const guardarEspacio = async () => {
    if (!editing) return;
    if (!fNombre.trim()) { Alert.alert('Falta el nombre', 'El nombre del espacio no puede estar vacío.'); return; }
    setSaving(true);
    try {
      await updateEspacio(editing.id, {
        nombre: fNombre.trim(),
        tipo: fTipo,
        responsable: fResponsable.trim(),
        activo: fActivo,
      });
      setEspacios(prev => prev.map(e => e.id === editing.id
        ? { ...e, nombre: fNombre.trim(), tipo: fTipo, responsable: fResponsable.trim(), activo: fActivo }
        : e));
      setEditing(null);
    } catch {
      Alert.alert('Error', 'No se pudo guardar el espacio. Revisa tu conexión.');
    } finally {
      setSaving(false);
    }
  };

  // "Eliminar" = vaciar la zona (nombre, tipo y responsable) → queda "Disponible"
  const eliminarEspacio = () => {
    if (!editing) return;
    Alert.alert(
      'Eliminar zona',
      'Se borrarán el nombre, tipo y responsable. La zona quedará como "Disponible".',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            const limpio = { nombre: 'Disponible', tipo: 'AULA' as TipoEspacio, responsable: '', activo: true };
            setSaving(true);
            try {
              await updateEspacio(editing.id, limpio);
              setEspacios(prev => prev.map(e => (e.id === editing.id ? { ...e, ...limpio } : e)));
              setEditing(null);
            } catch {
              Alert.alert('Error', 'No se pudo eliminar. Revisa tu conexión.');
            } finally {
              setSaving(false);
            }
          },
        },
      ],
    );
  };

  // ── Administradores ──────────────────────────────────────────────────────
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loadingAdm, setLoadingAdm] = useState(true);
  const [nuevaCedula, setNuevaCedula] = useState('');
  const [nuevoEmail, setNuevoEmail] = useState('');
  const [registrando, setRegistrando] = useState(false);

  const cargarAdmins = () => {
    setLoadingAdm(true);
    getAllAdmins().then(list => { setAdmins(list); setLoadingAdm(false); });
  };
  useEffect(() => { if (tab === 'admins') cargarAdmins(); }, [tab]);

  const emailValido = /\S+@\S+\.\S+/.test(nuevoEmail);

  const registrarAdmin = async () => {
    if (nuevaCedula.length !== 10) {
      Alert.alert('Cédula inválida', 'Debe tener 10 dígitos.');
      return;
    }
    if (!emailValido) {
      Alert.alert('Correo inválido', 'Ingresa un correo electrónico válido.');
      return;
    }
    setRegistrando(true);
    try {
      await registerAdmin(nuevaCedula, nuevoEmail.trim());
      setNuevaCedula('');
      setNuevoEmail('');
      cargarAdmins();
      Alert.alert('Listo', `Se creó el administrador y se envió la contraseña provisional a ${nuevoEmail}.`);
    } catch (err) {
      if (err instanceof EmailSendError) {
        setNuevaCedula('');
        setNuevoEmail('');
        cargarAdmins();
        Alert.alert(
          'Admin creado, pero el correo falló',
          `El administrador se creó correctamente.\n\nComparte esta contraseña provisional manualmente:\n\n${err.tempPassword}`,
        );
      } else {
        Alert.alert('Error', err instanceof Error ? err.message : 'No se pudo registrar. Revisa tu conexión.');
      }
    } finally {
      setRegistrando(false);
    }
  };

  const toggleAdmin = async (a: Admin) => {
    try {
      await setAdminActivo(a.cedula, !a.activo);
      setAdmins(prev => prev.map(x => x.cedula === a.cedula ? { ...x, activo: !x.activo } : x));
    } catch {
      Alert.alert('Error', 'No se pudo actualizar el estado.');
    }
  };

  const borrarAdmin = (a: Admin) => {
    Alert.alert(
      'Eliminar administrador',
      `¿Seguro que quieres eliminar al administrador con cédula ${a.cedula}? Perderá el acceso de inmediato.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar', style: 'destructive',
          onPress: async () => {
            try {
              await deleteAdmin(a.cedula);
              setAdmins(prev => prev.filter(x => x.cedula !== a.cedula));
            } catch {
              Alert.alert('Error', 'No se pudo eliminar el administrador.');
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={s.safe}>

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={onBack}>
          <Text style={s.backTxt}>← Mapa</Text>
        </TouchableOpacity>
        <Text style={s.hTitle}>Configuración Admin</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Tabs */}
      <View style={s.tabs}>
        <TouchableOpacity style={[s.tab, tab === 'espacios' && s.tabActive]} onPress={() => setTab('espacios')}>
          <Text style={[s.tabTxt, tab === 'espacios' && s.tabTxtActive]}>Espacios</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.tab, tab === 'admins' && s.tabActive]} onPress={() => setTab('admins')}>
          <Text style={[s.tabTxt, tab === 'admins' && s.tabTxtActive]}>Administradores</Text>
        </TouchableOpacity>
      </View>

      {tab === 'espacios' ? (
        <View style={{ flex: 1 }}>
          <View style={s.searchWrap}>
            <TextInput
              style={s.searchInput}
              placeholder="Buscar espacio, bloque o tipo..."
              placeholderTextColor="#64748B"
              value={search}
              onChangeText={setSearch}
            />
          </View>

          {loadingEsp ? (
            <ActivityIndicator color="#00A9E0" style={{ marginTop: 30 }} />
          ) : (
            <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled">
              {filtrados.map(e => (
                <TouchableOpacity key={e.id} style={s.row} onPress={() => openEdit(e)}>
                  <View style={[s.rowDot, { opacity: e.activo ? 1 : 0.3 }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={[s.rowName, !e.activo && s.rowInactivo]}>{e.nombre}</Text>
                    <Text style={s.rowSub}>
                      Bloque {e.bloque} · {e.piso} · {e.tipo}{!e.activo ? ' · INACTIVO' : ''}
                    </Text>
                  </View>
                  <Text style={s.rowArrow}>›</Text>
                </TouchableOpacity>
              ))}
              <View style={{ height: 30 }} />
            </ScrollView>
          )}
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled">

          {/* Registrar nuevo admin */}
          <View style={s.card}>
            <Text style={s.cardTitle}>Registrar nuevo administrador</Text>
            <Text style={s.cardSub}>
              Se creará su cuenta y se le enviará una contraseña provisional por correo.
              Deberá cambiarla en su primer ingreso.
            </Text>
            <TextInput
              style={s.input}
              placeholder="Cédula (10 dígitos)"
              placeholderTextColor="#64748B"
              keyboardType="numeric"
              maxLength={10}
              value={nuevaCedula}
              onChangeText={setNuevaCedula}
            />
            <TextInput
              style={s.input}
              placeholder="Correo electrónico"
              placeholderTextColor="#64748B"
              keyboardType="email-address"
              autoCapitalize="none"
              value={nuevoEmail}
              onChangeText={setNuevoEmail}
            />
            <TouchableOpacity
              style={[s.btn, (registrando || nuevaCedula.length !== 10 || !emailValido) && s.btnDisabled]}
              onPress={registrarAdmin}
              disabled={registrando || nuevaCedula.length !== 10 || !emailValido}
            >
              {registrando
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.btnTxt}>Registrar administrador</Text>}
            </TouchableOpacity>
          </View>

          {/* Lista de admins existentes */}
          <Text style={s.sectionTitle}>Administradores registrados</Text>
          {loadingAdm ? (
            <ActivityIndicator color="#00A9E0" style={{ marginTop: 10 }} />
          ) : admins.length === 0 ? (
            <Text style={s.emptyTxt}>No hay administradores registrados.</Text>
          ) : (
            admins.map(a => (
              <View key={a.cedula} style={s.adminRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.adminCedula}>{a.cedula}</Text>
                  <Text style={s.adminStatus}>
                    {a.email} · {a.activo ? 'Activo' : 'Inactivo'}
                    {a.mustChangePassword ? ' · pendiente 1er cambio' : ''}
                  </Text>
                </View>
                <Switch value={a.activo} onValueChange={() => toggleAdmin(a)} />
                <TouchableOpacity style={s.admDelBtn} onPress={() => borrarAdmin(a)}>
                  <Text style={s.admDelTxt}>🗑</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
          <View style={{ height: 30 }} />
        </ScrollView>
      )}

      {/* Modal de edición de espacio */}
      {editing && (
        <View style={s.modalOverlay}>
          <View style={s.modal}>
            <Text style={s.modalTitle}>Editar espacio</Text>

            <Text style={s.fLabel}>Nombre</Text>
            <TextInput style={s.input} value={fNombre} onChangeText={setFNombre} placeholderTextColor="#64748B" />

            <Text style={s.fLabel}>Tipo</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingBottom: 4 }}>
              {TIPOS.map(t => (
                <TouchableOpacity
                  key={t}
                  style={[s.tchip, fTipo === t && s.tchipActive]}
                  onPress={() => setFTipo(t)}
                >
                  <Text style={[s.tchipTxt, fTipo === t && s.tchipTxtActive]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={s.fLabel}>Responsable</Text>
            <TextInput style={s.input} value={fResponsable} onChangeText={setFResponsable} placeholderTextColor="#64748B" />

            <View style={s.activoRow}>
              <Text style={s.fLabel}>Espacio activo</Text>
              <Switch value={fActivo} onValueChange={setFActivo} />
            </View>

            <TouchableOpacity style={s.modalDelete} onPress={eliminarEspacio} disabled={saving}>
              <Text style={s.modalDeleteTxt}>🗑️  Eliminar zona (dejar como Disponible)</Text>
            </TouchableOpacity>

            <View style={s.modalBtns}>
              <TouchableOpacity style={s.modalCancel} onPress={() => setEditing(null)} disabled={saving}>
                <Text style={s.modalCancelTxt}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.modalSave} onPress={guardarEspacio} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.modalSaveTxt}>Guardar</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

    </SafeAreaView>
  );
}

const C = { navy: '#001D41', bg: '#0B1829', card: '#0F2035', border: '#1E3A5F', sub: '#64748B' };

const s = StyleSheet.create({
  safe:       { flex: 1, backgroundColor: C.bg },

  header:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingTop: 40, paddingBottom: 12, backgroundColor: C.navy },
  backBtn:    { paddingVertical: 6, paddingHorizontal: 4 },
  backTxt:    { color: '#00A9E0', fontSize: 14, fontWeight: '700' },
  hTitle:     { color: '#fff', fontSize: 16, fontWeight: '900' },

  tabs:       { flexDirection: 'row', backgroundColor: C.navy, paddingHorizontal: 14, paddingBottom: 10, gap: 8 },
  tab:        { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center', backgroundColor: '#ffffff12' },
  tabActive:  { backgroundColor: '#00A9E0' },
  tabTxt:     { color: '#94A3B8', fontSize: 12, fontWeight: '600' },
  tabTxtActive:{ color: '#fff', fontWeight: '800' },

  searchWrap:  { margin: 14, backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.border, paddingHorizontal: 12 },
  searchInput: { color: '#fff', fontSize: 13, paddingVertical: 10 },

  row:        { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 14, marginBottom: 8, backgroundColor: C.card, borderRadius: 10, borderWidth: 1, borderColor: C.border, padding: 12 },
  rowDot:     { width: 10, height: 10, borderRadius: 5, backgroundColor: '#00A9E0' },
  rowName:    { color: '#fff', fontSize: 13, fontWeight: '700' },
  rowInactivo:{ color: '#94A3B8', textDecorationLine: 'line-through' },
  rowSub:     { color: C.sub, fontSize: 11, marginTop: 2 },
  rowArrow:   { color: C.sub, fontSize: 20 },

  card:       { margin: 14, backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 16 },
  cardTitle:  { color: '#fff', fontSize: 14, fontWeight: '800' },
  cardSub:    { color: C.sub, fontSize: 12, marginTop: 4, marginBottom: 12 },

  input:      { backgroundColor: '#001840', borderRadius: 10, borderWidth: 1, borderColor: C.border, color: '#fff', fontSize: 14, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 10 },
  btn:        { backgroundColor: '#00A9E0', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  btnDisabled:{ opacity: 0.4 },
  btnTxt:     { color: '#fff', fontWeight: '700', fontSize: 13 },

  sectionTitle:{ color: '#fff', fontSize: 13, fontWeight: '800', marginHorizontal: 14, marginTop: 6, marginBottom: 8 },
  emptyTxt:   { color: C.sub, fontSize: 12, marginHorizontal: 14 },
  adminRow:   { flexDirection: 'row', alignItems: 'center', marginHorizontal: 14, marginBottom: 8, backgroundColor: C.card, borderRadius: 10, borderWidth: 1, borderColor: C.border, padding: 12 },
  adminCedula:{ color: '#fff', fontSize: 14, fontWeight: '700' },
  admDelBtn:  { marginLeft: 10, width: 34, height: 34, borderRadius: 8, borderWidth: 1, borderColor: '#B71C1C', alignItems: 'center', justifyContent: 'center' },
  admDelTxt:  { fontSize: 15 },
  adminStatus:{ color: C.sub, fontSize: 11, marginTop: 2 },

  modalOverlay:{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: '#00000088', alignItems: 'center', justifyContent: 'center', padding: 20 },
  modal:      { width: '100%', backgroundColor: C.navy, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: C.border },
  modalTitle: { color: '#fff', fontSize: 16, fontWeight: '900', marginBottom: 16 },
  fLabel:     { color: '#94A3B8', fontSize: 12, fontWeight: '700', marginBottom: 6 },

  tchip:      { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, marginBottom: 10 },
  tchipActive:{ backgroundColor: '#00A9E0', borderColor: '#00A9E0' },
  tchipTxt:   { color: C.sub, fontSize: 10, fontWeight: '700' },
  tchipTxtActive:{ color: '#fff' },

  activoRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6, marginBottom: 12 },

  modalDelete:   { marginBottom: 14, paddingVertical: 11, borderRadius: 10, borderWidth: 1, borderColor: '#B71C1C', alignItems: 'center' },
  modalDeleteTxt:{ color: '#EF5350', fontSize: 13, fontWeight: '700' },

  modalBtns:  { flexDirection: 'row', gap: 10 },
  modalCancel:{ flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center', backgroundColor: '#ffffff12' },
  modalCancelTxt:{ color: '#fff', fontWeight: '700', fontSize: 13 },
  modalSave:  { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center', backgroundColor: '#00A9E0' },
  modalSaveTxt:{ color: '#fff', fontWeight: '700', fontSize: 13 },
});
