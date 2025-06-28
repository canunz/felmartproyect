// controllers/dashboardController.js
const { Usuario, SolicitudRetiro, VisitaRetiro, Cliente, Cotizacion } = require('../models');
const { Op, Sequelize } = require('sequelize');
const sequelize = require('../config/database');

/**
 * Renderiza el dashboard con estadísticas y actividades recientes
 */
exports.mostrarDashboard = async (req, res) => {
    try {
        // Obtener estadísticas según el rol del usuario
        let stats = {
            solicitudes: { total: 0, pendientes: 0 },
            cotizaciones: { total: 0, pendientes: 0 },
            visitas: { proximas: 0 }
        };
        
        // Filtrar por cliente si el usuario es cliente
        const whereCliente = req.usuario.rol === 'cliente' 
            ? { cliente_id: req.usuario.clienteId } 
            : {};
        
        // Estadísticas de solicitudes
        const [totalSolicitudes, solicitudesPendientes] = await Promise.all([
            SolicitudRetiro.count({ where: whereCliente }),
            SolicitudRetiro.count({ 
                where: { 
                    ...whereCliente,
                    estado: 'pendiente'
                } 
            })
        ]);
        
        stats.solicitudes.total = totalSolicitudes;
        stats.solicitudes.pendientes = solicitudesPendientes;
        
        // Estadísticas de cotizaciones
        const [totalCotizaciones, cotizacionesPendientes] = await Promise.all([
            Cotizacion.count({ where: whereCliente }),
            Cotizacion.count({ 
                where: { 
                    ...whereCliente,
                    estado: 'pendiente'
                } 
            })
        ]);
        
        stats.cotizaciones.total = totalCotizaciones;
        stats.cotizaciones.pendientes = cotizacionesPendientes;
        
        // Próximas visitas (para la semana actual)
        const hoy = new Date();
        const finDeSemana = new Date();
        finDeSemana.setDate(hoy.getDate() + 7);
        
        const visitasProximas = await VisitaRetiro.count({
            where: {
                ...whereCliente,
                fecha: {
                    [Op.between]: [hoy, finDeSemana]
                }
            }
        });
        
        stats.visitas.proximas = visitasProximas;
        
        // Para administradores, añadir estadísticas de clientes
        if (['administrador', 'operador'].includes(req.usuario.rol)) {
            const totalClientes = await Cliente.count();
            const clientesNuevosMes = await Cliente.count({
                where: {
                    createdAt: {
                        [Op.gte]: new Date(new Date().setDate(1)) // Primer día del mes actual
                    }
                }
            });
            
            stats.clientes = {
                total: totalClientes,
                nuevosMes: clientesNuevosMes
            };
        }
        
        // Obtener actividades recientes
        const actividades = await obtenerActividadesRecientes(req.usuario);
        
        if (req.usuario.rol === 'administrador') {
            // Datos para las tablas del dashboard de admin
            const solicitudesUrgentes = await SolicitudRetiro.findAll({
                where: { estado: 'pendiente' },
                order: [['fechaSolicitud', 'ASC']],
                limit: 5,
                include: [{ model: Cliente, attributes: ['nombre_empresa'] }]
            });

            const proximasVisitas = await VisitaRetiro.findAll({
                where: { fecha: { [Op.gte]: new Date() } },
                order: [['fecha', 'ASC']],
                limit: 5,
                include: [{ model: Cliente, attributes: ['nombre_empresa'] }, { model: Usuario, as: 'operador', attributes: ['nombre'] }]
            });

            // Agregar conteo de visitas pendientes
            const visitasPendientes = await VisitaRetiro.count({
                where: { estado: 'pendiente' }
            });

            const clientesRecientes = await Cliente.findAll({
                order: [['createdAt', 'DESC']],
                limit: 5,
            });

            // NUEVO: Últimos usuarios registrados
            const ultimosUsuarios = await Usuario.findAll({
                order: [['createdAt', 'DESC']],
                limit: 5,
                attributes: ['nombre', 'email', 'createdAt']
            });

            // NUEVO: Últimas cotizaciones
            const ultimasCotizaciones = await Cotizacion.findAll({
                order: [['createdAt', 'DESC']],
                limit: 5,
                include: [{ model: Cliente, as: 'clienteDirecto', attributes: ['nombre_empresa'], required: false }]
            });

            // Obtener datos para los gráficos
            const clientesPorComuna = await Cliente.findAll({
                attributes: ['comuna', [sequelize.fn('COUNT', sequelize.col('comuna')), 'total']],
                group: ['comuna'],
                order: [[sequelize.col('total'), 'DESC']],
                limit: 10
            });
            
            const cotizacionesPorEstado = await Cotizacion.findAll({
                attributes: ['estado', [sequelize.fn('COUNT', sequelize.col('estado')), 'total']],
                group: ['estado']
            });

            // Obtener datos de solicitudes por estado
            const solicitudesPorEstado = await SolicitudRetiro.findAll({
                attributes: ['estado', [sequelize.fn('COUNT', sequelize.col('estado')), 'total']],
                group: ['estado']
            });

            const clientesComunaLabels = clientesPorComuna.map(c => c.comuna);
            const clientesComunaData = clientesPorComuna.map(c => c.get('total'));

            const cotizacionesEstadoLabels = cotizacionesPorEstado.map(c => c.estado);
            const cotizacionesEstadoData = cotizacionesPorEstado.map(c => c.get('total'));

            // Definir estados posibles de solicitudes y mapear los datos
            const estadosSolicitudes = ['pendiente', 'en_proceso', 'completada', 'cancelada'];
            const solicitudesEstadoLabels = estadosSolicitudes;
            const solicitudesEstadoData = estadosSolicitudes.map(estado => {
                const found = solicitudesPorEstado.find(s => s.estado === estado);
                return found ? parseInt(found.get('total')) : 0;
            });

            if (typeof solicitudesEstadoLabels === 'undefined') {
                solicitudesEstadoLabels = [];
            }
            if (typeof solicitudesEstadoData === 'undefined') {
                solicitudesEstadoData = [];
            }

            return res.render('dashboard/admin', {
                layout: 'layouts/admin',
                usuario: req.session.usuario,
                solicitudesUrgentes,
                proximasVisitas,
                clientesRecientes,
                ultimosUsuarios,
                ultimasCotizaciones,
                visitasPendientes,
                // Datos para los gráficos
                clientesComunaLabels,
                clientesComunaData,
                cotizacionesEstadoLabels,
                cotizacionesEstadoData,
                solicitudesEstadoLabels,
                solicitudesEstadoData
            });
        } else if (req.usuario.rol === 'cliente') {
            // Buscar información del cliente para determinar si mostrar notificación
            const cliente = await Cliente.findOne({ 
                where: { usuario_id: req.usuario.id } 
            });
            
            // Obtener estadísticas específicas del cliente
            const [solicitudes, visitas] = await Promise.all([
                SolicitudRetiro.findAll({
                    where: { cliente_id: cliente ? cliente.rut : null },
                    order: [['createdAt', 'DESC']]
                }),
                VisitaRetiro.findAll({
                    where: { clienteId: cliente ? cliente.rut : null }
                })
            ]);

            // Calcula los valores reales para los contadores
            const misSolicitudes = solicitudes.length;
            const solicitudesPendientes = solicitudes.filter(s => s.estado && s.estado.toLowerCase() === 'pendiente').length;
            const proximasVisitas = visitas.filter(v => 
                v.fecha && new Date(v.fecha) >= new Date() && 
                v.estado && ['pendiente', 'confirmada'].includes(v.estado.toLowerCase())
            ).length;

            const ultimasSolicitudes = solicitudes.slice(0, 5).map(s => ({
                id: s.id,
                fechaSolicitud: s.createdAt,
                direccionRetiro: s.descripcion || 'Sin descripción',
                estado: s.estado,
                tipo: s.tipo_solicitud || '',
                urgencia: s.urgencia || '',
                descripcion: s.descripcion || ''
            }));
            
            return res.render('dashboard/cliente', {
                currentPage: 'dashboard',
                stats,
                actividades,
                usuario: {
                    nombre: req.usuario.nombre,
                    rol: req.usuario.rol,
                    clienteId: req.usuario.clienteId
                },
                mostrarNotificacion: !cliente,
                misSolicitudes,
                solicitudesPendientes,
                proximasVisitas,
                ultimasSolicitudes
            });
        }
        
        res.render('dashboard/index', {
            currentPage: 'dashboard',
            stats,
            actividades,
            usuario: {
                nombre: req.usuario.nombre,
                rol: req.usuario.rol
            }
        });
        
    } catch (error) {
        console.error('Error en dashboard:', error);
        res.status(500).render('error', {
            mensaje: 'Error al cargar el dashboard',
            error: process.env.NODE_ENV === 'development' ? error : {}
        });
    }
};

