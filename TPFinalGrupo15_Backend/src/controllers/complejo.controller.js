const Complejo = require('../models/complejo.model');
const Usuario = require('../models/usuario.model');

const complejoCtrl = {};

// Crear complejo
complejoCtrl.createComplejo = async (req, res) => {
    try {
        const { nombre, direccion, provincia, telefono, latitud, longitud } = req.body;
        
        // Obtener usuario del token
        const token = req.cookies.token;
        const jwt = require('jsonwebtoken');
        const JWT_SECRET = process.env.JWT_SECRET || 'SECRET_KEY_CANCHAS_2026';
        const decoded = jwt.verify(token, JWT_SECRET);

        const nuevoComplejo = await Complejo.create({
            nombre,
            direccion,
            provincia,
            telefono,
            latitud,
            longitud,
            duenio_id: decoded.id
        });

        res.status(201).json({
            message: 'Complejo creado exitosamente',
            complejo: nuevoComplejo
        });
    } catch (error) {
        res.status(500).json({ message: 'Error al crear complejo', error: error.message });
    }
};

// Obtener todos los complejos
complejoCtrl.getComplejos = async (req, res) => {
    try {
        const complejos = await Complejo.findAll({
            include: [{
                model: Usuario,
                as: 'duenio',
                attributes: ['id', 'nombre', 'apellido', 'email']
            }]
        });

        res.status(200).json({
            message: 'Complejos obtenidos',
            complejos
        });
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener complejos', error: error.message });
    }
};

// Obtener mis complejos (del dueño autenticado)
complejoCtrl.getMisComplejos = async (req, res) => {
    try {
        const token = req.cookies.token;
        const jwt = require('jsonwebtoken');
        const JWT_SECRET = process.env.JWT_SECRET || 'SECRET_KEY_CANCHAS_2026';
        const decoded = jwt.verify(token, JWT_SECRET);

        const complejos = await Complejo.findAll({
            where: { duenio_id: decoded.id }
        });

        res.status(200).json({
            message: 'Mis complejos obtenidos',
            complejos
        });
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener mis complejos', error: error.message });
    }
};

// Obtener complejo por ID
complejoCtrl.getComplejoById = async (req, res) => {
    try {
        const { id } = req.params;
        const complejo = await Complejo.findByPk(id, {
            include: [{
                model: Usuario,
                as: 'duenio',
                attributes: ['id', 'nombre', 'apellido', 'email']
            }]
        });

        if (!complejo) {
            return res.status(404).json({ message: 'Complejo no encontrado' });
        }

        res.status(200).json({ complejo });
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener complejo', error: error.message });
    }
};

module.exports = complejoCtrl;
