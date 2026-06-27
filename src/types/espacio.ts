export type TipoEspacio =
  | 'AULA'
  | 'LABORATORIO'
  | 'BAÑOS'
  | 'OFICINA'
  | 'INFORMATIVA'
  | 'TALLER'
  | 'AUDITORIO'
  | 'BODEGA'
  | 'CENTRO MEDICO'
  | 'ACCESO PRINCIPAL'
  | 'SALIDA / EVACUACIÓN'
  | 'ENTRADA /SALIDA';

export type Bloque = 'A' | 'B' | 'C' | 'D' | 'E';

export type Piso =
  | 'PLANTA BAJA'
  | 'PRIMERA PLANTA'
  | 'SEGUNDA PLANTA'
  | 'PLANTA ALTA';

export interface Coordenadas {
  lat: number;
  lng: number;
}

export interface Espacio {
  id: string;
  nombre: string;
  tipo: TipoEspacio;
  bloque: Bloque;
  piso: Piso;
  responsable: string;
  activo: boolean;
  coordenadas: Coordenadas | null;
  foto_referencia: string | null;
  anexo: string | null;
}