/**
 * Obtiene las actividades recientes para mostrar en el dashboard
 */
async function obtenerActividadesRecientes(usuario) {
    try {
        // Si el usuario es cliente, buscar su información de cliente
        let whereCliente = {};
        if (usuario.rol === 'cliente') {
            const cliente = await Cliente.findOne({ 
                where: { usuario_id: usuario.id } 
            });
            if (cliente) {
                whereCliente = { cliente_id: cliente.rut };
            }
        }
        
        // Obtener últimas solicitudes
        const solicitudesRecientes = await SolicitudRetiro.findAll({
            where: whereCliente,
            include: [
                { model: Cliente, attributes: ['nombre_empresa'] }
            ],
            order: [['createdAt', 'DESC']],
            limit: 3
        });
        
        // Obtener últimas visitas
        const visitasRecientes = await VisitaRetiro.findAll({
            where: whereCliente,
            include: [
                { model: Cliente, attributes: ['nombre_empresa'] }
            ],
            order: [['fecha', 'DESC']],
            limit: 3
        });
        
        // Combinar y ordenar actividades
        const actividades = [
            ...solicitudesRecientes.map(s => ({
                tipo: 'solicitud',
                id: s.id,
                titulo: `Solicitud de retiro`,
                descripcion: `Solicitud para ${s.descripcion || 'Sin descripción'}`,
                fecha: s.createdAt,
                estado: s.estado
            })),
            ...visitasRecientes.map(v => ({
                tipo: 'visita',
                id: v.id,
                titulo: `Visita programada`,
                descripcion: `Visita programada para ${v.fecha}`,
                fecha: v.fecha,
                estado: v.estado
            }))
        ].sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
         .slice(0, 5);
        
        return actividades;
        
    } catch (error) {
        console.error('Error al obtener actividades recientes:', error);
        return [];
    }
}

