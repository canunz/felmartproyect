const { Usuario, Cliente } = require('../models');
const bcrypt = require('bcrypt');

// Obtener la página del perfil del usuario (cliente)
exports.getPerfil = async (req, res) => {
    try {
        const usuario = await Usuario.findByPk(req.session.usuario.id, {
            include: [{ model: Cliente }]
        });
        res.render('perfil/perfil', {
            usuario,
            page: 'perfil',
            titulo: 'Mi Perfil'
        });
    } catch (error) {
        console.error(error);
        req.flash('error', 'Error al cargar el perfil.');
        res.redirect('/dashboard');
    }
};

// Actualizar perfil del usuario (cliente)
exports.actualizarPerfil = async (req, res) => {
    // ... (lógica existente)
};

// Cambiar contraseña
exports.cambiarPassword = async (req, res) => {
    // ... (lógica existente)
};

// Actualizar imagen de perfil
exports.actualizarImagen = async (req, res) => {
    // ... (lógica existente)
};

// Obtener la página de perfil del administrador
exports.getAdminProfile = async (req, res) => {
    try {
        const usuario = await Usuario.findByPk(req.session.usuario.id);
        if (!usuario) {
            req.flash('error', 'Usuario no encontrado.');
            return res.redirect('/dashboard');
        }

        res.render('admin/perfil', {
            titulo: 'Mi Perfil',
            usuario: usuario,
            page: 'perfil'
        });
    } catch (error) {
        console.error('Error al obtener el perfil del admin:', error);
        req.flash('error', 'Error al cargar el perfil.');
        res.redirect('/admin');
    }
};

// Actualizar el perfil del administrador
exports.updateAdminProfile = async (req, res) => {
    try {
        const { nombre, email } = req.body;
        const usuarioId = req.session.usuario.id;

        const usuario = await Usuario.findByPk(usuarioId);
        if (!usuario) {
            req.flash('error', 'Usuario no encontrado.');
            return res.redirect('/admin/perfil');
        }

        if (email !== usuario.email) {
            const emailExistente = await Usuario.findOne({ where: { email } });
            if (emailExistente) {
                req.flash('error', 'El correo electrónico ya está en uso.');
                return res.redirect('/admin/perfil');
            }
        }

        await usuario.update({ nombre, email });

        req.session.usuario.nombre = nombre;
        req.session.usuario.email = email;
        await req.session.save();

        req.flash('success', 'Perfil actualizado correctamente.');
        res.redirect('/admin/perfil');
    } catch (error) {
        console.error('Error al actualizar el perfil:', error);
        req.flash('error', 'Error al actualizar el perfil.');
        res.redirect('/admin/perfil');
    }
};

// --- NUEVAS FUNCIONES PARA API DE PERFIL DE ADMIN ---

// Obtener datos del perfil de admin para la API
exports.getAdminProfileApi = async (req, res) => {
    try {
        if (!req.session.usuario || !req.session.usuario.id) {
            return res.status(401).json({ success: false, message: 'No autenticado' });
        }
        const usuario = await Usuario.findByPk(req.session.usuario.id, {
            attributes: ['nombre', 'email', 'telefono', 'rol']
        });
        if (!usuario) {
            return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
        }
        res.json({ success: true, data: usuario });
    } catch (error) {
        console.error('Error al obtener el perfil del admin (API):', error);
        res.status(500).json({ success: false, message: 'Error del servidor.' });
    }
};

// Actualizar perfil del administrador via API
exports.updateAdminProfileApi = async (req, res) => {
    try {
        const { nombre, email, telefono } = req.body;
        const usuarioId = req.session.usuario.id;

        const usuario = await Usuario.findByPk(usuarioId);
        if (!usuario) {
            return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
        }

        // Validar que el nuevo email no esté en uso por otro usuario
        if (email && email !== usuario.email) {
            const emailExistente = await Usuario.findOne({ where: { email } });
            if (emailExistente) {
                return res.status(400).json({ success: false, message: 'El correo electrónico ya está en uso.' });
            }
        }

        usuario.nombre = nombre || usuario.nombre;
        usuario.email = email || usuario.email;
        usuario.telefono = telefono !== undefined ? telefono : usuario.telefono;
        
        await usuario.save();
        
        // Actualizar datos de la sesión
        req.session.usuario.nombre = usuario.nombre;
        req.session.usuario.email = usuario.email;
        req.session.usuario.telefono = usuario.telefono;
        await req.session.save();

        res.json({ success: true, message: 'Perfil actualizado correctamente.' });

    } catch (error) {
        console.error('Error al actualizar el perfil (API):', error);
        res.status(500).json({ success: false, message: 'Error al actualizar el perfil.' });
    }
};

// Cambiar contraseña del administrador via API
exports.changeAdminPasswordApi = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const usuarioId = req.session.usuario.id;

        if (!currentPassword || !newPassword) {
             return res.status(400).json({ success: false, message: 'Todos los campos son requeridos.' });
        }

        const usuario = await Usuario.findByPk(usuarioId);
        if (!usuario) {
            return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
        }

        const passwordValido = await bcrypt.compare(currentPassword, usuario.password);
        if (!passwordValido) {
            return res.status(400).json({ success: false, message: 'La contraseña actual es incorrecta.' });
        }
        
        if (newPassword.length < 8) {
            return res.status(400).json({ success: false, message: 'La nueva contraseña debe tener al menos 8 caracteres.' });
        }

        // Forzar el hasheo manual y guardar sin hooks para garantizar que no haya doble encriptación.
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        await usuario.update({
            password: hashedPassword
        }, {
            hooks: false // ¡Importante! Evita que el hook beforeUpdate se ejecute.
        });

        res.json({ success: true, message: 'Contraseña actualizada correctamente. Por favor, inicie sesión de nuevo.' });

    } catch (error) {
        console.error('Error al cambiar la contraseña (API):', error);
        res.status(500).json({ success: false, message: 'Error al cambiar la contraseña.' });
    }
};