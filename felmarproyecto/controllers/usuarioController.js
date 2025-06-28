// controllers/usuarioController.js
const crypto       = require('crypto');
const { transporter, sendMailWithRetry } = require('../config/email.config');
const { Usuario, Cliente, SolicitudRetiro, VisitaRetiro } = require('../models');
const { Op, Sequelize } = require('sequelize');
const moment       = require('moment');
const emailTemplates = require('../templates/emailTemplates');
const nodemailer = require('nodemailer');
const bcrypt = require('bcrypt');

const usuarioController = {
  // 1) Registro / Login / Logout ----------------------------------

  mostrarRegistro: (req, res) => {
    res.render('usuarios/registro', {
      titulo: 'Registro de Usuario',
      error: req.flash('error')[0] || null,
      success: req.flash('success')[0] || null
    });
  },

  registrar: async (req, res) => {
    try {
      const { nombre, email, password, confirmarPassword } = req.body;

      // Validar campos vacíos
      if (!nombre || !email || !password || !confirmarPassword) {
        req.flash('error', 'Todos los campos son obligatorios');
        return res.redirect('/registro');
      }

      // Validar que las contraseñas coincidan
      if (password !== confirmarPassword) {
        req.flash('error', 'Las contraseñas no coinciden');
        return res.redirect('/registro');
      }

      // Validar formato de email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        req.flash('error', 'El formato del correo electrónico no es válido');
        return res.redirect('/registro');
      }

      // Validar longitud de contraseña
      if (password.length < 6) {
        req.flash('error', 'La contraseña debe tener al menos 6 caracteres');
        return res.redirect('/registro');
      }

      // Verificar si el email ya existe
      const usuarioExistente = await Usuario.findOne({ where: { email } });
      if (usuarioExistente) {
        req.flash('error', 'Ya existe una cuenta con este correo electrónico');
        return res.redirect('/registro');
      }

      // Crear nuevo usuario
      await Usuario.create({ nombre, email, password, rol: 'cliente' });
      
      req.flash('success', 'Usuario registrado exitosamente. Ya puedes iniciar sesión.');
      res.redirect('/login');

    } catch (error) {
      console.error('Error al registrar usuario:', error);
      req.flash('error', 'Error interno del servidor. Intenta nuevamente');
      res.redirect('/registro');
    }
  },

  mostrarLogin: (req, res) => {
    res.render('usuarios/login', {
      titulo: 'Iniciar Sesión',
      error: req.flash('error')[0] || null,
      success: req.flash('success')[0] || null
    });
  },

  login: async (req, res) => {
    try {
      const { email, password } = req.body;

      // 1. Validar campos vacíos
      if (!email || !password) {
        req.flash('error', 'Por favor completa todos los campos obligatorios');
        return res.redirect('/login');
      }

      // 2. Validar formato de email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        req.flash('error', 'El formato del correo electrónico no es válido');
        return res.redirect('/login');
      }

      // 3. Buscar usuario por email
      const usuario = await Usuario.findOne({ where: { email } });
      if (!usuario) {
        req.flash('error', 'El correo electrónico no está registrado en nuestro sistema');
        return res.redirect('/login');
      }

      // 4. Verificar si la cuenta está activa
      if (!usuario.activo) {
        req.flash('error', 'Tu cuenta está desactivada. Contacta con soporte técnico');
        return res.redirect('/login');
      }

      // 5. Verificar contraseña
      const passwordValido = await usuario.verificarPassword(password);
      if (!passwordValido) {
        req.flash('error', 'La contraseña ingresada es incorrecta');
        return res.redirect('/login');
      }

      // 6. Si todo está correcto, crear la sesión
      req.session.usuario = {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol
      };

      // 7. Si es cliente, buscar información adicional
      if (usuario.rol === 'cliente') {
        try {
          const cliente = await Cliente.findOne({ where: { usuario_id: usuario.id } });
          if (cliente) {
            req.session.clienteId = cliente.rut;
          }
        } catch (clienteError) {
          console.error('Error al buscar cliente:', clienteError);
          // No bloqueamos el login por este error, solo lo registramos
        }
      }

      // 8. Guardar la sesión y redireccionar
      req.session.save(err => {
        if (err) {
          console.error('Error al guardar la sesión:', err);
          req.flash('error', 'Error interno del servidor. Intenta nuevamente');
          return res.redirect('/login');
        }

        // Determinar URL de redirección según el rol
        let redirectUrl;
        switch (usuario.rol) {
          case 'administrador':
            redirectUrl = '/admin';
            break;
          case 'operador':
            redirectUrl = '/operador/dashboard';
            break;
          case 'cliente':
            redirectUrl = '/dashboard/cliente';
            break;
          default:
            redirectUrl = req.session.returnTo || '/dashboard';
        }
        
        // Limpiar returnTo y redireccionar
        delete req.session.returnTo;
        
        res.redirect(redirectUrl);
      });

    } catch (error) {
      console.error('Error en el login:', error);
      
      // Mensaje de error genérico para errores del servidor
      req.flash('error', 'Error interno del servidor. Por favor, intenta nuevamente');
      res.redirect('/login');
    }
  },

  logout: (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error('Error al cerrar sesión:', err);
      }
      res.redirect('/login');
    });
  },

  // 2) Recuperación de contraseña ----------------------------------

  mostrarOlvidePassword: (req, res) => {
    res.render('usuarios/olvide-password', {
      titulo: 'Recuperar Contraseña',
      error: req.flash('error')[0] || null,
      success: req.flash('success')[0] || null
    });
  },

  enviarResetPassword: async (req, res) => {
    try {
      const { email } = req.body;
      
      // Validar que se proporcionó un email
      if (!email) {
        req.flash('error', 'Por favor ingrese su correo electrónico');
        return res.redirect('/usuarios/olvide-password');
      }

      // Validar formato de email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        req.flash('error', 'El formato del correo electrónico no es válido');
        return res.redirect('/usuarios/olvide-password');
      }

      const usuario = await Usuario.findOne({ where: { email } });
      if (!usuario) {
        req.flash('error', 'No existe una cuenta registrada con este correo electrónico');
        return res.redirect('/usuarios/olvide-password');
      }

      // Verificar si la cuenta está activa
      if (!usuario.activo) {
        req.flash('error', 'Tu cuenta está desactivada. Contacta con soporte técnico');
        return res.redirect('/usuarios/olvide-password');
      }

      // Generar token y establecer expiración
      const token = crypto.randomBytes(20).toString('hex');
      const expiracion = Date.now() + 3600000; // 1 hora

      // Guardar token y expiración en la base de datos
      usuario.resetPasswordToken = token;
      usuario.resetPasswordExpires = new Date(expiracion);
      await usuario.save();

      // Enviar correo electrónico
      const resetUrl = `${req.protocol}://${req.get('host')}/usuarios/reset-password/${token}`;
      
      // Usar la plantilla de correo
      const { subject, html } = emailTemplates.resetPassword(usuario.nombre, resetUrl);
      
      // Configuración del correo
      const mailOptions = {
        to: usuario.email,
        from: {
          name: 'Felmart - Gestión de Residuos',
          address: process.env.EMAIL_USER
        },
        subject,
        html
      };

      // Enviar correo con reintentos
      await sendMailWithRetry(mailOptions);
      
      // Mensaje de éxito y redirección
      req.flash('success', 'Se ha enviado un enlace de recuperación a tu correo electrónico. Por favor revisa tu bandeja de entrada.');
      res.redirect('/usuarios/olvide-password');
      
    } catch (error) {
      console.error('Error al enviar correo de recuperación:', error);
      req.flash('error', 'Error al enviar el correo de recuperación. Por favor intenta nuevamente');
      res.redirect('/usuarios/olvide-password');
    }
  },

  mostrarResetPassword: async (req, res) => {
    try {
      const { token } = req.params;
      
      if (!token) {
        req.flash('error', 'Token de recuperación no válido');
        return res.redirect('/usuarios/olvide-password');
      }

      const usuario = await Usuario.findOne({
        where: {
          resetPasswordToken: token,
          resetPasswordExpires: { [Op.gt]: Date.now() }
        }
      });

      if (!usuario) {
        req.flash('error', 'El enlace de recuperación no es válido o ha expirado');
        return res.redirect('/usuarios/olvide-password');
      }

      res.render('usuarios/reset-password', {
        titulo: 'Restablecer Contraseña',
        token,
        error: req.flash('error')[0] || null,
        success: req.flash('success')[0] || null
      });

    } catch (error) {
      console.error('Error al mostrar reset-password:', error);
      req.flash('error', 'Error al procesar la solicitud');
      res.redirect('/usuarios/olvide-password');
    }
  },

  resetPassword: async (req, res) => {
    const { token } = req.params;
    const { password, confirmPassword } = req.body;

    try {
      // Validar que se proporcionaron las contraseñas
      if (!password || !confirmPassword) {
        req.flash('error', 'Por favor completa todos los campos');
        return res.redirect(`/usuarios/reset-password/${token}`);
      }

      // Validar longitud de contraseña
      if (password.length < 6) {
        req.flash('error', 'La contraseña debe tener al menos 6 caracteres');
        return res.redirect(`/usuarios/reset-password/${token}`);
      }

      // Validar que las contraseñas coincidan
      if (password !== confirmPassword) {
        req.flash('error', 'Las contraseñas no coinciden');
        return res.redirect(`/usuarios/reset-password/${token}`);
      }

      // Buscar usuario con token válido
      const usuario = await Usuario.findOne({
        where: {
          resetPasswordToken: token,
          resetPasswordExpires: { [Op.gt]: Date.now() }
        }
      });

      if (!usuario) {
        req.flash('error', 'El enlace de recuperación no es válido o ha expirado');
        return res.redirect('/usuarios/olvide-password');
      }

      // Hashear la nueva contraseña y actualizar
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      await usuario.update({
        password: hashedPassword,
        resetPasswordToken: null,
        resetPasswordExpires: null
      }, {
        hooks: false // Evita el doble hasheo
      });

      req.flash('success', 'Tu contraseña ha sido actualizada correctamente. Ya puedes iniciar sesión');
      res.redirect('/login');

    } catch (error) {
      console.error('Error al resetear la contraseña:', error);
      req.flash('error', 'Error al cambiar la contraseña. Intenta nuevamente');
      res.redirect(`/usuarios/reset-password/${token}`);
    }
  },

  // 3) Cambiar contraseña en sesión --------------------------------

  mostrarCambiarPassword: (req, res) => {
    res.render('usuarios/cambiar-password', {
      titulo: 'Cambiar Contraseña',
      usuario: req.session.usuario,
      error: req.flash('error')[0] || null,
      success: req.flash('success')[0] || null
    });
  },

  cambiarPassword: async (req, res) => {
    try {
      const { actual, nueva, confirmar } = req.body;

      // Validar campos vacíos
      if (!actual || !nueva || !confirmar) {
        req.flash('error', 'Por favor completa todos los campos');
        return res.redirect('/usuarios/cambiar-password');
      }

      // Validar longitud de nueva contraseña
      if (nueva.length < 6) {
        req.flash('error', 'La nueva contraseña debe tener al menos 6 caracteres');
        return res.redirect('/usuarios/cambiar-password');
      }

      // Validar que las contraseñas nuevas coincidan
      if (nueva !== confirmar) {
        req.flash('error', 'Las contraseñas nuevas no coinciden');
        return res.redirect('/usuarios/cambiar-password');
      }

      // Buscar usuario y verificar contraseña actual
      const usuario = await Usuario.findByPk(req.session.usuario.id);
      if (!usuario) {
        req.flash('error', 'Usuario no encontrado');
        return res.redirect('/usuarios/cambiar-password');
      }

      const passwordActualValida = await usuario.verificarPassword(actual);
      if (!passwordActualValida) {
        req.flash('error', 'La contraseña actual es incorrecta');
        return res.redirect('/usuarios/cambiar-password');
      }

      // Actualizar contraseña
      usuario.password = nueva;
      await usuario.save();

      req.flash('success', 'Contraseña cambiada correctamente');
      res.redirect('/dashboard');

    } catch (error) {
      console.error('Error al cambiar contraseña:', error);
      req.flash('error', 'Error al cambiar la contraseña. Intenta nuevamente');
      res.redirect('/usuarios/cambiar-password');
    }
  },

  // 4) Dashboard & administración de usuarios ---------------------

  dashboard: async (req, res) => {
    try {
      const { usuario } = req.session;
      
      if (usuario.rol === 'administrador') {
        return res.render('dashboard/admin', {
          usuario,
          titulo: 'Panel de Administración',
          totalClientes: 0,
          totalSolicitudes: 0,
          totalVisitas: 0,
          error: req.flash('error')[0] || null,
          success: req.flash('success')[0] || null
        });
      }

      if (usuario.rol === 'operador') {
        // Obtener algunos datos generales
        const totalUsuarios = await Usuario.count();
        const totalClientes = await Cliente.count();
        const totalSolicitudes = await SolicitudRetiro.count();
        const totalVisitas = await VisitaRetiro.count();
        
        return res.render('dashboard', {
          titulo: 'Panel de Administración',
          usuario,
          totalUsuarios,
          totalClientes,
          totalSolicitudes,
          totalVisitas,
          error: req.flash('error')[0] || null,
          success: req.flash('success')[0] || null
        });
      } else {
        // Si es cliente
        return res.render('dashboard', {
          titulo: 'Mi Panel',
          usuario,
          error: req.flash('error')[0] || null,
          success: req.flash('success')[0] || null
        });
      }

    } catch (error) {
      console.error('Error en dashboard:', error);
      req.flash('error', 'Error al cargar el panel');
      res.redirect('/');
    }
  },

  listarUsuarios: async (req, res) => {
    try {
      const usuarios = await Usuario.findAll({
        order: [['createdAt', 'DESC']]
      });

      res.render('usuarios/listar', {
        titulo: 'Listado de Usuarios',
        usuarios,
        usuario: req.session.usuario,
        error: req.flash('error')[0] || null,
        success: req.flash('success')[0] || null
      });

    } catch (error) {
      console.error('Error al listar usuarios:', error);
      req.flash('error', 'Error al cargar la lista de usuarios');
      res.redirect('/dashboard');
    }
  },

  mostrarCrearUsuario: (req, res) => {
    res.render('usuarios/crear', {
      titulo: 'Crear Usuario',
      usuario: req.session.usuario,
      error: req.flash('error')[0] || null,
      success: req.flash('success')[0] || null
    });
  },

  crearUsuario: async (req, res) => {
    try {
      const { nombre, email, password, rol } = req.body;

      // Validar campos vacíos
      if (!nombre || !email || !password || !rol) {
        req.flash('error', 'Todos los campos son obligatorios');
        return res.redirect('/usuarios/crear');
      }

      // Validar formato de email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        req.flash('error', 'El formato del correo electrónico no es válido');
        return res.redirect('/usuarios/crear');
      }

      // Verificar si el email ya existe
      const usuarioExistente = await Usuario.findOne({ where: { email } });
      if (usuarioExistente) {
        req.flash('error', 'Ya existe un usuario con este correo electrónico');
        return res.redirect('/usuarios/crear');
      }

      // Crear usuario
      await Usuario.create({ nombre, email, password, rol });
      req.flash('success', 'Usuario creado correctamente');
      res.redirect('/usuarios');

    } catch (error) {
      console.error('Error al crear usuario:', error);
      req.flash('error', 'Error al crear el usuario');
      res.redirect('/usuarios/crear');
    }
  },

  mostrarEditarUsuario: async (req, res) => {
    try {
      const usuarioEdit = await Usuario.findByPk(req.params.id);
      
      if (!usuarioEdit) {
        req.flash('error', 'Usuario no encontrado');
        return res.redirect('/usuarios');
      }

      res.render('usuarios/editar', {
        titulo: 'Editar Usuario',
        usuario: req.session.usuario,
        usuarioEdit,
        error: req.flash('error')[0] || null,
        success: req.flash('success')[0] || null
      });

    } catch (error) {
      console.error('Error al mostrar editar usuario:', error);
      req.flash('error', 'Error al cargar el usuario');
      res.redirect('/usuarios');
    }
  },

  editarUsuario: async (req, res) => {
    try {
      const { nombre, email, rol, activo } = req.body;
      const usuarioId = req.params.id;

      // Validar campos vacíos
      if (!nombre || !email || !rol) {
        req.flash('error', 'Los campos nombre, email y rol son obligatorios');
        return res.redirect(`/usuarios/editar/${usuarioId}`);
      }

      // Validar formato de email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        req.flash('error', 'El formato del correo electrónico no es válido');
        return res.redirect(`/usuarios/editar/${usuarioId}`);
      }

      // Verificar si el email ya existe (excluyendo el usuario actual)
      const usuarioExistente = await Usuario.findOne({ 
        where: { 
          email,
          id: { [Op.ne]: usuarioId }
        }
      });

      if (usuarioExistente) {
        req.flash('error', 'Ya existe otro usuario con este correo electrónico');
        return res.redirect(`/usuarios/editar/${usuarioId}`);
      }

      // Actualizar usuario
      await Usuario.update(
        { 
          nombre, 
          email, 
          rol, 
          activo: activo === 'on' 
        },
        { where: { id: usuarioId } }
      );

      req.flash('success', 'Usuario actualizado correctamente');
      res.redirect('/usuarios');

    } catch (error) {
      console.error('Error al editar usuario:', error);
      req.flash('error', 'Error al actualizar el usuario');
      res.redirect(`/usuarios/editar/${req.params.id}`);
    }
  },

  // 5) Eliminar usuario --------------------------------------------
  eliminarUsuario: async (req, res) => {
    try {
      const usuarioId = req.params.id;
      
      // Verificar que no se elimine a sí mismo
      if (usuarioId == req.session.usuario.id) {
        req.flash('error', 'No puedes eliminar tu propia cuenta');
        return res.redirect('/usuarios');
      }

      const usuario = await Usuario.findByPk(usuarioId);
      if (!usuario) {
        req.flash('error', 'Usuario no encontrado');
        return res.redirect('/usuarios');
      }

      await Usuario.destroy({ where: { id: usuarioId } });
      req.flash('success', 'Usuario eliminado correctamente');
      res.redirect('/usuarios');

    } catch (error) {
      console.error('Error al eliminar usuario:', error);
      req.flash('error', 'Error al eliminar el usuario');
      res.redirect('/usuarios');
    }
  }
};

module.exports = usuarioController;