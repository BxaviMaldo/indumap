// Ejecutar con: node scripts/seedFirestore.js
// Requiere: npm install firebase (ya instalado)
// ANTES de correr: reemplaza los valores de firebaseConfig con los de tu proyecto

const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc, terminate } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: 'AIzaSyCq56NMgPbzEqB5fMbPbUHT_UKRjsoQJI8',
  authDomain: 'indumap-7b99a.firebaseapp.com',
  projectId: 'indumap-7b99a',
  storageBucket: 'indumap-7b99a.firebasestorage.app',
  messagingSenderId: '1047027928075',
  appId: '1:1047027928075:web:c6786b37f68cd4f1588b0e',
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const espacios = [
  // ─── BLOQUE C — PLANTA BAJA ───────────────────────────────────────────────
  { id: 'FUESIIST',          nombre: 'Fueiist - Asociación de Estudiantes', tipo: 'AULA',        bloque: 'C', piso: 'PLANTA BAJA',    responsable: 'Gestión Académica', coordenadas: null, foto_referencia: null, anexo: null },
  { id: 'AULA_14C_003',      nombre: 'Aula 14C-003',                        tipo: 'AULA',        bloque: 'C', piso: 'PLANTA BAJA',    responsable: 'Gestión Académica', coordenadas: null, foto_referencia: null, anexo: null },
  { id: 'BAÑOS_001',         nombre: 'Baños',                                tipo: 'BAÑOS',       bloque: 'C', piso: 'PLANTA BAJA',    responsable: 'Gestión Académica', coordenadas: null, foto_referencia: null, anexo: null },
  { id: 'AULA_14C_004',      nombre: 'Aula 14C-004',                        tipo: 'AULA',        bloque: 'C', piso: 'PLANTA BAJA',    responsable: 'Gestión Académica', coordenadas: null, foto_referencia: null, anexo: null },
  { id: 'AULA_14C_007',      nombre: 'Aula 14C-007',                        tipo: 'AULA',        bloque: 'C', piso: 'PLANTA BAJA',    responsable: 'Gestión Académica', coordenadas: null, foto_referencia: null, anexo: null },
  { id: 'AULA_14C_005',      nombre: 'Aula 14C-005',                        tipo: 'AULA',        bloque: 'C', piso: 'PLANTA BAJA',    responsable: 'Gestión Académica', coordenadas: null, foto_referencia: null, anexo: null },
  { id: 'AULA_14C_006',      nombre: 'Aula 14C-006',                        tipo: 'AULA',        bloque: 'C', piso: 'PLANTA BAJA',    responsable: 'Gestión Académica', coordenadas: null, foto_referencia: null, anexo: null },

  // ─── BLOQUE B — PLANTA BAJA ───────────────────────────────────────────────
  { id: 'SALA_MOTOCHE',      nombre: 'Sala Motoche',                         tipo: 'INFORMATIVA', bloque: 'B', piso: 'PLANTA BAJA',    responsable: 'Gestión Académica', coordenadas: null, foto_referencia: null, anexo: null },
  { id: 'SALA_CONFERENCIAS', nombre: 'Sala de Conferencias Econ. Vicente Rodríguez Motoche', tipo: 'AUDITORIO', bloque: 'B', piso: 'PLANTA BAJA', responsable: 'Gestión Académica', coordenadas: null, foto_referencia: null, anexo: null },
  { id: 'BAÑOS_002',         nombre: 'Baños 002',                            tipo: 'BAÑOS',       bloque: 'B', piso: 'PLANTA BAJA',    responsable: 'Gestión Académica', coordenadas: null, foto_referencia: null, anexo: null },
  { id: 'LAB_14B_002',       nombre: 'Laboratorio 14B 002',                  tipo: 'LABORATORIO', bloque: 'B', piso: 'PLANTA BAJA',    responsable: 'Gestión Académica', coordenadas: null, foto_referencia: null, anexo: null },
  { id: 'LAB_14B_001',       nombre: 'Laboratorio 14B 001',                  tipo: 'LABORATORIO', bloque: 'B', piso: 'PLANTA BAJA',    responsable: 'Gestión Académica', coordenadas: null, foto_referencia: null, anexo: null },

  // ─── BLOQUE A — PLANTA BAJA ───────────────────────────────────────────────
  { id: 'ADM_DE_EDIFICIO',   nombre: 'Administración de Edificio',           tipo: 'INFORMATIVA', bloque: 'A', piso: 'PLANTA BAJA',    responsable: 'Gestión Académica', coordenadas: null, foto_referencia: null, anexo: null },
  { id: 'DIR_DE_CARRERA',    nombre: 'Dirección de Carrera',                 tipo: 'INFORMATIVA', bloque: 'A', piso: 'PLANTA BAJA',    responsable: 'Gestión Académica', coordenadas: null, foto_referencia: null, anexo: null },
  { id: 'SALA_DOCENTES_001', nombre: 'Sala de Docentes 1',                   tipo: 'AULA',        bloque: 'A', piso: 'PLANTA BAJA',    responsable: 'Gestión Académica', coordenadas: null, foto_referencia: null, anexo: null },
  { id: 'TALENTO_HUMANO',    nombre: 'Departamento de Talento Humano',       tipo: 'INFORMATIVA', bloque: 'A', piso: 'PLANTA BAJA',    responsable: 'Gestión Académica', coordenadas: null, foto_referencia: null, anexo: null },
  { id: 'SUBDECANO',         nombre: 'Subdecano',                            tipo: 'INFORMATIVA', bloque: 'A', piso: 'PLANTA BAJA',    responsable: 'Gestión Académica', coordenadas: null, foto_referencia: null, anexo: null },
  { id: 'DECANATO',          nombre: 'Decanato',                             tipo: 'INFORMATIVA', bloque: 'A', piso: 'PLANTA BAJA',    responsable: 'Gestión Académica', coordenadas: null, foto_referencia: null, anexo: null },
  { id: 'SECRETARIA',        nombre: 'Secretaría del Decanato',              tipo: 'INFORMATIVA', bloque: 'A', piso: 'PLANTA BAJA',    responsable: 'Gestión Académica', coordenadas: null, foto_referencia: null, anexo: null },

  // ─── BLOQUE C — PRIMERA PLANTA ────────────────────────────────────────────
  { id: 'VINCULACION',           nombre: 'Vinculación con la Comunidad y Bienestar Estudiantil', tipo: 'INFORMATIVA', bloque: 'C', piso: 'PRIMERA PLANTA', responsable: 'Gestión Académica', coordenadas: null, foto_referencia: null, anexo: null },
  { id: 'SALA_DOCENTES_002',     nombre: 'Sala de Docentes 002',              tipo: 'AULA',        bloque: 'C', piso: 'PRIMERA PLANTA', responsable: 'Gestión Académica', coordenadas: null, foto_referencia: null, anexo: null },
  { id: 'AULA_14C_103',          nombre: 'Aula 14C 103',                      tipo: 'AULA',        bloque: 'C', piso: 'PRIMERA PLANTA', responsable: 'Gestión Académica', coordenadas: null, foto_referencia: null, anexo: null },
  { id: 'SECRETARIA_SISTEMAS',   nombre: 'Secretaría de Ingeniería en Sistemas', tipo: 'INFORMATIVA', bloque: 'C', piso: 'PRIMERA PLANTA', responsable: 'Gestión Académica', coordenadas: null, foto_referencia: null, anexo: null },
  { id: 'BAÑOS_003',             nombre: 'Baños 003',                          tipo: 'BAÑOS',       bloque: 'C', piso: 'PRIMERA PLANTA', responsable: 'Gestión Académica', coordenadas: null, foto_referencia: null, anexo: null },
  { id: 'AULA_14C_101',          nombre: 'Aula 14C 101',                      tipo: 'AULA',        bloque: 'C', piso: 'PRIMERA PLANTA', responsable: 'Gestión Académica', coordenadas: null, foto_referencia: null, anexo: null },
  { id: 'AULA_14C_102',          nombre: 'Aula 14C 102',                      tipo: 'AULA',        bloque: 'C', piso: 'PRIMERA PLANTA', responsable: 'Gestión Académica', coordenadas: null, foto_referencia: null, anexo: null },
  { id: 'LAB_14C_101',           nombre: 'Laboratorio de Cómputo 14C 101',    tipo: 'LABORATORIO', bloque: 'C', piso: 'PRIMERA PLANTA', responsable: 'Gestión Académica', coordenadas: null, foto_referencia: null, anexo: null },
  { id: 'LAB_14C_102',           nombre: 'Laboratorio de Cómputo 14C 102',    tipo: 'LABORATORIO', bloque: 'C', piso: 'PRIMERA PLANTA', responsable: 'Gestión Académica', coordenadas: null, foto_referencia: null, anexo: null },

  // ─── BLOQUE B — PRIMERA PLANTA ────────────────────────────────────────────
  { id: 'AULA_14B_102',     nombre: 'Aula 14B 102',                         tipo: 'AULA',        bloque: 'B', piso: 'PRIMERA PLANTA', responsable: 'Gestión Académica', coordenadas: null, foto_referencia: null, anexo: null },
  { id: 'AULA_14B_101',     nombre: 'Aula 14B 101',                         tipo: 'AULA',        bloque: 'B', piso: 'PRIMERA PLANTA', responsable: 'Gestión Académica', coordenadas: null, foto_referencia: null, anexo: null },
  { id: 'AULA_14B_103',     nombre: 'Aula 14B 103',                         tipo: 'AULA',        bloque: 'B', piso: 'PRIMERA PLANTA', responsable: 'Gestión Académica', coordenadas: null, foto_referencia: null, anexo: null },
  { id: 'LAB_14B_101',      nombre: 'Laboratorio de Cómputo 14B 101',       tipo: 'LABORATORIO', bloque: 'B', piso: 'PRIMERA PLANTA', responsable: 'Gestión Académica', coordenadas: null, foto_referencia: null, anexo: null },

  // ─── BLOQUE A — PRIMERA PLANTA ────────────────────────────────────────────
  { id: 'BIBLIOTECA',       nombre: 'Biblioteca',                            tipo: 'INFORMATIVA', bloque: 'A', piso: 'PRIMERA PLANTA', responsable: 'Gestión Académica', coordenadas: null, foto_referencia: null, anexo: null },
  { id: 'BAÑOS_004',        nombre: 'Baños 004',                             tipo: 'BAÑOS',       bloque: 'A', piso: 'PRIMERA PLANTA', responsable: 'Gestión Académica', coordenadas: null, foto_referencia: null, anexo: null },
  { id: 'INST_POSTGRADO',   nombre: 'Instituto de Postgrado, Investigación y Educación Continua', tipo: 'INFORMATIVA', bloque: 'A', piso: 'PRIMERA PLANTA', responsable: 'Gestión Académica', coordenadas: null, foto_referencia: null, anexo: null },
  { id: 'LAB_14A_101',      nombre: 'Laboratorio de Cómputo 14A 101',       tipo: 'LABORATORIO', bloque: 'A', piso: 'PRIMERA PLANTA', responsable: 'Gestión Académica', coordenadas: null, foto_referencia: null, anexo: null },

  // ─── BLOQUE C — SEGUNDA PLANTA ────────────────────────────────────────────
  { id: 'LAB_14C_202',      nombre: 'Laboratorio de Cómputo 14C 202',       tipo: 'LABORATORIO', bloque: 'C', piso: 'SEGUNDA PLANTA', responsable: 'Gestión Académica', coordenadas: null, foto_referencia: null, anexo: null },
  { id: 'LAB_14C_201',      nombre: 'Laboratorio de Cómputo 14C 201',       tipo: 'LABORATORIO', bloque: 'C', piso: 'SEGUNDA PLANTA', responsable: 'Gestión Académica', coordenadas: null, foto_referencia: null, anexo: null },
  { id: 'AULA_14C_202',     nombre: 'Aula 14C 202',                         tipo: 'AULA',        bloque: 'C', piso: 'SEGUNDA PLANTA', responsable: 'Gestión Académica', coordenadas: null, foto_referencia: null, anexo: null },
  { id: 'AULA_14C_201',     nombre: 'Aula 14C 201',                         tipo: 'AULA',        bloque: 'C', piso: 'SEGUNDA PLANTA', responsable: 'Gestión Académica', coordenadas: null, foto_referencia: null, anexo: null },
  { id: 'BAÑOS_005',        nombre: 'Baños 005',                             tipo: 'BAÑOS',       bloque: 'C', piso: 'SEGUNDA PLANTA', responsable: 'Gestión Académica', coordenadas: null, foto_referencia: null, anexo: null },
  { id: 'LAB_14C_203',      nombre: 'Laboratorio de Cómputo 14C 203',       tipo: 'LABORATORIO', bloque: 'C', piso: 'SEGUNDA PLANTA', responsable: 'Gestión Académica', coordenadas: null, foto_referencia: null, anexo: null },
  { id: 'LAB_14C_204',      nombre: 'Laboratorio de Cómputo 14C 204',       tipo: 'LABORATORIO', bloque: 'C', piso: 'SEGUNDA PLANTA', responsable: 'Gestión Académica', coordenadas: null, foto_referencia: null, anexo: null },
  { id: 'AULA_14C_203',     nombre: 'Aula 14C 203',                         tipo: 'AULA',        bloque: 'C', piso: 'SEGUNDA PLANTA', responsable: 'Gestión Académica', coordenadas: null, foto_referencia: null, anexo: null },
  { id: 'AULA_14C_204',     nombre: 'Aula 14C 204',                         tipo: 'AULA',        bloque: 'C', piso: 'SEGUNDA PLANTA', responsable: 'Gestión Académica', coordenadas: null, foto_referencia: null, anexo: null },

  // ─── BLOQUE B — SEGUNDA PLANTA ────────────────────────────────────────────
  { id: 'AULA_14B_201',     nombre: 'Aula 14B 201',                         tipo: 'AULA',        bloque: 'B', piso: 'SEGUNDA PLANTA', responsable: 'Gestión Académica', coordenadas: null, foto_referencia: null, anexo: null },
  { id: 'LAB_14B_201',      nombre: 'Laboratorio 14B 201',                  tipo: 'LABORATORIO', bloque: 'B', piso: 'SEGUNDA PLANTA', responsable: 'Gestión Académica', coordenadas: null, foto_referencia: null, anexo: null },
  { id: 'AULA_14B_202',     nombre: 'Aula 14B 202',                         tipo: 'AULA',        bloque: 'B', piso: 'SEGUNDA PLANTA', responsable: 'Gestión Académica', coordenadas: null, foto_referencia: null, anexo: null },
  { id: 'LAB_14B_202',      nombre: 'Laboratorio 14B 202',                  tipo: 'LABORATORIO', bloque: 'B', piso: 'SEGUNDA PLANTA', responsable: 'Gestión Académica', coordenadas: null, foto_referencia: null, anexo: null },

  // ─── BLOQUE A — SEGUNDA PLANTA ────────────────────────────────────────────
  { id: 'LAB_14A_201',                  nombre: 'Laboratorio 14A 201',                   tipo: 'LABORATORIO', bloque: 'A', piso: 'SEGUNDA PLANTA', responsable: 'Gestión Académica', coordenadas: null, foto_referencia: null, anexo: null },
  { id: 'AULA_14A_201',                 nombre: 'Aula 14A 201',                          tipo: 'AULA',        bloque: 'A', piso: 'SEGUNDA PLANTA', responsable: 'Gestión Académica', coordenadas: null, foto_referencia: null, anexo: null },
  { id: 'LAB_14A_202',                  nombre: 'Laboratorio 14A 202',                   tipo: 'LABORATORIO', bloque: 'A', piso: 'SEGUNDA PLANTA', responsable: 'Gestión Académica', coordenadas: null, foto_referencia: null, anexo: null },
  { id: 'AULA_14A_202',                 nombre: 'Aula 14A 202',                          tipo: 'AULA',        bloque: 'A', piso: 'SEGUNDA PLANTA', responsable: 'Gestión Académica', coordenadas: null, foto_referencia: null, anexo: null },
  { id: 'DIR_DE_CARRERA_TELEINFORMATICA', nombre: 'Dirección de Carrera Teleinformática', tipo: 'INFORMATIVA', bloque: 'A', piso: 'SEGUNDA PLANTA', responsable: 'Gestión Académica', coordenadas: null, foto_referencia: null, anexo: null },
  { id: 'BAÑOS_006',                    nombre: 'Baños 006',                              tipo: 'BAÑOS',       bloque: 'A', piso: 'SEGUNDA PLANTA', responsable: 'Gestión Académica', coordenadas: null, foto_referencia: null, anexo: null },
  { id: 'AULA_14A_203',                 nombre: 'Aula 14A 203',                          tipo: 'AULA',        bloque: 'A', piso: 'SEGUNDA PLANTA', responsable: 'Gestión Académica', coordenadas: null, foto_referencia: null, anexo: null },
  { id: 'AULA_14A_204',                 nombre: 'Aula 14A 204',                          tipo: 'AULA',        bloque: 'A', piso: 'SEGUNDA PLANTA', responsable: 'Gestión Académica', coordenadas: null, foto_referencia: null, anexo: null },
  { id: 'AULA_14A_205',                 nombre: 'Aula 14A 205',                          tipo: 'AULA',        bloque: 'A', piso: 'SEGUNDA PLANTA', responsable: 'Gestión Académica', coordenadas: null, foto_referencia: null, anexo: null },
  { id: 'AULA_14A_206',                 nombre: 'Aula 14A 206',                          tipo: 'AULA',        bloque: 'A', piso: 'SEGUNDA PLANTA', responsable: 'Gestión Académica', coordenadas: null, foto_referencia: null, anexo: null },
  { id: 'SALA_DOCENTES_003',            nombre: 'Sala Docentes 003',                      tipo: 'AULA',        bloque: 'A', piso: 'SEGUNDA PLANTA', responsable: 'Gestión Académica', coordenadas: null, foto_referencia: null, anexo: null },
  { id: 'SALA_REUNION_TUTORIAS',        nombre: 'Sala de Reuniones y Tutorías',           tipo: 'AULA',        bloque: 'A', piso: 'SEGUNDA PLANTA', responsable: 'Gestión Académica', coordenadas: null, foto_referencia: null, anexo: null },

  // ─── BLOQUE D — PLANTA BAJA ───────────────────────────────────────────────
  { id: 'D-001', nombre: 'Aula 14D-001',              tipo: 'AULA',               bloque: 'D', piso: 'PLANTA BAJA', responsable: 'Gestión Académica', coordenadas: null, foto_referencia: null, anexo: 'Aula 14D-001' },
  { id: 'D-002', nombre: 'Aula 14D-002',              tipo: 'AULA',               bloque: 'D', piso: 'PLANTA BAJA', responsable: 'Gestión Académica', coordenadas: null, foto_referencia: null, anexo: 'Aula 14D-002' },
  { id: 'D-003', nombre: 'Aula 14D-003',              tipo: 'AULA',               bloque: 'D', piso: 'PLANTA BAJA', responsable: 'Gestión Académica', coordenadas: null, foto_referencia: null, anexo: 'Aula 14D-003' },
  { id: 'D-004', nombre: 'Aula 14D-004',              tipo: 'AULA',               bloque: 'D', piso: 'PLANTA BAJA', responsable: 'Gestión Académica', coordenadas: null, foto_referencia: null, anexo: 'Aula 14D-004' },
  { id: 'D-005', nombre: 'Aula 14D-005',              tipo: 'AULA',               bloque: 'D', piso: 'PLANTA BAJA', responsable: 'Gestión Académica', coordenadas: null, foto_referencia: null, anexo: 'Aula 14D-005' },
  { id: 'D-006', nombre: 'Aula 14D-006',              tipo: 'AULA',               bloque: 'D', piso: 'PLANTA BAJA', responsable: 'Gestión Académica', coordenadas: null, foto_referencia: null, anexo: 'Aula 14D-006' },
  { id: 'D-007', nombre: 'Aula 14D-007',              tipo: 'AULA',               bloque: 'D', piso: 'PLANTA BAJA', responsable: 'Gestión Académica', coordenadas: null, foto_referencia: null, anexo: 'Aula 14D-007' },
  { id: 'D-008', nombre: 'Aula 14D-008',              tipo: 'AULA',               bloque: 'D', piso: 'PLANTA BAJA', responsable: 'Gestión Académica', coordenadas: null, foto_referencia: null, anexo: 'Aula 14D-008' },
  { id: 'D-009', nombre: 'Toilet Women',               tipo: 'BAÑOS',              bloque: 'D', piso: 'PLANTA BAJA', responsable: 'Gestión Académica', coordenadas: null, foto_referencia: null, anexo: 'Toilet Women' },
  { id: 'D-F01', nombre: 'Flujo de Entrada y Salida 1', tipo: 'ACCESO PRINCIPAL',  bloque: 'D', piso: 'PLANTA BAJA', responsable: 'Gestión Académica', coordenadas: null, foto_referencia: null, anexo: 'Flujo de Entrada y Salida 1' },
  { id: 'D-F02', nombre: 'Flujo de Entrada y Salida 2', tipo: 'SALIDA / EVACUACIÓN', bloque: 'D', piso: 'PLANTA BAJA', responsable: 'Gestión Académica', coordenadas: null, foto_referencia: null, anexo: 'Flujo de Entrada y Salida 2' },

  // ─── BLOQUE D — PLANTA ALTA ───────────────────────────────────────────────
  { id: 'D-101', nombre: 'Aula 14D-101', tipo: 'AULA', bloque: 'D', piso: 'PLANTA ALTA', responsable: 'Gestión Académica', coordenadas: null, foto_referencia: null, anexo: 'Aula 14D-101' },
  { id: 'D-102', nombre: 'Aula 14D-102', tipo: 'AULA', bloque: 'D', piso: 'PLANTA ALTA', responsable: 'Gestión Académica', coordenadas: null, foto_referencia: null, anexo: 'Aula 14D-102' },
  { id: 'D-103', nombre: 'Aula 14D-103', tipo: 'AULA', bloque: 'D', piso: 'PLANTA ALTA', responsable: 'Gestión Académica', coordenadas: null, foto_referencia: null, anexo: 'Aula 14D-103' },
  { id: 'D-104', nombre: 'Aula 14D-104', tipo: 'AULA', bloque: 'D', piso: 'PLANTA ALTA', responsable: 'Gestión Académica', coordenadas: null, foto_referencia: null, anexo: 'Aula 14D-104' },
  { id: 'D-105', nombre: 'Aula 14D-105', tipo: 'AULA', bloque: 'D', piso: 'PLANTA ALTA', responsable: 'Gestión Académica', coordenadas: null, foto_referencia: null, anexo: 'Aula 14D-105' },
  { id: 'D-106', nombre: 'Aula 14D-106', tipo: 'AULA', bloque: 'D', piso: 'PLANTA ALTA', responsable: 'Gestión Académica', coordenadas: null, foto_referencia: null, anexo: 'Aula 14D-106' },
  { id: 'D-107', nombre: 'Aula 14D-107', tipo: 'AULA', bloque: 'D', piso: 'PLANTA ALTA', responsable: 'Gestión Académica', coordenadas: null, foto_referencia: null, anexo: 'Aula 14D-107' },
  { id: 'D-108', nombre: 'Aula 14D-108', tipo: 'AULA', bloque: 'D', piso: 'PLANTA ALTA', responsable: 'Gestión Académica', coordenadas: null, foto_referencia: null, anexo: 'Aula 14D-108' },

  // ─── BLOQUE E — PLANTA BAJA ───────────────────────────────────────────────
  { id: 'E-FE_FS',      nombre: 'Flujo de Entrada y Salida',                                    tipo: 'ENTRADA /SALIDA', bloque: 'E', piso: 'PLANTA BAJA', responsable: 'Gestión Académica', coordenadas: { lat: -2.148339, lng: -79.912246 }, foto_referencia: null, anexo: 'FLUJO_E/S' },
  { id: 'E-PB-OFI-01',  nombre: 'Oficina Ingeniería de Planta',                                 tipo: 'OFICINA',         bloque: 'E', piso: 'PLANTA BAJA', responsable: 'Gestión Académica', coordenadas: { lat: -2.148297, lng: -79.912263 }, foto_referencia: null, anexo: 'ANEXO1' },
  { id: 'E-PB-LAB-02',  nombre: 'Laboratorio de Electricidad y Electrónica; Lab. de Automatización Industrial', tipo: 'LABORATORIO', bloque: 'E', piso: 'PLANTA BAJA', responsable: 'Gestión Académica', coordenadas: { lat: -2.148297, lng: -79.912263 }, foto_referencia: null, anexo: 'ANEXO2' },
  { id: 'E-PB-LAB-03',  nombre: 'Laboratorio de Robótica y Automatismo',                        tipo: 'LABORATORIO',     bloque: 'E', piso: 'PLANTA BAJA', responsable: 'Gestión Académica', coordenadas: { lat: -2.148308, lng: -79.912348 }, foto_referencia: null, anexo: 'ANEXO3' },
  { id: 'E-PB-LAB-04',  nombre: 'Laboratorio Industrial; Lab. de Resistencia de Materiales',   tipo: 'LABORATORIO',     bloque: 'E', piso: 'PLANTA BAJA', responsable: 'Gestión Académica', coordenadas: { lat: -2.148333, lng: -79.912389 }, foto_referencia: null, anexo: 'ANEXO4' },
  { id: 'E-PB-TAL-05',  nombre: 'Taller de Soldadura',                                          tipo: 'TALLER',          bloque: 'E', piso: 'PLANTA BAJA', responsable: 'Gestión Académica', coordenadas: { lat: -2.148278, lng: -79.912361 }, foto_referencia: null, anexo: 'ANEXO5' },

  // ─── BLOQUE E — PLANTA ALTA ───────────────────────────────────────────────
  { id: 'E-PA-OFI-06',  nombre: 'Oficina',                                 tipo: 'OFICINA',     bloque: 'E', piso: 'PLANTA ALTA', responsable: 'Gestión Académica', coordenadas: { lat: -2.148344, lng: -79.912276 }, foto_referencia: null, anexo: 'ANEXO6' },
  { id: 'E-PA-LAB-07',  nombre: 'Laboratorio Académico de Gestión de la Producción', tipo: 'LABORATORIO', bloque: 'E', piso: 'PLANTA ALTA', responsable: 'Gestión Académica', coordenadas: { lat: -2.148333, lng: -79.912306 }, foto_referencia: null, anexo: 'ANEXO7' },
  { id: 'E-PA-AUD-08',  nombre: 'Sala de Conferencias y Posgrados',        tipo: 'AUDITORIO',   bloque: 'E', piso: 'PLANTA ALTA', responsable: 'Gestión Académica', coordenadas: { lat: -2.148278, lng: -79.912278 }, foto_referencia: null, anexo: 'ANEXO8' },
  { id: 'E-PA-AUL-09',  nombre: 'Aula Producción',                         tipo: 'AULA',        bloque: 'E', piso: 'PLANTA ALTA', responsable: 'Gestión Académica', coordenadas: { lat: -2.148357, lng: -79.912304 }, foto_referencia: null, anexo: 'ANEXO9' },
  { id: 'E-PA-LAB-10',  nombre: 'Laboratorio de Networking',               tipo: 'LABORATORIO', bloque: 'E', piso: 'PLANTA ALTA', responsable: 'Gestión Académica', coordenadas: { lat: -2.148348, lng: -79.912334 }, foto_referencia: null, anexo: 'ANEXO10' },
  { id: 'E-PA-BAÑO-11', nombre: 'Baños y SS HH',                           tipo: 'BAÑOS',       bloque: 'E', piso: 'PLANTA ALTA', responsable: 'Gestión Académica', coordenadas: { lat: -2.148338, lng: -79.912347 }, foto_referencia: null, anexo: 'ANEXO11' },
];

async function seed() {
  console.log(`Cargando ${espacios.length} espacios a Firestore...`);
  await Promise.all(
    espacios.map(espacio => {
      // El "id" se usa SOLO como clave del documento, no se guarda como campo
      // (sería redundante). "activo" se agrega por defecto en true.
      const { id, ...data } = espacio;
      return setDoc(doc(db, 'espacios', id), { activo: true, ...data }).then(() =>
        console.log(`  ✓ ${id}`)
      );
    })
  );
  console.log('\nListo. Todos los espacios fueron cargados.');
  await terminate(db);
  process.exit(0);
}

seed().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
