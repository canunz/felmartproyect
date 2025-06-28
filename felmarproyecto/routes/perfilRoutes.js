// routes/perfilRoutes.js
const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middlewares/auth'); // Descomentado para restaurar protección
const pool = require('../config/database');
const bcrypt = require('bcrypt');

const perfilController = require('../controllers/perfilController');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configuración de multer para subir imágenes de perfil
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    const dir = path.join(__dirname, '../public/uploads/perfiles');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function(req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `perfil-${req.session.usuario.id}-${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Solo se permiten archivos de imagen.'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: fileFilter
});

// Ruta para mostrar el perfil del usuario (abierta)
router.get('/', isAuthenticated, perfilController.getPerfil);
const { Cliente, Region, Comuna } = require('../models');

// Ruta para mostrar el perfil del usuario
router.get('/', isAuthenticated, async (req, res) => {
    try {
        const userId = req.session.usuario.id;
        
        // Obtener datos del usuario
        const [usuarios] = await pool.query(
            'SELECT * FROM usuarios WHERE id = ?',
            [userId]
        );
        
        if (usuarios.length === 0) {
            req.flash('error', 'Usuario no encontrado');
            return res.redirect('/dashboard');
        }
        
        // No enviar la contraseña al frontend
        const usuario = usuarios[0];
        delete usuario.password;

        // Si es un cliente, verificar si tiene perfil de cliente
        if (req.session.usuario.rol === 'cliente' && !req.session.clienteId) {
            return res.redirect('/perfil/registro-cliente');
        }

        // Si tiene perfil de cliente, obtener sus datos
        let datosCliente = null;
        if (req.session.clienteId) {
            datosCliente = await Cliente.findByPk(req.session.clienteId, {
                include: [
                    { model: Region, as: 'RegionCliente' },
                    { model: Comuna }
                ]
            });
        }
        
        res.render('perfil/perfil', {
            titulo: 'Mi Perfil',
            perfilUsuario: usuario,
            cliente: datosCliente
        });
    } catch (error) {
        console.error('Error al cargar perfil:', error);
        req.flash('error', 'Error al cargar la información del perfil');
        res.redirect('/dashboard');
    }
});

// Ruta para mostrar el formulario de registro de cliente
router.get('/registro-cliente', isAuthenticated, async (req, res) => {
    try {
        if (req.session.usuario.rol !== 'cliente') {
            req.flash('error', 'No tienes permisos para acceder a esta sección');
            return res.redirect('/perfil');
        }

        // Verificar si ya tiene un perfil de cliente
        const clienteExistente = await Cliente.findOne({
            where: { usuario_id: req.session.usuario.id }
        });

        if (clienteExistente) {
            return res.redirect('/perfil');
        }

        // Obtener regiones para el formulario
        const regiones = await Region.findAll({
            order: [['nombre', 'ASC']]
        });
        
        res.render('perfil/registro-cliente', {
            titulo: 'Registro de Datos de Cliente',
            usuario: req.session.usuario,
            regiones: regiones,
            messages: {
                error: req.flash('error'),
                success: req.flash('success')
            },
            currentPage: 'perfil'
        });
    } catch (error) {
        console.error('Error al cargar formulario de registro:', error);
        req.flash('error', 'Error al cargar el formulario');
        res.redirect('/perfil');
    }
});

// Ruta para procesar el registro de cliente
router.post('/registro-cliente', isAuthenticated, async (req, res) => {
    try {
        if (req.session.usuario.rol !== 'cliente') {
            req.flash('error', 'No tienes permisos para realizar esta acción');
            return res.redirect('/perfil');
        }

        const {
            rut,
            nombre_empresa,
            telefono,
            contacto_principal,
            direccion,
            comuna_id,
            region_id
        } = req.body;

        // Crear el cliente
        const cliente = await Cliente.create({
            rut,
            usuario_id: req.session.usuario.id,
            nombre_empresa,
            telefono,
            contacto_principal,
            direccion,
            comuna_id,
            region_id
        });

        // Guardar el ID del cliente en la sesión
        req.session.clienteId = cliente.rut;

        req.flash('success', 'Perfil de cliente creado exitosamente');
        res.redirect('/dashboard/cliente');
    } catch (error) {
        console.error('Error al registrar cliente:', error);
        req.flash('error', 'Error al registrar los datos del cliente');
        res.redirect('/perfil/registro-cliente');
    }
});

// Ruta para actualizar el perfil (abierta)
router.post('/actualizar', isAuthenticated, perfilController.actualizarPerfil);

// Ruta para cambiar la contraseña (abierta)
router.post('/cambiar-password', isAuthenticated, perfilController.cambiarPassword);

// Ruta para mostrar el formulario de cambio de contraseña
router.get('/cambiar-password', isAuthenticated, (req, res) => {
  res.render('perfil/cambiar-password', {
    titulo: 'Cambiar Contraseña',
    usuario: req.session.usuario,
    error: req.flash('error'),
    success: req.flash('success')
  });
});

// Ruta para actualizar la imagen de perfil
router.post('/actualizar-imagen', isAuthenticated, upload.single('imagenPerfil'), perfilController.actualizarImagen);

module.exports = router;