/**
 * Formatea una fecha como tiempo relativo (ej: "hace 2 días")
 */
function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    
    let interval = Math.floor(seconds / 31536000);
    if (interval > 1) return `Hace ${interval} años`;
    
    interval = Math.floor(seconds / 2592000);
    if (interval > 1) return `Hace ${interval} meses`;
    
    interval = Math.floor(seconds / 86400);
    if (interval > 1) return `Hace ${interval} días`;
    
    interval = Math.floor(seconds / 3600);
    if (interval > 1) return `Hace ${interval} horas`;
    
    interval = Math.floor(seconds / 60);
    if (interval > 1) return `Hace ${interval} minutos`;
    
    return 'Hace unos segundos';
}

/**
 * Formatea una fecha (ej: "24/05/2025")
 */
function formatDate(date) {
    return date.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

const dashboardController = {
    mostrarDashboardAdmin: async (req, res) => {
        try {
            // Obtener estadísticas básicas
            const stats = await dashboardController.getAdminStats();
            
            // Datos para las tablas del dashboard de admin
            const solicitudesUrgentes = await SolicitudRetiro.findAll({
                where: { estado: 'pendiente' },
                order: [['fechaSolicitud', 'ASC']],
                limit: 5,
                include: [{ model: Cliente, attributes: ['nombreEmpresa'], required: false }]
            });

            const proximasVisitas = await VisitaRetiro.findAll({
                where: { fecha: { [Op.gte]: new Date() } },
                order: [['fecha', 'ASC']],
                limit: 5,
                include: [
                    { model: Cliente, attributes: ['nombreEmpresa'], required: false },
                    { model: Usuario, as: 'operador', attributes: ['nombre'], required: false }
                ]
            });

            const clientesRecientes = await Cliente.findAll({
                order: [['createdAt', 'DESC']],
                limit: 5,
            });

            // NUEVO: Últimos usuarios registrados
            const ultimosUsuarios = await Usuario.findAll({
                order: [['createdAt', 'DESC']],
                limit: 5,
                attributes: ['nombre', 'email', 'createdAt']
            });

            // NUEVO: Últimas cotizaciones
            const ultimasCotizaciones = await Cotizacion.findAll({
                order: [['createdAt', 'DESC']],
                limit: 5,
                include: [{ model: Cliente, as: 'clienteDirecto', attributes: ['nombre_empresa'], required: false }]
            });

            // Obtener datos para los gráficos
            const clientesPorComuna = await Cliente.findAll({
                attributes: ['comuna', [sequelize.fn('COUNT', sequelize.col('comuna')), 'total']],
                group: ['comuna'],
                order: [[sequelize.col('total'), 'DESC']],
                limit: 10
            });
            
            const cotizacionesPorEstado = await Cotizacion.findAll({
                attributes: ['estado', [sequelize.fn('COUNT', sequelize.col('estado')), 'total']],
                group: ['estado']
            });

            // Obtener datos de solicitudes por estado
            const solicitudesPorEstado = await SolicitudRetiro.findAll({
                attributes: ['estado', [sequelize.fn('COUNT', sequelize.col('estado')), 'total']],
                group: ['estado']
            });

            const clientesComunaLabels = clientesPorComuna.map(c => c.comuna);
            const clientesComunaData = clientesPorComuna.map(c => c.get('total'));

            const cotizacionesEstadoLabels = cotizacionesPorEstado.map(c => c.estado);
            const cotizacionesEstadoData = cotizacionesPorEstado.map(c => c.get('total'));

            // Definir estados posibles de solicitudes y mapear los datos
            const estadosSolicitudes = ['pendiente', 'en_proceso', 'completada', 'cancelada'];
            const solicitudesEstadoLabels = estadosSolicitudes;
            const solicitudesEstadoData = estadosSolicitudes.map(estado => {
                const found = solicitudesPorEstado.find(s => s.estado === estado);
                return found ? parseInt(found.get('total')) : 0;
            });

            return res.render('dashboard/admin', {
                layout: 'layouts/admin',
                usuario: req.session.usuario,
                solicitudesUrgentes,
                proximasVisitas,
                clientesRecientes,
                ultimosUsuarios,
                ultimasCotizaciones,
                // Estadísticas básicas
                ...stats,
                // Datos para los gráficos
                clientesComunaLabels,
                clientesComunaData,
                cotizacionesEstadoLabels,
                cotizacionesEstadoData,
                solicitudesEstadoLabels,
                solicitudesEstadoData
            });
        } catch (error) {
            console.error('Error al mostrar el dashboard de administrador:', error);
            res.status(500).send('Error al cargar el dashboard');
        }
    },
    // Obtener estadísticas para el dashboard administrativo
    getAdminStats: async () => {
        try {
            // Total de clientes (usuarios con rol 'cliente')
            const totalClientes = await Usuario.count({
                where: {
                    rol: 'cliente'
                }
            });

            // Total de solicitudes pendientes
            const solicitudesPendientes = await SolicitudRetiro.count({
                where: {
                    estado: 'pendiente'
                }
            });

            // Total de visitas programadas para hoy
            const hoy = new Date();
            const fechaHoy = hoy.toISOString().split('T')[0]; // Formato YYYY-MM-DD

            const visitasHoy = await VisitaRetiro.count({
                where: {
                    fecha: fechaHoy
                }
            });

            // Total de servicios completados
            const serviciosCompletados = await VisitaRetiro.count({
                where: {
                    estado: 'retiro'
                }
            });

            return {
                totalClientes,
                solicitudesPendientes,
                visitasHoy,
                serviciosCompletados
            };
        } catch (error) {
            console.error('Error al obtener estadísticas:', error);
            throw error;
        }
    },

    // Renderizar dashboard administrativo
    renderAdminDashboard: async (req, res) => {
        try {
            const stats = await dashboardController.getAdminStats();

            // Obtener cotizaciones por estado
            const cotizacionesPorEstado = await Cotizacion.findAll({
                attributes: [
                    'estado',
                    [Sequelize.fn('COUNT', Sequelize.col('estado')), 'cantidad']
                ],
                group: ['estado']
            });
            const estados = ['pendiente', 'aceptada', 'rechazada', 'vencida'];
            const cotizacionesEstadoData = estados.map(estado => {
                const found = cotizacionesPorEstado.find(c => c.estado === estado);
                return found ? parseInt(found.dataValues.cantidad) : 0;
            });

            // Obtener clientes por comuna
            const clientesPorComuna = await Cliente.findAll({
                attributes: [
                    'comuna_id',
                    [Sequelize.fn('COUNT', Sequelize.col('comuna_id')), 'cantidad']
                ],
                include: [{
                    model: require('../models/Comuna'),
                    attributes: ['nombre']
                }],
                group: ['comuna_id', 'Comuna.id'],
                order: [[Sequelize.fn('COUNT', Sequelize.col('comuna_id')), 'DESC']],
                limit: 10 // Top 10 comunas
            });
            const clientesComunaLabels = clientesPorComuna.map(c => c.Comuna ? c.Comuna.nombre : 'Desconocida');
            const clientesComunaData = clientesPorComuna.map(c => parseInt(c.dataValues.cantidad));

            // Obtener datos de solicitudes por estado
            const solicitudesPorEstado = await SolicitudRetiro.findAll({
                attributes: [
                    'estado',
                    [Sequelize.fn('COUNT', Sequelize.col('estado')), 'cantidad']
                ],
                group: ['estado']
            });
            
            // Definir estados posibles de solicitudes
            const estadosSolicitudes = ['pendiente', 'en_proceso', 'completada', 'cancelada'];
            const solicitudesEstadoLabels = estadosSolicitudes;
            const solicitudesEstadoData = estadosSolicitudes.map(estado => {
                const found = solicitudesPorEstado.find(s => s.estado === estado);
                return found ? parseInt(found.dataValues.cantidad) : 0;
            });

            res.render('dashboard/admin', {
                usuario: req.session.usuario,
                titulo: 'Panel de Administración',
                ...stats,
                cotizacionesEstadoData,
                cotizacionesEstadoLabels: estados,
                clientesComunaLabels,
                clientesComunaData,
                solicitudesEstadoLabels,
                solicitudesEstadoData
            });
        } catch (error) {
            console.error('Error al renderizar dashboard:', error);
            req.flash('error', 'Error al cargar el dashboard');
            res.redirect('/');
        }
    }
};

module.exports = dashboardController;