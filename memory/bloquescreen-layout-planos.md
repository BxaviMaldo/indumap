---
name: bloquescreen-layout-planos
description: Cómo funcionan los planos 2D por bloque/piso y la edición por admin en BloqueScreen.tsx
metadata:
  type: reference
---

`src/screens/BloqueScreen.tsx` dibuja el plano 2D de cada bloque/piso. Una sola pantalla sirve para todos los bloques (recibe prop `bloque` y `tipoUsuario`).

**Planos propios vs genérico:** la const `planoPropio` decide. A y B tienen plano propio en sus 3 pisos; C solo en planta baja. Cada uno es una función `renderPlanoA0/A1/A2/B0/B1/B2/C0` que coloca cajas en absoluto sobre un lienzo `PLAN_W=290 x PLAN_H=380`. Si no hay plano propio, cae al genérico de 2 columnas (`LAYOUT_CONFIG` + `distributeRooms` + `layoutColumn` con pesos).

**Helpers de dibujo (dentro del componente):** `RoomBox(e, rect)` cuarto real clickeable; `LinkedRoomBox(key, e, rect)` varias cajas del MISMO cuarto (p. ej. 3 bibliotecas que se marcan juntas); `AreaBox(key,label,color,rect)` caja visual sin doc; `PasilloBox(key,label,rect)`; `CorridorBox(rect)` pasillo central con flecha ↑ "ENTRADA" al fondo (usado en B). `findRoom(needle)` busca en `porPiso` por nombre; `findPiso(needle)` en todo el piso (incluye tipos ocultos); `findId(id)` por id de documento.

**Colores/filtros/leyenda:** `TYPE_COLOR` y `TYPE_ICON` (AULA, LABORATORIO, BAÑOS, INFORMATIVA, AUDITORIO=naranja). `HIDDEN_TIPOS` oculta OFICINA/TALLER/ACCESO PRINCIPAL/SALIDA/ENTRADA. `FILTROS` + `matchKey` definen los chips; "Sala de docentes" se separa por nombre (incluye "docente"), no por tipo. `roomLabel(e)` muestra "Baños" para los baños. Filtros marcan sin ocultar.

**Edición por administrador:** si `tipoUsuario==='admin'`, el panel de detalle muestra "✏️ Editar" → modal que edita nombre/tipo/responsable y llama `updateEspacio(id, …)` (en `src/services/espacios.ts`), actualiza el estado local y el color/filtro se recalculan solos. Los "slots vacíos" son docs con `nombre: 'Disponible'` (`esDisponible`), se dibujan con borde punteado y no entran a filtros; el admin los asigna con el mismo modal (ej. `C_PB_LIBRE`). Ver [[indumap-proyecto]].
