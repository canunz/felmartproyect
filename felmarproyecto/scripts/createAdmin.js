const Usuario = require('../models/Usuario');

async function createAdminUser() {
    try {
        const adminUser = await Usuario.create({
            nombre: 'Administrador',
            email: 'fa.araujo@duocuc.cl',
            password: 'admi1234',
            rol: 'administrador',
            activo: true
        });

        console.log('Usuario administrador creado exitosamente:', adminUser.email);
    } catch (error) {
        console.error('Error al crear el usuario administrador:', error.message);
    }
}

createAdminUser(); 