// app.js
require('dotenv').config();
const express         = require('express');
const path            = require('path');
const session         = require('express-session');
const flash           = require('connect-flash');
const helmet          = require('helmet');
const cors            = require('cors');
const expressLayouts  = require('express-ejs-layouts');
const sequelize       = require('./config/database');

// Cargar modelos y asociaciones
require('./models');

// Importar todas las rutas necesarias
const apiRoutes       = require('./routes/api');
const contactoRoutes = require('./routes/contactoRoutes');
const precioresiduosRoutes = require('./routes/precioresiduosRoutes');
const solicitudRoutes = require('./routes/solicitudRoutes');
const clienteRoutes = require('./routes/clienteRoutes');
const cotizacionRoutes = require('./routes/cotizacionRoutes');
const certificadoRoutes = require('./routes/certificadoRoutes');
const perfilRoutes = require('./routes/perfilRoutes');
const usuarioRoutes = require('./routes/usuarioRoutes');
const visitaRoutes = require('./routes/visitaRoutes');
const residuoRoutes = require('./routes/residuoRoutes');
const reporteRoutes = require('./routes/reporteRoutes');
const calendarioRoutes = require('./routes/calendarioRoutes');

const app = express();

// Verificar conexión del correo al inicio
try {
  const { verifyConnection } = require('./config/email.config');
  verifyConnection();
} catch (error) {
  console.log('⚠️  Email config no encontrado, continuando sin verificación de email');
}

// Seguridad HTTP headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      "default-src": ["'self'"],
      "script-src": [
        "'self'",
        "'unsafe-inline'",
        "'unsafe-eval'",
        "https://cdn.jsdelivr.net",
        "https://cdnjs.cloudflare.com",
        "https://code.jquery.com",
        "https://kit.fontawesome.com",
        "https://cdn.datatables.net"
      ],
      "script-src-attr": ["'unsafe-inline'"],
      "style-src": [
        "'self'",
        "'unsafe-inline'",
        "https://cdn.jsdelivr.net",
        "https://cdnjs.cloudflare.com",
        "https://fonts.googleapis.com",
        "https://cdn.datatables.net"
      ],
      "font-src": [
        "'self'",
        "https://fonts.gstatic.com",
        "https://cdnjs.cloudflare.com",
        "data:"
      ],
      "img-src": ["'self'", "data:"],
      "media-src": ["'self'", "blob:"],
      "object-src": ["'self'"]
    }
  },
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginEmbedderPolicy: false
}));

// CORS y parsers
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Archivos estáticos
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));
app.use(express.static(path.join(__dirname, 'public')));

// Configuración de Vistas y Layouts EJS (ORDEN CRÍTICO)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layouts/main');

// Flash messages
app.use(flash());

// Sesiones
app.use(session({
  secret: process.env.SESSION_SECRET || 'secreto-felmart',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Permitir HTTP en desarrollo
    maxAge: 24 * 60 * 60 * 1000,  // 1 día
    sameSite: 'lax'
  }
}));

// Middleware para garantizar la integridad de datos de sesión
app.use(async (req, res, next) => {
  if (req.session.usuario) {
    const camposRequeridos = ['id', 'nombre', 'email', 'rol'];
    
    const sesionCompleta = camposRequeridos.every(campo => 
      req.session.usuario[campo] !== undefined
    );
    
    if (!sesionCompleta && req.session.usuario.id) {
      console.log('Completando datos de sesión para usuario ID:', req.session.usuario.id);
      
      try {
        const [usuarios] = await sequelize.query(
          `SELECT id, nombre, email, rol FROM usuarios WHERE id = ${parseInt(req.session.usuario.id, 10)}`
        );
        
        if (usuarios.length > 0) {
          camposRequeridos.forEach(campo => {
            if (req.session.usuario[campo] === undefined && usuarios[0][campo] !== undefined) {
              req.session.usuario[campo] = usuarios[0][campo];
            }
          });
          
          req.session.save(err => {
            if (err) console.error('Error al guardar sesión:', err);
            next();
          });
        } else {
          req.session.usuario = null;
          req.session.save(err => {
            if (err) console.error('Error al guardar sesión:', err);
            next();
          });
        }
      } catch (error) {
        console.error('Error al recuperar datos de usuario:', error);
        next();
      }
    } else {
      next();
    }
  } else {
    next();
  }
});

