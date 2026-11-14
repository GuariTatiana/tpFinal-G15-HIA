const Reserva = require('../models/reserva.model');
const Cancha = require('../models/cancha.model');
const Usuario = require('../models/usuario.model');

const reservaCtrl = {};

// Obtener horarios disponibles de una cancha en una fecha
reservaCtrl.getHorariosDisponibles = async (req, res) => {
    try {
        const { canchaId } = req.params;
        const { fecha } = req.query;

        if (!fecha) {
            return res.status(400).json({ message: 'La fecha es requerida' });
        }

        const cancha = await Cancha.findByPk(canchaId);
        if (!cancha) {
            return res.status(404).json({ message: 'Cancha no encontrada' });
        }

        const reservasExistentes = await Reserva.findAll({
            where: {
                cancha_id: canchaId,
                fecha,
                estado: { [require('sequelize').Op.ne]: 'cancelada' }
            }
        });

        const horarios = [];
        const horaInicio = 8;
        const horaFin = 22;

        for (let hora = horaInicio; hora < horaFin; hora++) {
            const horaStr = `${hora.toString().padStart(2, '0')}:00`;
            const horaFinStr = `${(hora + 1).toString().padStart(2, '0')}:00`;

            const ocupado = reservasExistentes.some(reserva => {
                return reserva.hora_inicio === horaStr || 
                       (reserva.hora_inicio < horaFinStr && reserva.hora_fin > horaStr);
            });

            if (!ocupado) {
                horarios.push({
                    hora_inicio: horaStr,
                    hora_fin: horaFinStr,
                    disponible: true,
                    precio: cancha.precio_hora
                });
            }
        }

        res.status(200).json({
            message: 'Horarios disponibles',
            horarios
        });
    } catch (error) {
        console.error('Error al obtener horarios:', error);
        res.status(500).json({ message: 'Error al obtener horarios', error: error.message });
    }
};

// Crear reserva
reservaCtrl.crearReserva = async (req, res) => {
    try {
        console.log('POST /reservas - Body:', req.body);
        console.log('POST /reservas - Cookies:', req.cookies);

        const { cancha_id, fecha, hora_inicio, hora_fin, monto_total } = req.body;

        const token = req.cookies.token;
        if (!token) {
            console.log('No token found in cookies');
            return res.status(401).json({ message: 'No autenticado' });
        }

        const jwt = require('jsonwebtoken');
        const JWT_SECRET = process.env.JWT_SECRET || 'SECRET_KEY_CANCHAS_2026';
        const decoded = jwt.verify(token, JWT_SECRET);
        console.log('Decoded token:', decoded);

        const cancha = await Cancha.findByPk(cancha_id);
        if (!cancha) {
            return res.status(404).json({ message: 'Cancha no encontrada' });
        }

        const reservaExistente = await Reserva.findOne({
            where: {
                cancha_id,
                fecha,
                estado: { [require('sequelize').Op.ne]: 'cancelada' },
                [require('sequelize').Op.or]: [
                    { hora_inicio: hora_inicio },
                    { hora_fin: hora_fin }
                ]
            }
        });

        if (reservaExistente) {
            return res.status(400).json({ message: 'El horario ya está reservado' });
        }

        const nuevaReserva = await Reserva.create({
            fecha,
            hora_inicio,
            hora_fin,
            monto_total,
            jugador_id: decoded.id,
            cancha_id
        });

        console.log('Reserva creada:', nuevaReserva);

        res.status(201).json({
            message: 'Reserva creada exitosamente',
            reserva: nuevaReserva
        });
    } catch (error) {
        console.error('Error al crear reserva:', error);
        res.status(500).json({ message: 'Error al crear reserva', error: error.message });
    }
};

// Obtener mis reservas
reservaCtrl.getMisReservas = async (req, res) => {
    try {
        const token = req.cookies.token;
        const jwt = require('jsonwebtoken');
        const JWT_SECRET = process.env.JWT_SECRET || 'SECRET_KEY_CANCHAS_2026';
        const decoded = jwt.verify(token, JWT_SECRET);

        const reservas = await Reserva.findAll({
            where: { jugador_id: decoded.id },
            include: [
                {
                    model: Cancha,
                    as: 'cancha',
                    include: [{
                        model: require('../models/complejo.model'),
                        as: 'complejo'
                    }]
                },
                {
                    model: Usuario,
                    as: 'jugador',
                    attributes: ['id', 'nombre', 'apellido', 'email']
                }
            ],
            order: [['fecha', 'DESC'], ['hora_inicio', 'DESC']]
        });

        res.status(200).json({
            message: 'Mis reservas obtenidas',
            reservas
        });
    } catch (error) {
        console.error('Error al obtener mis reservas:', error);
        res.status(500).json({ message: 'Error al obtener mis reservas', error: error.message });
    }
};

// Obtener reservas por complejo (para dueños)
reservaCtrl.getReservasPorComplejo = async (req, res) => {
    try {
        const { complejoId } = req.params;
        const token = req.cookies.token;
        const jwt = require('jsonwebtoken');
        const JWT_SECRET = process.env.JWT_SECRET || 'SECRET_KEY_CANCHAS_2026';
        const decoded = jwt.verify(token, JWT_SECRET);

        const Complejo = require('../models/complejo.model');
        const complejo = await Complejo.findByPk(complejoId);
        if (!complejo || complejo.duenio_id !== decoded.id) {
            return res.status(403).json({ message: 'No tienes permiso para ver estas reservas' });
        }

        const canchas = await Cancha.findAll({
            where: { complejo_id: complejoId },
            attributes: ['id']
        });

        const canchaIds = canchas.map(c => c.id);

        const reservas = await Reserva.findAll({
            where: { cancha_id: { [require('sequelize').Op.in]: canchaIds } },
            include: [
                {
                    model: Cancha,
                    as: 'cancha'
                },
                {
                    model: Usuario,
                    as: 'jugador',
                    attributes: ['id', 'nombre', 'apellido', 'email']
                }
            ],
            order: [['fecha', 'DESC'], ['hora_inicio', 'DESC']]
        });

        res.status(200).json({
            message: 'Reservas del complejo obtenidas',
            reservas
        });
    } catch (error) {
        console.error('Error al obtener reservas del complejo:', error);
        res.status(500).json({ message: 'Error al obtener reservas del complejo', error: error.message });
    }
};

// Obtener todas las reservas (admin)
reservaCtrl.getReservas = async (req, res) => {
    try {
        const reservas = await Reserva.findAll({
            include: [
                {
                    model: Cancha,
                    as: 'cancha',
                    include: [{
                        model: require('../models/complejo.model'),
                        as: 'complejo'
                    }]
                },
                {
                    model: Usuario,
                    as: 'jugador',
                    attributes: ['id', 'nombre', 'apellido', 'email']
                }
            ],
            order: [['fecha', 'DESC'], ['hora_inicio', 'DESC']]
        });

        res.status(200).json({
            message: 'Todas las reservas obtenidas',
            reservas
        });
    } catch (error) {
        console.error('Error al obtener reservas:', error);
        res.status(500).json({ message: 'Error al obtener reservas', error: error.message });
    }
};

module.exports = reservaCtrl;
