// Ejecutar con: node scripts/migrateFirestore.js
// Migración única: agrega el campo "activo" (true) a todos los espacios que no
// lo tengan, y elimina el campo "id" dentro del documento (es redundante con
// la clave del documento en Firestore — no se borra el documento, solo el campo).

const { initializeApp } = require('firebase/app');
const {
  getFirestore, collection, getDocs, doc, updateDoc, deleteField, terminate,
} = require('firebase/firestore');

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

async function migrate() {
  const snap = await getDocs(collection(db, 'espacios'));
  console.log(`Migrando ${snap.size} documentos de "espacios"...`);

  await Promise.all(
    snap.docs.map(async d => {
      const data = d.data();
      const update = {};
      if (data.activo === undefined) update.activo = true;
      if (data.id !== undefined) update.id = deleteField();

      if (Object.keys(update).length > 0) {
        await updateDoc(doc(db, 'espacios', d.id), update);
        console.log(`  ✓ ${d.id}`);
      } else {
        console.log(`  · ${d.id} (sin cambios)`);
      }
    })
  );

  console.log('\nMigración completa.');
  await terminate(db);
  process.exit(0);
}

migrate().catch(err => {
  console.error('Error en la migración:', err);
  process.exit(1);
});
