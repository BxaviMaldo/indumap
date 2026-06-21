---
name: indumap-proyecto
description: Qué es InduMap, su stack y propósito (proyecto de fin de curso)
metadata:
  type: project
---

InduMap es una app **Expo 54 / React Native 0.81 / TypeScript** (proyecto de fin de curso de Gestión de Proyectos Informáticos) para que estudiantes y visitantes conozcan la **Facultad de Ingeniería Industrial de la Universidad de Guayaquil**.

- Pantallas (navegación por estado en `App.tsx`, sin React Navigation): `LoginScreen` (visitante / admin por cédula), `MapScreen` (mapa 3D del campus con `@react-three/fiber/native` + `three`), `BloqueScreen` (planos 2D por bloque).
- Backend: **Firebase Web SDK v12** (Firestore), config en `src/config/firebase.ts`, datos en colección `espacios` (92 docs) y `admins`. Seed en `scripts/seedFirestore.js`. Lecturas en `src/services/espacios.ts`.
- Se corre con `npx expo start --dev-client`. Ver [[firestore-conexion-rn]] y [[bloquescreen-layout-planos]].
