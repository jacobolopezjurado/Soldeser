/**
 * Servicio de envío de emails
 * Configurar SMTP en .env: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM
 */

const crypto = require('crypto');

/**
 * Genera una contraseña aleatoria segura
 */
function generatePassword(length = 12) {
  const chars = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%';
  let password = '';
  const randomBytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    password += chars[randomBytes[i] % chars.length];
  }
  return password;
}

/**
 * Envía email con credenciales de acceso
 */
async function sendWelcomeEmail(to, firstName, lastName, email, password, appName = 'SOLDESER') {
  const nodemailer = require('nodemailer');

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER
      ? {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        }
      : undefined,
  });

  const from = process.env.EMAIL_FROM || `noreply@${process.env.SMTP_HOST || 'soldeser.com'}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #E85D04; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9f9f9; padding: 24px; border: 1px solid #eee; border-top: none; border-radius: 0 0 8px 8px; }
    .credentials { background: #fff; border: 2px solid #E85D04; border-radius: 8px; padding: 16px; margin: 20px 0; font-family: monospace; }
    .credentials p { margin: 8px 0; }
    .label { font-weight: bold; color: #666; }
    .warning { color: #d32f2f; font-size: 14px; margin-top: 16px; }
    .footer { margin-top: 24px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="header">
    <h1 style="margin:0;">${appName}</h1>
    <p style="margin:8px 0 0 0;">Sistema de Fichaje</p>
  </div>
  <div class="content">
    <p>Hola ${firstName},</p>
    <p>Se ha creado tu cuenta en ${appName}. Aquí tienes tus credenciales para iniciar sesión en la aplicación:</p>
    
    <div class="credentials">
      <p><span class="label">Usuario (email):</span><br>${email}</p>
      <p><span class="label">Contraseña:</span><br>${password}</p>
    </div>
    
    <p>Te recomendamos cambiar la contraseña la primera vez que inicies sesión desde el perfil.</p>
    <p class="warning">⚠️ No compartas estas credenciales con nadie.</p>
    
    <div class="footer">
      <p>Este es un email automático. Si no esperabas este mensaje, contacta con administración.</p>
    </div>
  </div>
</body>
</html>
  `.trim();

  await transporter.sendMail({
    from,
    to,
    subject: `Bienvenido a ${appName} - Tus credenciales de acceso`,
    html,
    text: `Hola ${firstName},\n\nSe ha creado tu cuenta en ${appName}.\n\nUsuario (email): ${email}\nContraseña: ${password}\n\nTe recomendamos cambiar la contraseña la primera vez que inicies sesión.\n\nNo compartas estas credenciales con nadie.`,
  });
}

module.exports = {
  generatePassword,
  sendWelcomeEmail,
};
