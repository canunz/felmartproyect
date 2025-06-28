const { sendMailWithRetry } = require('../config/email.config');
const emailTemplates = require('../templates/emailTemplates');

const contactoController = {
  /**
   * Envía un correo electrónico desde el formulario de contacto
   */
  enviarMensaje: async (req, res) => {
    try {
      const { nombre, email, telefono, mensaje } = req.body;

      // Validar campos requeridos
      if (!nombre || !email || !mensaje) {
        return res.status(400).json({
          success: false,
          message: 'Por favor complete todos los campos requeridos'
        });
      }

      // Validar formato de correo
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          message: 'El formato del correo electrónico no es válido'
        });
      }

      // Configurar el correo para el administrador
      const adminMailOptions = {
        from: {
          name: 'Felmart - Formulario de Contacto',
          address: process.env.EMAIL_USER
        },
        to: 'catasoledad256@gmail.com, fanny.andreina1@gmail.com',
        ...emailTemplates.contacto({
          nombre,
          email,
          telefono,
          mensaje
        })
      };

      // Enviar el correo al administrador
      await sendMailWithRetry(adminMailOptions);

      // Enviar confirmación al usuario
      const userMailOptions = {
        from: {
          name: 'Felmart - Gestión de Residuos',
          address: process.env.EMAIL_USER
        },
        to: email,
        subject: 'Hemos recibido tu mensaje',
        html: `
          <div style="${emailTemplates.styles.container}">
            <div style="${emailTemplates.styles.content}">
              <div style="${emailTemplates.styles.header}">
                <h1 style="margin: 0; font-size: 24px;">¡Gracias por contactarnos!</h1>
              </div>
              
              <div style="padding: 30px;">
                <div style="${emailTemplates.styles.section}">
                  <p>Estimado(a) ${nombre},</p>
                  <p>Hemos recibido tu mensaje y nos pondremos en contacto contigo a la brevedad posible.</p>
                  <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 15px 0;">
                    <p><strong>Tu mensaje:</strong></p>
                    <p style="white-space: pre-wrap;">${mensaje}</p>
                  </div>
                  <p>Saludos cordiales,</p>
                  <p>Equipo Felmart</p>
                </div>
              </div>

              <div style="${emailTemplates.styles.footer}">
                <p style="margin: 0;">Este es un correo automático, por favor no responda a este mensaje.</p>
              </div>
            </div>
          </div>
        `
      };

      await sendMailWithRetry(userMailOptions);

      res.json({
        success: true,
        message: 'Mensaje enviado correctamente'
      });
    } catch (error) {
      console.error('❌ Error al enviar mensaje de contacto:', error);
      res.status(500).json({
        success: false,
        message: 'Error al enviar el mensaje'
      });
    }
  }
};

module.exports = contactoController; 