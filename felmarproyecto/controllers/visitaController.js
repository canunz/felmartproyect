const VisitaRetiro = require('../models/VisitaRetiro');
const Cliente = require('../models/Cliente');
const Cotizacion = require('../models/Cotizacion');
const SolicitudRetiro = require('../models/SolicitudRetiro');
const { transporter, sendMailWithRetry } = require('../config/email.config');
const { nuevaVisita: nuevaVisitaTemplate } = require('../templates/emailTemplates');
const Usuario = require('../models/Usuario');
const mysql = require('mysql2/promise');

// Función para obtener el correo del cliente
async function obtenerCorreoCliente(cliente) {
    try {
        if (!cliente.usuario_id) {
            console.log('❌ Cliente no tiene usuario asociado');
            return null;
        }

        const usuario = await Usuario.findByPk(cliente.usuario_id);
        if (!usuario || !usuario.email) {
            console.log('❌ No se encontró el correo del usuario');
            return null;
        }

        return usuario.email;
    } catch (error) {
        console.error('❌ Error al obtener correo del cliente:', error);
        return null;
    }
}

// Función para enviar correo de visita
async function enviarCorreoVisita(visita, cliente, emailCliente) {
    try {
        if (!emailCliente) {
            console.log(`❌ No se encontró un correo para el cliente ${cliente.nombre_empresa}. No se enviará la notificación.`);
            return false;
        }

        console.log(`📧 Preparando correo para ${cliente.nombre_empresa} a la dirección: ${emailCliente}`);
        
        const emailContent = nuevaVisitaTemplate(visita, cliente);

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: emailCliente,
            ...emailContent
        };

        await sendMailWithRetry(mailOptions);
        console.log(`✅ Correo de visita enviado exitosamente a: ${emailCliente}`);
        return true;
    } catch (error) {
        console.error('❌ Error al enviar correo de visita:', error);
        return false;
    }
}

