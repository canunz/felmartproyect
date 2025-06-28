const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 3, // Máximo 3 intentos por ventana de tiempo
  message: {
    message: 'Demasiados intentos de inicio de sesión. Por favor, inténtelo de nuevo en 15 minutos.',
    type: 'error'
  },
  handler: (req, res, next, options) => {
    // Cuando el límite es excedido, enviamos un flash message y redireccionamos
    req.flash('error', options.message.message);
    res.redirect('/usuarios/login');
  },
  standardHeaders: true, // Devuelve la información del rate limit en los headers `RateLimit-*`
  legacyHeaders: false, // Deshabilita los headers `X-RateLimit-*`
});

module.exports = {
  loginLimiter
}; 