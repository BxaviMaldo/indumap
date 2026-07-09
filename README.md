# InduMap 🗺️

Aplicación móvil para que **nuevos estudiantes y visitantes** conozcan la
**Facultad de Ingeniería Industrial** de la Universidad de Guayaquil. Muestra el
campus en un **mapa 3D** interactivo y permite explorar cada bloque con sus
**planos internos 2D**, buscar aulas/laboratorios y ubicar cada espacio.

> Proyecto de fin de curso — **Gestión de Proyectos Informáticos** · Grupo 1

---

## ✨ Funcionalidades

### Para visitantes
- **Mapa 3D del campus** (vista libre): bloques A, B, C, D, E, Bar, Baños,
  parqueaderos, área común, cancha y muro.
  - Controles: **2 dedos** mueven la cámara, **1 dedo** rota, **pellizco** hace zoom.
  - Al tocar un bloque se resalta y aparece el botón **"Ver espacios"**.
- **Planos internos 2D** de cada bloque, por piso (Planta Baja, Primer Piso,
  Segundo Piso, Planta Alta), con pasillos, escaleras y entradas.
- **Búsqueda** de espacios (aulas, laboratorios, etc.) con resultados resaltados.
- **Filtros y leyenda** por tipo de espacio.
- **Modo sin conexión**: los espacios se guardan en el dispositivo, así el mapa
  y los planos funcionan aunque no haya internet (tras cargar una vez con red).

### Para administradores
- **Inicio de sesión** con cédula y contraseña (Firebase Auth).
- **Cambio de contraseña obligatorio** en el primer ingreso.
- **Gestión de espacios**: editar nombre, tipo, responsable y estado (activo/inactivo)
  de cada aula/zona; asignar los espacios "Disponibles".
- **Gestión de administradores**: crear, activar/desactivar y **eliminar** admins.
  - Al crear un admin se genera una **contraseña provisional** y se envía por
    **correo** (con aviso de expiración de 24 horas).

---

## 🧱 Tipos de espacio

`AULA`, `LABORATORIO`, `BAÑOS`, `OFICINA`, `INFORMATIVA`, `TALLER`, `AUDITORIO`,
`BODEGA`, `CENTRO MEDICO`, entre otros. Cada tipo tiene su propio color en el
plano, en los filtros y en la leyenda.

---

## 🛠️ Stack tecnológico

| Categoría | Herramientas |
|---|---|
| **Framework** | Expo (SDK 54) · React Native 0.81 · React 19 · TypeScript |
| **Mapa 3D** | three.js · @react-three/fiber · @react-three/drei · expo-gl |
| **Backend** | Firebase — Cloud Firestore + Authentication |
| **Persistencia** | @react-native-async-storage/async-storage (sesión y caché offline) |
| **Correo** | Brevo (API REST de correo transaccional) |
| **Build / distribución** | EAS (Expo Application Services) |

---

## 📁 Estructura del proyecto

```
src/
├── config/firebase.ts       # Inicialización de Firebase (Auth + Firestore)
├── screens/
│   ├── LoginScreen.tsx        # Login visitante / admin
│   ├── ChangePasswordScreen.tsx
│   ├── MapScreen.tsx          # Mapa 3D del campus
│   ├── BloqueScreen.tsx       # Planos 2D internos por bloque/piso
│   └── AdminConfigScreen.tsx  # Panel de administrador
├── services/
│   ├── auth.ts                # Login, logout, cambio de contraseña
│   ├── espacios.ts            # Lectura/edición de espacios + caché offline
│   ├── admins.ts              # Alta/baja de administradores
│   └── mail.ts                # Envío de correo (Brevo)
└── types/espacio.ts           # Tipos de datos
```

---

## 🔐 Firebase

La configuración de Firebase está en `src/config/firebase.ts`. Usa:
- **Cloud Firestore** con `experimentalForceLongPolling: true` (necesario para una
  conexión estable en React Native / emuladores).
- **Authentication** con persistencia en AsyncStorage (la sesión sobrevive al
  reinicio de la app).

Colecciones principales: `espacios` (aulas/zonas) y `admins`.

---

## ⚙️ Variables de entorno

Las credenciales del envío de correo (Brevo) se configuran en un archivo **`.env`**
en la raíz (no se sube a git). Usa el prefijo `EXPO_PUBLIC_` para que Expo las
incluya en el bundle:

```
EXPO_PUBLIC_BREVO_API_KEY=tu-api-key
EXPO_PUBLIC_BREVO_SENDER_EMAIL=correo-remitente-verificado
EXPO_PUBLIC_BREVO_SENDER_NAME=InduMap
```

> Usa una API key de Brevo **restringida solo a "Transactional emails"**, nunca la
> API key maestra.

---

## ▶️ Cómo correr el proyecto (desarrollo)

```bash
npm install
npx expo start --go
```
Presiona `a` para abrir en un emulador/dispositivo Android con **Expo Go**.

---

## 📦 Build de desarrollo con soporte 3D (Development Build)

Este proyecto usa **expo-dev-client** para salir de Expo Go y ejecutar módulos
nativos como `expo-gl` (OpenGL ES), requerido por Three.js y React Three Fiber.

### Requisitos previos
- Cuenta en [expo.dev](https://expo.dev) (gratis)
- EAS CLI instalado globalmente:
  ```bash
  npm install -g eas-cli
  eas login
  ```
- Inicializar EAS en el proyecto (solo la primera vez):
  ```bash
  eas init
  ```

### 1. Compilar el APK de desarrollo (Android)
```bash
eas build --profile development --platform android
```
- EAS compila el APK en la nube (no necesitas Android Studio ni el SDK localmente).
- Cuando termine, descarga el `.apk` desde el link que da EAS o desde
  [expo.dev/builds](https://expo.dev/builds).
- Instala el APK en tu dispositivo Android (habilita "Instalar apps de fuentes
  desconocidas").

### 2. Arrancar el servidor de desarrollo
Con el APK ya instalado en el dispositivo, corre en tu computadora:
```bash
npx expo start --dev-client
```
- Expo muestra un QR. Abre la app **InduMap** (el APK instalado) y escanéalo.
- A partir de aquí tienes hot reload completo con soporte 3D nativo.

### Librerías 3D instaladas
| Paquete | Rol |
|---|---|
| `expo-gl` | Acceso a OpenGL ES desde React Native |
| `three` | Motor 3D (geometrías, materiales, luces) |
| `@react-three/fiber` | API declarativa (JSX) para Three.js |
| `@react-three/drei` | Helpers: cámaras, controles, loaders |

### Ejemplo mínimo de uso 3D
```tsx
import { Canvas } from '@react-three/fiber/native';

export default function App() {
  return (
    <Canvas>
      <ambientLight />
      <mesh>
        <boxGeometry />
        <meshStandardMaterial color="orange" />
      </mesh>
    </Canvas>
  );
}
```

---

## 📱 Generar un APK para compartir (sin Play Store)

```bash
eas build --platform android --profile preview
```
Al terminar, EAS entrega un **link** (y un **QR**) para descargar e instalar el
`.apk` directamente en cualquier Android.

---

## 👥 Créditos

Grupo 1 — Gestión de Proyectos Informáticos · Facultad de Ingeniería Industrial,
Universidad de Guayaquil.
