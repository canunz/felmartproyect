const express = require('express');
const router = express.Router();
const { isAuthenticated, isAdmin } = require('../middlewares/auth');
const Cliente = require('../models/Cliente');
const Usuario = require('../models/Usuario');
const SolicitudRetiro = require('../models/SolicitudRetiro');
const perfilController = require('../controllers/perfilController');
const dashboardController = require('../controllers/dashboardController');

// Middleware para verificar si es administrador en todas las rutas de /admin
router.use(isAuthenticated);
router.use(isAdmin);

// Panel de administración principal (muestra el dashboard)
router.get('/', dashboardController.renderAdminDashboard);

// Ruta para la vista de solicitudes
router.get('/solicitud', async (req, res) => {
    try {
        const solicitudes = await SolicitudRetiro.findAll({
            include: [{ 
                model: Cliente,
                as: 'cliente',
                attributes: ['rut', 'nombre_empresa']
            }],
            order: [['created_at', 'DESC']]
        });

        const clientes = await Cliente.findAll({
            order: [['nombre_empresa', 'ASC']]
        });

        res.render('admin/solicitud', {
            titulo: 'Gestión de Solicitudes',
            solicitudes,
            clientes,
            clienteSeleccionado: req.query.cliente || '',
            urgenciaSeleccionada: req.query.urgencia || '',
            fechaSeleccionada: req.query.fecha || '',
            error: req.flash('error'),
            success: req.flash('success')
        });
    } catch (error) {
        console.error('Error al cargar solicitudes:', error);
        req.flash('error', 'Error al cargar la página');
        res.redirect('/dashboard');
    }
});

// Ruta para la vista de cotizaciones
router.get('/cotizaciones', (req, res) => {
    res.render('admin/cotizaciones', {
        titulo: 'Gestión de Cotizaciones'
    });
});

// Ruta para la vista de visitas
router.get('/visitas', (req, res) => {
    res.render('admin/visitas', {
        titulo: 'Gestión de Visitas'
    });
});

// === GESTIÓN DE CLIENTES ===
router.get('/clientes', async (req, res) => {
    try {
        const clientes = await Cliente.findAll({
            include: [{
                model: Usuario,
                attributes: ['email', 'activo']
            }],
            order: [['createdAt', 'DESC']]
        });
        res.render('admin/clientes', {
            titulo: 'Gestión de Clientes',
            clientes,
            messages: {
                error: req.flash('error'),
                success: req.flash('success')
            }
        });
    } catch (error) {
        console.error('Error al listar clientes:', error);
        req.flash('error', 'Error al cargar la lista de clientes');
        res.redirect('/dashboard');
    }
});

// Ver detalles de cliente y formulario de edición
router.get('/clientes/detalles/:id', async (req, res) => {
    try {
        const cliente = await Cliente.findByPk(req.params.id, {
            include: [{ model: Usuario }]
        });
        if (!cliente) {
            req.flash('error', 'Cliente no encontrado');
            return res.redirect('/admin/clientes');
        }
        res.render('admin/cliente-detalles', {
            titulo: 'Detalles del Cliente',
            cliente
        });
    } catch (error) {
        console.error('Error al mostrar detalles del cliente:', error);
        req.flash('error', 'Error al cargar los detalles del cliente');
        res.redirect('/admin/clientes');
    }
});

// Actualizar cliente
router.post('/clientes/editar/:id', async (req, res) => {
    try {
        const cliente = await Cliente.findByPk(req.params.id);
        if (!cliente) {
            req.flash('error', 'Cliente no encontrado');
            return res.redirect('/admin/clientes');
        }
        await cliente.update(req.body);
        if (req.body.email) {
            await Usuario.update({ email: req.body.email }, { where: { id: cliente.usuarioId } });
        }
        req.flash('success', 'Cliente actualizado exitosamente');
        res.redirect('/admin/clientes');
    } catch (error) {
        console.error('Error al actualizar cliente:', error);
        req.flash('error', 'Error al actualizar el cliente');
        res.redirect(`/admin/clientes/detalles/${req.params.id}`);
    }
});

// Eliminar cliente
router.post('/clientes/eliminar/:id', async (req, res) => {
    try {
        const cliente = await Cliente.findByPk(req.params.id);
        if (!cliente) {
            req.flash('error', 'Cliente no encontrado');
            return res.redirect('/admin/clientes');
        }

        await Usuario.destroy({ where: { id: cliente.usuarioId } });
        await cliente.destroy();

        req.flash('success', 'Cliente eliminado exitosamente');
        res.redirect('/admin/clientes');
    } catch (error) {
        console.error('Error al eliminar cliente:', error);
        req.flash('error', 'Error al eliminar el cliente');
        res.redirect('/admin/clientes');
    }
});

// === GESTIÓN DE SOLICITUDES ===
router.get('/solicitudes', async (req, res) => {
    try {
        const solicitudes = await SolicitudRetiro.findAll({
            include: [{ model: Cliente }],
            order: [['created_at', 'DESC']]
        });
        res.render('admin/solicitud', {
            titulo: 'Gestión de Solicitudes',
            solicitudes
        });
    } catch (error) {
        console.error('Error al cargar solicitudes:', error);
        req.flash('error', 'Error al cargar las solicitudes');
        res.redirect('/admin');
    }
});

// Cambiar estado de solicitud
router.post('/solicitudes/cambiar-estado/:id', async (req, res) => {
    try {
        const solicitud = await SolicitudRetiro.findByPk(req.params.id);
        if (!solicitud) {
            req.flash('error', 'Solicitud no encontrada');
            return res.redirect('/admin/solicitudes');
        }
        await solicitud.update({ estado: req.body.estado });
        req.flash('success', 'Estado de solicitud actualizado correctamente');
        res.redirect('/admin/solicitudes');
    } catch (error) {
        console.error('Error al cambiar estado de solicitud:', error);
        req.flash('error', 'Error al actualizar el estado de la solicitud');
        res.redirect('/admin/solicitudes');
    }
});

// === VISTAS ADICIONALES ===

// Perfil del Administrador (Renderiza la vista)
router.get('/perfil', perfilController.getAdminProfile);

// Ayuda y Soporte (Renderiza la vista)
router.get('/ayuda-soporte', (req, res) => {
    res.render('admin/ayuda-soporte', {
        titulo: 'Ayuda y Soporte'
    });
});

module.exports = router; 