const visitaController = {
    // Obtener todas las visitas con paginación
    async obtenerVisitas(req, res) {
        try {
            const { page = 1, limit = 50, estado, clienteId } = req.query;
            const offset = (page - 1) * limit;

            // Construir filtros
            const whereClause = {};
            if (estado) whereClause.estado = estado;
            if (clienteId) whereClause.clienteId = clienteId;

            const { count, rows: visitas } = await VisitaRetiro.findAndCountAll({
                where: whereClause,
                include: [
                    {
                        model: Cliente,
                        as: 'cliente',
                        attributes: ['rut', 'nombre_empresa', 'direccion']
                    },
                    {
                        model: Cotizacion,
                        as: 'cotizacion',
                        attributes: ['numeroCotizacion'],
                        required: false
                    },
                    {
                        model: SolicitudRetiro,
                        as: 'solicitud',
                        attributes: ['id'],
                        required: false
                    }
                ],
                order: [['createdAt', 'DESC']],
                limit: parseInt(limit),
                offset: parseInt(offset)
            });

            console.log('DEBUG - Primera visita raw:', JSON.stringify(visitas[0], null, 2)); // DEBUG
            console.log('DEBUG - Cliente de la primera visita:', JSON.stringify(visitas[0]?.cliente, null, 2)); // DEBUG
            console.log('DEBUG - ¿Tiene cliente?', !!visitas[0]?.cliente); // DEBUG
            
            // DEBUG: Verificar si el cliente existe
            if (visitas.length > 0) {
                const clienteId = visitas[0].clienteId;
                console.log('DEBUG - ClienteId de la primera visita:', clienteId);
                
                const clienteExiste = await Cliente.findByPk(clienteId);
                console.log('DEBUG - ¿Cliente existe en BD?', !!clienteExiste);
                if (clienteExiste) {
                    console.log('DEBUG - Datos del cliente:', {
                        rut: clienteExiste.rut,
                        nombre: clienteExiste.nombre_empresa,
                        direccion: clienteExiste.direccion
                    });
                }
            }

            // Formatear datos para la respuesta
            const visitasFormateadas = visitas.map(visita => ({
                id: visita.id,
                clienteId: visita.clienteId,
                cliente_nombre: visita.cliente?.nombre_empresa,
                cliente_direccion: visita.cliente?.direccion,
                tipo_visita: visita.tipoVisita,
                fecha: visita.fecha,
                hora: visita.hora,
                estado: visita.estado,
                observaciones: visita.observaciones,
                cotizacionId: visita.cotizacionId,
                cotizacion_numero: visita.cotizacion?.numeroCotizacion,
                solicitudId: visita.solicitudRetiroId,
                solicitud_numero: visita.solicitud?.numero_solicitud,
                createdAt: visita.createdAt,
                updatedAt: visita.updatedAt
            }));

            console.log('DEBUG - Primera visita formateada:', JSON.stringify(visitasFormateadas[0], null, 2)); // DEBUG

            const totalPaginas = Math.ceil(count / limit);

            res.json({
                success: true,
                data: visitasFormateadas,
                paginacion: {
                    pagina: parseInt(page),
                    totalPaginas,
                    totalRegistros: count,
                    registrosPorPagina: parseInt(limit)
                }
            });

        } catch (error) {
            console.error('Error al obtener visitas:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor al obtener las visitas',
                error: error.message
            });
        }
    },

    // Obtener estadísticas de visitas
    async obtenerEstadisticas(req, res) {
        try {
            const visitas = await VisitaRetiro.findAll();

            const stats = {
                pendiente: 0,
                confirmada: 0,
                completada: 0,
                rechazada: 0
            };

            visitas.forEach(visita => {
                stats[visita.estado]++;
            });

            res.json({
                success: true,
                data: stats
            });

        } catch (error) {
            console.error('Error al obtener estadísticas:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor al obtener estadísticas',
                error: error.message
            });
        }
    },

    // Crear nueva visita
    async crearVisita(req, res) {
        try {
            const {
                cliente_id,
                tipo_visita,
                fecha,
                hora,
                cotizacion_id,
                solicitud_id,
                estado,
                observaciones
            } = req.body;

            console.log('\n--- INICIO crearVisita ---');
            console.log('1. Recibido clienteId (RUT):', cliente_id);

            // Validaciones de campos obligatorios
            if (!cliente_id || !tipo_visita || !fecha || !hora) {
                return res.status(400).json({
                    success: false,
                    message: 'Los campos cliente_id, tipo_visita, fecha y hora son obligatorios'
                });
            }

            const cliente = await Cliente.findOne({
                where: { rut: cliente_id },
                include: [{ model: Usuario }]
            });

            if (!cliente) {
                return res.status(404).json({
                    success: false,
                    message: `Cliente con RUT ${cliente_id} no encontrado`
                });
            }

            // Validar tipo de visita
            if (!['evaluacion', 'retiro'].includes(tipo_visita)) {
                return res.status(400).json({
                    success: false,
                    message: 'Tipo de visita inválido. Debe ser "evaluacion" o "retiro"'
                });
            }

            // Validar fecha futura
            const fechaVisita = new Date(fecha);
            const hoy = new Date();
            hoy.setHours(0, 0, 0, 0);
            if (fechaVisita < hoy) {
                return res.status(400).json({
                    success: false,
                    message: 'La fecha de la visita debe ser futura'
                });
            }

            // Crear la visita
            const nuevaVisita = await VisitaRetiro.create({
                clienteId: cliente_id,
                tipoVisita: tipo_visita,
                fecha,
                hora,
                cotizacionId: cotizacion_id,
                solicitudRetiroId: solicitud_id,
                estado: estado || 'pendiente',
                observaciones
            });

            console.log('5. Intentando enviar correo...');
            const emailCliente = cliente.Usuario?.email;
            const emailEnviado = await enviarCorreoVisita(nuevaVisita, cliente, emailCliente);

            res.status(201).json({
                success: true,
                message: 'Visita creada exitosamente' + (emailEnviado ? ' y notificación enviada.' : ' pero no se pudo enviar la notificación.'),
                data: nuevaVisita
            });

        } catch (error) {
            console.error('Error al crear visita:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor al crear la visita',
                error: error.message
            });
        }
    },

    // Obtener una visita por su ID
    async obtenerVisitaPorId(req, res) {
        try {
            const { id } = req.params;
            const visita = await VisitaRetiro.findByPk(id, {
                include: [{
                    model: Cliente,
                    as: 'cliente',
                    attributes: ['rut', 'nombre_empresa', 'direccion']
                }]
            });

            if (!visita) {
                return res.status(404).json({
                    success: false,
                    message: 'Visita no encontrada'
                });
            }

            res.json({
                success: true,
                data: {
                    id: visita.id,
                    clienteId: visita.clienteId,
                    cliente: visita.cliente,
                    tipo_visita: visita.tipoVisita,
                    fecha: visita.fecha,
                    hora: visita.hora,
                    estado: visita.estado,
                    observaciones: visita.observaciones,
                    createdAt: visita.createdAt,
                    updatedAt: visita.updatedAt
                }
            });

        } catch (error) {
            console.error('Error al obtener visita:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor al obtener la visita',
                error: error.message
            });
        }
    },

    // Actualizar visita
    async actualizarVisita(req, res) {
        try {
            const { id } = req.params;
            const {
                tipo_visita,
                fecha,
                hora,
                estado,
                observaciones
            } = req.body;

            const visita = await VisitaRetiro.findByPk(id);
            if (!visita) {
                return res.status(404).json({
                    success: false,
                    message: 'Visita no encontrada'
                });
            }

            // Validar campos obligatorios si se proporcionan
            if (tipo_visita && !['evaluacion', 'retiro'].includes(tipo_visita)) {
                return res.status(400).json({
                    success: false,
                    message: 'Tipo de visita inválido'
                });
            }

            if (estado && !['pendiente', 'confirmada', 'completada', 'rechazada'].includes(estado)) {
                return res.status(400).json({
                    success: false,
                    message: 'Estado inválido'
                });
            }

            await visita.update({
                tipoVisita: tipo_visita || visita.tipoVisita,
                fecha: fecha || visita.fecha,
                hora: hora || visita.hora,
                estado: estado || visita.estado,
                observaciones: observaciones !== undefined ? observaciones : visita.observaciones
            });

            // Si hay cambios importantes, notificar al cliente
            if (fecha !== visita.fecha || hora !== visita.hora || estado !== visita.estado) {
                const cliente = await Cliente.findByPk(visita.clienteId, {
                    include: [{ model: Usuario }]
                });
                if (cliente && cliente.Usuario?.email) {
                    await enviarCorreoVisita(visita, cliente, cliente.Usuario.email);
                }
            }

            res.json({
                success: true,
                message: 'Visita actualizada exitosamente',
                data: visita
            });

        } catch (error) {
            console.error('Error al actualizar visita:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor al actualizar la visita',
                error: error.message
            });
        }
    },

    // Eliminar visita
    async eliminarVisita(req, res) {
        try {
            const { id } = req.params;

            const visita = await VisitaRetiro.findByPk(id);
            if (!visita) {
                return res.status(404).json({
                    success: false,
                    message: 'Visita no encontrada'
                });
            }

            await visita.destroy();

            res.json({
                success: true,
                message: 'Visita eliminada correctamente'
            });

        } catch (error) {
            console.error('Error al eliminar visita:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor al eliminar la visita',
                error: error.message
            });
        }
    },

    // Obtener clientes para el formulario
    async obtenerClientes(req, res) {
        try {
            const clientes = await Cliente.findAll({
                attributes: ['rut', 'nombre_empresa', 'direccion'],
                order: [['nombre_empresa', 'ASC']]
            });

            res.json({
                success: true,
                data: clientes
            });

        } catch (error) {
            console.error('Error al obtener clientes:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor al obtener los clientes',
                error: error.message
            });
        }
    },

    // Nuevo método para que el cliente responda a la visita
    async responderVisita(req, res) {
        try {
            const { id } = req.params;
            const { estado } = req.body;
            const clienteId = req.usuario.clienteId; // Asumiendo que viene del middleware de autenticación

            // Validar que el estado sea válido para el cliente
            if (!['confirmada', 'rechazada'].includes(estado)) {
                return res.status(400).json({
                    success: false,
                    message: 'Estado inválido. Solo puede ser "confirmada" o "rechazada"'
                });
            }

            // Buscar la visita y verificar que pertenezca al cliente
            const visita = await VisitaRetiro.findOne({
                where: {
                    id,
                    clienteId,
                    estado: 'pendiente' // Solo puede responder si está pendiente
                }
            });

            if (!visita) {
                return res.status(404).json({
                    success: false,
                    message: 'Visita no encontrada o no tienes permiso para responder a esta visita'
                });
            }

            // Actualizar el estado
            await visita.update({ estado });

            // Notificar por email del cambio
            const cliente = await Cliente.findByPk(clienteId, {
                include: [{ model: Usuario }]
            });

            if (cliente && cliente.Usuario?.email) {
                await enviarCorreoVisita(visita, cliente, cliente.Usuario.email);
            }

            res.json({
                success: true,
                message: `Visita ${estado === 'confirmada' ? 'confirmada' : 'rechazada'} exitosamente`,
                data: visita
            });

        } catch (error) {
            console.error('Error al responder a la visita:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor al responder a la visita',
                error: error.message
            });
        }
    }
};

module.exports = visitaController; 