// Middleware para variables globales
app.use((req, res, next) => {
  res.locals.usuario = req.session.usuario || null;
  res.locals.success = req.flash('success');
  res.locals.error = req.flash('error');
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  res.locals.currentPath = req.path;
  res.locals.currentPage = '';
  next();
});

// Importar controladores
const clienteController = require('./controllers/clienteController');

// === RUTAS DE CLIENTES (COMPLETAS) - PRIORIDAD ALTA ===
// Rutas para las vistas de clientes (dashboard, solicitudes, cotizaciones, etc.)
app.use('/clientes', clienteRoutes);
console.log('✅ Rutas de clientes cargadas en /clientes');

// === RUTAS API ===
app.use('/api', apiRoutes);
console.log('✅ Rutas API cargadas en /api');

// === USAR RUTAS PRINCIPALES ===
const routes = require('./routes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const adminRoutes = require('./routes/adminRoutes');
app.use('/', routes);
app.use('/dashboard', dashboardRoutes);
app.use('/admin', adminRoutes);

// === RUTAS DE COTIZACIONES ===
app.use('/cotizaciones', cotizacionRoutes);
console.log('✅ Rutas de cotizaciones cargadas en /cotizaciones');

// === RUTAS DE CERTIFICADOS ===
app.use('/', certificadoRoutes);
console.log('✅ Rutas de certificados cargadas');

// === RUTAS DE SOLICITUDES ===
app.use('/solicitudes', solicitudRoutes);
console.log('✅ Rutas de solicitudes cargadas en /solicitudes');

// === RUTAS DE PERFIL ===
app.use('/perfil', perfilRoutes);
console.log('✅ Rutas de perfil cargadas en /perfil');

// === RUTAS DE USUARIOS ===
app.use('/usuarios', usuarioRoutes);
console.log('✅ Rutas de usuarios cargadas en /usuarios');

// === RUTAS DE VISITAS ===
app.use('/visitas', visitaRoutes);
console.log('✅ Rutas de visitas cargadas en /visitas');

// === RUTAS DE RESIDUOS ===
app.use('/residuos', residuoRoutes);
console.log('✅ Rutas de residuos cargadas en /residuos');

// === RUTAS DE REPORTES ===
app.use('/reportes', reporteRoutes);
console.log('✅ Rutas de reportes cargadas en /reportes');

// === RUTAS DE CALENDARIO ===
app.use('/calendario', calendarioRoutes);
console.log('✅ Rutas de calendario cargadas en /calendario');

// === RUTAS DE RESIDUOS Y PRECIOS ===
// Rutas para gestión de residuos y cotizaciones públicas
app.use('/residuos', precioresiduosRoutes);
console.log('✅ Rutas de precios de residuos cargadas en /residuos');

// Rutas administrativas de residuos
app.use('/admin/residuos', precioresiduosRoutes);
console.log('✅ Rutas administrativas de residuos cargadas en /admin/residuos');

// === RUTAS API ===
// Rutas API - IMPORTANTE: cargar las rutas de clientes
const clientesApiRoutes = require('./routes/api');
app.use('/api', clientesApiRoutes);
app.use('/clisolicitudes/api', clientesApiRoutes);
console.log('✅ Rutas API de clientes cargadas en /api y /clisolicitudes/api');

// Otras rutas API
app.use('/api/cmf', require('./routes/api/cmfBancos.routes'));

// Rutas de contacto
app.use('/contacto', contactoRoutes);

// Manejo de errores
app.use((err, req, res, next) => {
  console.error(err.stack);
  if (req.accepts('html')) {
    res.status(500).render('500', { error: err });
  } else {
    res.status(500).json({ 
      success: false, 
      message: 'Error interno del servidor' 
    });
  }
});

// Iniciar el servidor solo si el archivo se ejecuta directamente
if (require.main === module) {
  sequelize.sync()
      .then(() => {
          const PORT = process.env.PORT || 3000;
          app.listen(PORT, () => {
              console.log(`🚀 Servidor iniciado en puerto ${PORT}`);
              console.log(`🌐 Accede a: http://localhost:${PORT}`);
              console.log(`📊 Clientes: http://localhost:${PORT}/dashboard/clientes`);
              console.log(`📝 Cotizaciones: http://localhost:${PORT}/admin/cotizaciones`);
              console.log(`💰 Cotizar: http://localhost:${PORT}/cotizaciones/cotizar`);
              console.log(`👥 Portal Cliente: http://localhost:${PORT}/clientes`);
          });
      })
      .catch(err => {
          console.error('Error al conectar con la base de datos:', err);
      });
}

module.exports = app;