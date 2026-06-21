---
name: firestore-conexion-rn
description: Firestore en React Native usa long polling; el error "offline" suele ser red del dispositivo
metadata:
  type: reference
---

En `src/config/firebase.ts` se inicializa Firestore con `initializeFirestore(app, { experimentalForceLongPolling: true })` porque el transporte streaming/WebChannel falla en React Native.

El error `Could not reach Cloud Firestore backend ... offline mode` casi siempre es **conectividad del teléfono**, no del código: el backend responde bien desde la PC (probado, 92 docs en ~1.2s). Si pasa, el dev-client carga el JS desde Metro por LAN pero Firestore necesita internet real del teléfono hacia `firestore.googleapis.com` (datos móviles o `--tunnel` lo confirman; el WiFi de la universidad puede bloquearlo). Ver [[indumap-proyecto]].
