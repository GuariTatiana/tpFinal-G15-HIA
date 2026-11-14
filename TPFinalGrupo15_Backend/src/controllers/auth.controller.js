const Usuario = require('../models/usuario.model');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const authCtrl = {};

const JWT_SECRET = process.env.JWT_SECRET || 'SECRET_KEY_CANCHAS_2026';

// Login tradicional
authCtrl.login = async (req, res) => {
    try {
        console.log('Login request received:', req.body);
        const { email, password } = req.body;

        if (!email || !password) {
            console.log('Missing email or password');
            return res.status(400).json({
                message: 'Email y contraseña son requeridos'
            });
        }

        const usuario = await Usuario.findOne({ where: { email } });
        console.log('User found:', usuario ? usuario.email : 'not found');

        if (!usuario) {
            return res.status(401).json({
                message: 'Credenciales incorrectas'
            });
        }

        if (!usuario.estado) {
            return res.status(403).json({
                message: 'Usuario desactivado'
            });
        }

        const passwordMatch = await bcrypt.compare(password, usuario.password);
        if (!passwordMatch) {
            return res.status(401).json({
                message: 'Credenciales incorrectas'
            });
        }

        const token = jwt.sign(
            { id: usuario.id, rol: usuario.rol },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 24 * 60 * 60 * 1000
        });

        res.status(200).json({
            usuario: {
                id: usuario.id,
                nombre: usuario.nombre,
                apellido: usuario.apellido,
                email: usuario.email,
                rol: usuario.rol,
                estado: usuario.estado,
                foto_perfil: usuario.foto_perfil
            }
        });
    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ message: 'Error al iniciar sesión', error: error.message });
    }
};

// Login con Google
authCtrl.loginWithGoogle = async (req, res) => {
    try {
        const { token } = req.body;

        // TODO: Verificar token con Google OAuth API
        // Por ahora, simulamos que el token es válido
        const { email, nombre, apellido, google_id } = req.body;

        let usuario = await Usuario.findOne({ where: { email } });

        if (!usuario) {
            usuario = await Usuario.create({
                nombre,
                apellido,
                email,
                password: 'GOOGLE_AUTH',
                rol: 'jugador',
                estado: true,
                google_id
            });
        }

        const jwtToken = jwt.sign(
            { id: usuario.id, rol: usuario.rol },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.cookie('token', jwtToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 24 * 60 * 60 * 1000
        });

        res.status(200).json({
            usuario: {
                id: usuario.id,
                nombre: usuario.nombre,
                apellido: usuario.apellido,
                email: usuario.email,
                rol: usuario.rol,
                estado: usuario.estado,
                foto_perfil: usuario.foto_perfil
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Error con Google login', error: error.message });
    }
};

// Verificar sesión
authCtrl.checkAuthStatus = async (req, res) => {
    try {
        const token = req.cookies.token;
        if (!token) {
            return res.status(401).json({ message: 'No autenticado' });
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        const usuario = await Usuario.findByPk(decoded.id);

        if (!usuario || !usuario.estado) {
            return res.status(401).json({ message: 'Usuario no válido' });
        }

        res.status(200).json({
            user: {
                id: usuario.id,
                nombre: usuario.nombre,
                apellido: usuario.apellido,
                email: usuario.email,
                rol: usuario.rol,
                estado: usuario.estado,
                foto_perfil: usuario.foto_perfil
            }
        });
    } catch (error) {
        res.status(401).json({ message: 'No autenticado' });
    }
};

// Logout
authCtrl.logout = async (req, res) => {
    try {
        res.clearCookie('token');
        res.status(200).json({ message: 'Sesión cerrada' });
    } catch (error) {
        res.status(500).json({ message: 'Error al cerrar sesión' });
    }
};

// Registro
authCtrl.register = async (req, res) => {
    try {
        const { nombre, apellido, email, password } = req.body;

        const existeUsuario = await Usuario.findOne({ where: { email } });
        if (existeUsuario) {
            return res.status(400).json({ message: 'El email ya está registrado' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const nuevoUsuario = await Usuario.create({
            nombre,
            apellido,
            email,
            password: hashedPassword,
            rol: 'jugador',
            estado: true
        });

        const token = jwt.sign(
            { id: nuevoUsuario.id, rol: nuevoUsuario.rol },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 24 * 60 * 60 * 1000
        });

        res.status(201).json({
            usuario: {
                id: nuevoUsuario.id,
                nombre: nuevoUsuario.nombre,
                apellido: nuevoUsuario.apellido,
                email: nuevoUsuario.email,
                rol: nuevoUsuario.rol,
                estado: nuevoUsuario.estado,
                foto_perfil: nuevoUsuario.foto_perfil
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Error al registrar usuario', error: error.message });
    }
};

// Obtener perfil
authCtrl.getPerfil = async (req, res) => {
    try {
        const token = req.cookies.token;
        const decoded = jwt.verify(token, JWT_SECRET);
        const usuario = await Usuario.findByPk(decoded.id);

        if (!usuario) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        res.status(200).json({
            usuario: {
                id: usuario.id,
                nombre: usuario.nombre,
                apellido: usuario.apellido,
                email: usuario.email,
                rol: usuario.rol,
                estado: usuario.estado,
                foto_perfil: usuario.foto_perfil,
                createdAt: usuario.createdAt,
                updatedAt: usuario.updatedAt
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener perfil', error: error.message });
    }
};

// Actualizar foto de perfil
authCtrl.actualizarFotoPerfil = async (req, res) => {
    try {
        console.log('PATCH /perfil/foto - Body:', req.body);
        console.log('PATCH /perfil/foto - Cookies:', req.cookies);

        const { foto_perfil } = req.body;
        const token = req.cookies.token;

        if (!token) {
            console.log('No token found');
            return res.status(401).json({ message: 'No autenticado' });
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        console.log('Decoded token:', decoded);

        const usuario = await Usuario.findByPk(decoded.id);
        if (!usuario) {
            console.log('Usuario not found with id:', decoded.id);
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        console.log('Updating foto_perfil for user:', usuario.id);
        await usuario.update({ foto_perfil });

        res.status(200).json({
            message: 'Foto actualizada',
            usuario: {
                id: usuario.id,
                nombre: usuario.nombre,
                apellido: usuario.apellido,
                email: usuario.email,
                rol: usuario.rol,
                estado: usuario.estado,
                foto_perfil: usuario.foto_perfil
            }
        });
    } catch (error) {
        console.error('Error al actualizar foto:', error);
        res.status(500).json({ message: 'Error al actualizar foto', error: error.message });
    }
};

// Listar usuarios (solo admin)
authCtrl.getUsuarios = async (req, res) => {
    try {
        const usuarios = await Usuario.findAll({
            attributes: ['id', 'nombre', 'apellido', 'email', 'rol', 'estado', 'foto_perfil', 'createdAt', 'updatedAt']
        });

        res.status(200).json({
            message: 'Usuarios obtenidos',
            usuarios
        });
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener usuarios', error: error.message });
    }
};

module.exports = authCtrl;
