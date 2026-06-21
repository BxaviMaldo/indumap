// Envío de correo transaccional usando la API REST de Brevo.
// IMPORTANTE: esta llamada se hace desde el cliente (no hay backend en este
// proyecto), por lo que la API key de Brevo queda embebida en el bundle de la
// app. Usa SIEMPRE una API key de Brevo restringida solo a "Transactional
// emails" (Brevo → Settings → API Keys → crear una con permisos limitados),
// nunca la API key maestra de tu cuenta.
//
// Configura estas variables en un archivo .env en la raíz del proyecto
// (no se sube a git) usando el prefijo EXPO_PUBLIC_ para que Expo las
// incluya en el bundle:
//   EXPO_PUBLIC_BREVO_API_KEY=xkeysib-xxxxxxxx
//   EXPO_PUBLIC_BREVO_SENDER_EMAIL=no-reply@tudominio.com
//   EXPO_PUBLIC_BREVO_SENDER_NAME=InduMap
// El correo remitente debe estar verificado en Brevo (Senders & IP).

const BREVO_API_KEY     = process.env.EXPO_PUBLIC_BREVO_API_KEY ?? '';
const BREVO_SENDER_MAIL = process.env.EXPO_PUBLIC_BREVO_SENDER_EMAIL ?? '';
const BREVO_SENDER_NAME = process.env.EXPO_PUBLIC_BREVO_SENDER_NAME ?? 'InduMap';

export async function sendProvisionalPasswordEmail(
  toEmail: string,
  cedula: string,
  tempPassword: string,
): Promise<void> {
  if (!BREVO_API_KEY || !BREVO_SENDER_MAIL) {
    throw new Error('Brevo no está configurado (faltan variables de entorno EXPO_PUBLIC_BREVO_*).');
  }

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': BREVO_API_KEY,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      sender: { name: BREVO_SENDER_NAME, email: BREVO_SENDER_MAIL },
      to: [{ email: toEmail }],
      subject: 'Acceso de administrador — InduMap',
      htmlContent: `
        <div style="font-family:Arial,sans-serif;color:#001D41;">
          <h2>Bienvenido a InduMap</h2>
          <p>Se ha creado una cuenta de <strong>administrador</strong> para ti.</p>
          <p><strong>Cédula:</strong> ${cedula}</p>
          <p><strong>Contraseña provisional:</strong> ${tempPassword}</p>
          <p>Por seguridad, deberás cambiar esta contraseña la primera vez que ingreses a la app.</p>
        </div>
      `,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Brevo respondió ${res.status}: ${body}`);
  }
}
