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
        <div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:auto;border:1px solid #E2E8F0;border-radius:12px;overflow:hidden;background:#ffffff">

          <!-- Encabezado: solo el nombre de la app -->
          <div style="background:#001D41;padding:26px 20px;text-align:center">
            <h1 style="color:#ffffff;margin:0;font-size:26px;letter-spacing:1px">Indu<span style="color:#00A9E0">Map</span></h1>
          </div>

          <!-- Cuerpo -->
          <div style="padding:28px 26px;color:#1f2937">
            <p style="margin:0 0 16px;font-size:15px;line-height:1.6">
              Se ha creado una cuenta de <strong style="color:#001D41">administrador</strong> en InduMap para el usuario
              con cédula <strong style="color:#001D41">${cedula}</strong>. Esta es tu contraseña provisional:
            </p>

            <div style="background:#F1F5F9;border:1px solid #E2E8F0;border-radius:10px;padding:18px;text-align:center;margin:18px 0">
              <span style="font-size:28px;font-weight:800;letter-spacing:6px;color:#001D41">${tempPassword}</span>
            </div>

            <p style="margin:0 0 14px;color:#B71C1C;font-weight:700;font-size:14px">⏱️ Esta contraseña provisional expira en 24 horas.</p>

            <p style="margin:0;font-size:14px;line-height:1.6;color:#475569">
              Abre la app <strong style="color:#001D41">InduMap</strong> e inicia sesión con tu cédula y esta contraseña.
              Por seguridad, deberás crear una contraseña personal la primera vez que ingreses.
            </p>
          </div>

          <!-- Pie -->
          <div style="background:#F8FAFC;border-top:1px solid #E2E8F0;padding:14px;text-align:center">
            <p style="margin:0;color:#94A3B8;font-size:11px">InduMap · Universidad de Guayaquil — Si no esperabas este correo, ignóralo.</p>
          </div>
        </div>
      `,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Brevo respondió ${res.status}: ${body}`);
  }
}
