// routes/solicitudRoutes.js
const express = require('express');
const router = express.Router();
const solicitudController = require('../controllers/solicitudController');
const auth = require('../middlewares/auth');

// Middleware para verificar roles
const checkRole = (roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.session.usuario.rol)) {
            req.flash('error', 'No tienes permiso para acceder a esta función');
            return res.redirect('/dashboard');
        }
        next();
    };
};

// Rutas públicas (requieren autenticación)
router.get('/', auth.isAuthenticated, solicitudController.listar);
router.get('/detalles/:id', auth.isAuthenticated, solicitudController.detalles);

// Rutas para clientes
router.get('/crear', 
    auth.isAuthenticated, 
    checkRole(['cliente']), 
    solicitudController.mostrarCrear
);

router.post('/crear', 
    auth.isAuthenticated, 
    checkRole(['cliente']), 
    solicitudController.crear
);

router.get('/editar/:id', 
    auth.isAuthenticated, 
    checkRole(['cliente']), 
    solicitudController.mostrarEditar
);

router.post('/editar/:id', 
    auth.isAuthenticated, 
    checkRole(['cliente']), 
    solicitudController.editar
);

// Rutas para administradores
router.put('/estado/:id', 
    auth.isAuthenticated, 
    checkRole(['administrador']), 
    solicitudController.cambiarEstado
);

// API para obtener solicitudes (usado en dashboard)
router.get('/api/listar', auth.isAuthenticated, async (req, res) => {
    try {
        const { SolicitudRetiro, Cliente } = require('../models');
        const { usuario } = req.session;
        
        let query = {
            include: [{ 
                model: Cliente,
                as: 'cliente'
            }],
            order: [['created_at', 'DESC']]
        };

        // Si es cliente, solo ver sus solicitudes
        if (usuario.rol === 'cliente' && req.session.cliente) {
            query.where = { cliente_id: req.session.cliente.rut };
        }

        const solicitudes = await SolicitudRetiro.findAll(query);

        res.json({
            success: true,
            data: solicitudes,
            tiposSolicitud: ['retiro', 'evaluacion', 'cotizacion', 'visitas', 'otros'],
            nivelesUrgencia: ['baja', 'media', 'alta'],
            estados: ['pendiente', 'en_proceso', 'completada']
        });
    } catch (error) {
        console.error('Error al obtener solicitudes:', error);
        res.status(500).json({
            success: false,
            message: 'Error al cargar las solicitudes',
            error: error.message
        });
    }
});

module.exports = router;