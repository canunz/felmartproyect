const validarRol = (...roles) => {
    return (req, res, next) => {
        if (!req.session || !req.session.usuario) {
            req.flash('error', 'Debe iniciar sesión para acceder a esta página');
            return res.redirect('/login');
        }

        if (!roles.includes(req.session.usuario.rol)) {
            req.flash('error', 'No tiene permisos para acceder a esta página');
            return res.redirect('/dashboard');
        }

        next();
    };
};

const esCliente = (req, res, next) => {
    if (!req.session.usuario) {
        return res.status(401).json({
            msg: 'No hay sesión de usuario activa'
        });
    }

    const { rol } = req.session.usuario;

    if (rol !== 'cliente') {
        return res.status(403).json({
            msg: 'El usuario no tiene rol de cliente'
        });
    }

    next();
}

module.exports = {
    validarRol,
    esCliente
}; 