const nodemailer = require('nodemailer');
require('dotenv').config();

// Crear el transporter de nodemailer
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT) || 587,
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  debug: true, // Habilitar debug
  logger: true // Habilitar logging
});

// Función para verificar la conexión
const verifyConnection = async () => {
  try {
    await transporter.verify();
    console.log('✅ Conexión con el servidor de correo establecida correctamente');
    return true;
  } catch (error) {
    console.error('❌ Error al conectar con el servidor de correo:', error);
    return false;
  }
};

// Función para enviar correo con reintentos
const sendMailWithRetry = async (mailOptions, maxRetries = 3) => {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`📧 Intento ${attempt} de ${maxRetries} para enviar correo...`);
      const info = await transporter.sendMail(mailOptions);
      console.log('✅ Correo enviado exitosamente:', info.messageId);
      return info;
    } catch (error) {
      console.error(`❌ Error en intento ${attempt}:`, error);
      lastError = error;
      
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000; // Backoff exponencial
        console.log(`⏳ Esperando ${delay}ms antes del siguiente intento...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
};

// Validar configuración de correo
const validateEmailConfig = () => {
  const requiredVars = ['EMAIL_USER', 'EMAIL_PASS'];
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error('❌ Variables de entorno faltantes para el correo:', missingVars);
    return false;
  }
  
  return true;
};

module.exports = {
  transporter,
  verifyConnection,
  sendMailWithRetry,
  validateEmailConfig
}; 