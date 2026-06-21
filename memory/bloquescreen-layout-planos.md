---
name: bloquescreen-layout-planos
description: Cómo funciona el sistema de planos 2D por bloque/piso en BloqueScreen.tsx
metadata:
  type: reference
---

En `src/screens/BloqueScreen.tsx` el plano 2D de cada bloque/piso se arma de forma **data-driven**:

- `LAYOUT_CONFIG`: objeto `Record<'BLOQUE-PISO', LayoutItem[]>` (ej. clave `'A-PLANTA BAJA'`). Define qué celdas y en qué orden van.
- Un `LayoutItem` es: un **cuarto real** `{ nombre, col, weight? }` (se vincula a Firestore buscando que `espacio.nombre` incluya `nombre`), o un **elemento visual** `{ feature: 'BAÑOS'|'PASILLO', label, col, weight?, color? }` que no existe en la BD.
- `col`: `'I'` (izquierda) o `'D'` (derecha). El plano son **dos columnas + un pasillo central** (`CORRIDOR`).
- `weight`: altura relativa de la celda dentro de su columna (default 1). `layoutColumn()` reparte el alto por pesos. `cellRect` ya no existe.
- `distributeRooms()` arma las listas `left`/`right` de `PlanCell`; los cuartos no listados en config se anexan alternando al final.
- Render: `renderCell(cell, rect)`. Filtros y búsqueda **marcan** (borde blanco / amarillo) y atenúan el resto a 0.4, **sin ocultar**.

**Limitación importante:** el modelo de 2 columnas no permite cajas que crucen todo el ancho (ej. una "Biblioteca" centrada abajo que ocupe izquierda+centro+derecha). Para eso hace falta un renderer de plano por bloque. NO poner variables de estado del componente (como `piso`) en constantes a nivel de módulo — causa crash. Ver [[indumap-proyecto]].
