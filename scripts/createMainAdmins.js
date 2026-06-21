// Ejecutar UNA SOLA VEZ con: node scripts/createMainAdmins.js
// Crea las cuentas de Firebase Auth para los 2 admins "principales" que ya
// existían en Firestore (con email agregado a mano), generando una
// contraseña provisional para cada uno y enviándola por correo (Brevo).
// Fuerza el cambio de contraseña en su primer ingreso (mustChangePassword).

require('dotenv').config();
const { initializeApp } = require('firebase/app');
const { getFirestore, doc, updateDoc, terminate } = require('firebase/firestore');
const { getAuth, createUserWithEmailAndPassword } = require('firebase/auth');

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
const auth = getAuth(app);

const BREVO_API_KEY     = process.env.EXPO_PUBLIC_BREVO_API_KEY;
const BREVO_SENDER_MAIL = process.env.EXPO_PUBLIC_BREVO_SENDER_EMAIL;
const BREVO_SENDER_NAME = process.env.EXPO_PUBLIC_BREVO_SENDER_NAME || 'InduMap';

const ADMINS = [
  { cedula: '0932488398', email: 'bxaviermaldoparedes@gmail.com' },
  { cedula: '0958750028', email: 'damarispenafiel2023@gmail.com' },
];

function generateTempPassword(length = 10) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  let pwd = '';
  for (let i = 0; i < length; i++) pwd += chars[Math.floor(Math.random() * chars.length)];
  return pwd;
}

async function sendMail(toEmail, cedula, tempPassword) {
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': BREVO_API_KEY, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      sender: { name: BREVO_SENDER_NAME, email: BREVO_SENDER_MAIL },
      to: [{ email: toEmail }],
      subject: 'Acceso de administrador — InduMap',
      htmlContent: `
        <div style="font-family:Arial,sans-serif;color:#001D41;">
          <h2>Bienvenido a InduMap</h2>
          <p>Se ha creado tu cuenta de <strong>administrador principal</strong>.</p>
          <p><strong>Cédula:</strong> ${cedula}</p>
          <p><strong>Contraseña provisional:</strong> ${tempPassword}</p>
          <p>Por seguridad, deberás cambiar esta contraseña la primera vez que ingreses a la app.</p>
        </div>
      `,
    }),
  });
  if (!res.ok) throw new Error(`Brevo respondió ${res.status}: ${await res.text()}`);
}

async function run() {
  for (const a of ADMINS) {
    const tempPassword = generateTempPassword();
    console.log(`\n→ ${a.cedula} (${a.email})`);
    try {
      await createUserWithEmailAndPassword(auth, a.email, tempPassword);
      console.log(`  ✓ Cuenta de Auth creada`);
    } catch (err) {
      console.log(`  ✗ No se pudo crear la cuenta de Auth: ${err.code || err.message}`);
      continue;
    }
    await updateDoc(doc(db, 'admins', a.cedula), { mustChangePassword: true });
    console.log(`  ✓ mustChangePassword = true`);
    try {
      await sendMail(a.email, a.cedula, tempPassword);
      console.log(`  ✓ Correo enviado a ${a.email}`);
    } catch (err) {
      console.log(`  ✗ No se pudo enviar el correo. Contraseña provisional: ${tempPassword}`);
    }
  }
  await terminate(db);
  process.exit(0);
}

run().catch(err => { console.error(err); process.exit(1); });
