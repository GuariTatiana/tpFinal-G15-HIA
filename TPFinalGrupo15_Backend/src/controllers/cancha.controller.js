const Cancha = require('../models/cancha.model');
const Complejo = require('../models/complejo.model');

const canchaCtrl = {};

// Crear cancha
canchaCtrl.crearCancha = async (req, res) => {
    try {
        console.log('POST /canchas - Body recibido:', req.body);

        const { nombre, tipo, precio_hora, techada, iluminacion, capacidad, descripcion, imagen, complejo_id } = req.body;

        console.log('precio_hora recibido:', precio_hora, 'tipo:', typeof precio_hora);

        const token = req.cookies.token;
        const jwt = require('jsonwebtoken');
        const JWT_SECRET = process.env.JWT_SECRET || 'SECRET_KEY_CANCHAS_2026';
        const decoded = jwt.verify(token, JWT_SECRET);

        const complejo = await Complejo.findByPk(complejo_id);
        if (!complejo || complejo.duenio_id !== decoded.id) {
            return res.status(403).json({ message: 'No tienes permiso para agregar canchas a este complejo' });
        }

        const nuevaCancha = await Cancha.create({
            nombre,
            tipo,
            precio_hora,
            techada,
            iluminacion,
            capacidad,
            descripcion,
            imagen,
            complejo_id
        });

        console.log('Cancha creada:', nuevaCancha.dataValues);

        res.status(201).json({ cancha: nuevaCancha });
    } catch (error) {
        console.error('Error al crear cancha:', error);
        res.status(500).json({ message: 'Error al crear cancha', error: error.message });
    }
};

// Obtener todas las canchas
canchaCtrl.getCanchas = async (req, res) => {
    try {
        console.log('GET /canchas - Obteniendo todas las canchas');
        const canchas = await Cancha.findAll({
            include: [{
                model: Complejo,
                as: 'complejo',
                attributes: ['id', 'nombre', 'direccion', 'provincia']
            }]
        });
        console.log('Canchas encontradas:', canchas.length);
        res.status(200).json(canchas);
    } catch (error) {
        console.error('Error al obtener canchas:', error);
        res.status(500).json({ message: 'Error al obtener canchas', error: error.message });
    }
};

// Obtener canchas por complejo
canchaCtrl.getCanchasPorComplejo = async (req, res) => {
    try {
        const { complejoId } = req.params;
        console.log('GET /canchas/complejo/:id - complejoId:', complejoId);
        const canchas = await Cancha.findAll({
            where: { complejo_id: complejoId }
        });
        console.log('Canchas del complejo:', canchas.length);
        res.status(200).json({
            message: 'Canchas del complejo obtenidas',
            canchas
        });
    } catch (error) {
        console.error('Error al obtener canchas del complejo:', error);
        res.status(500).json({ message: 'Error al obtener canchas del complejo', error: error.message });
    }
};

// Buscar canchas por nombre
canchaCtrl.buscarCanchasPorNombre = async (req, res) => {
    try {
        const { nombre } = req.query;
        console.log('GET /canchas/buscar - nombre:', nombre);
        const canchas = await Cancha.findAll({
            where: {
                nombre: {
                    [require('sequelize').Op.iLike]: `%${nombre}%`
                }
            },
            include: [{
                model: Complejo,
                as: 'complejo',
                attributes: ['id', 'nombre', 'direccion', 'provincia']
            }]
        });
        console.log('Canchas encontradas:', canchas.length);
        res.status(200).json({ canchas });
    } catch (error) {
        console.error('Error al buscar canchas:', error);
        res.status(500).json({ message: 'Error al buscar canchas', error: error.message });
    }
};

module.exports = canchaCtrl;
