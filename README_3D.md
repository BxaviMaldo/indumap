# InduMap — Development Build con soporte 3D

Este proyecto usa **expo-dev-client** para salir de Expo Go y ejecutar módulos nativos como `expo-gl` (OpenGL ES), requerido por Three.js y React Three Fiber.

## Requisitos previos

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

## 1. Compilar el APK de desarrollo (Android)

```bash
eas build --profile development --platform android
```

- EAS compila el APK en la nube (no necesitas Android Studio ni SDK localmente)
- Cuando termine, descarga el `.apk` desde el link que te da EAS o desde [expo.dev/builds](https://expo.dev/builds)
- Instala el APK en tu dispositivo Android (debes tener habilitado "Instalar apps de fuentes desconocidas")

## 2. Arrancar el servidor de desarrollo

Con el APK ya instalado en el dispositivo, corre en tu computadora:

```bash
npx expo start --dev-client
```

- Expo muestra un QR code
- Abre la app **InduMap** (el APK que instalaste) y escanea el QR
- A partir de aquí tienes hot reload completo con soporte 3D nativo

## Librerías 3D instaladas

| Paquete | Rol |
|---|---|
| `expo-gl` | Acceso a OpenGL ES desde React Native |
| `expo-three` | Adaptador de Three.js para expo-gl |
| `three` | Motor 3D (geometrías, materiales, luces) |
| `@react-three/fiber` | API declarativa (JSX) para Three.js |
| `@react-three/drei` | Helpers: cámaras, controles, loaders de modelos |

## Ejemplo mínimo de uso 3D

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
