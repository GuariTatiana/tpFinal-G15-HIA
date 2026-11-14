const SolicitudDuenio = require('../models/solicitud-duenio.model');
const Usuario = require('../models/usuario.model');

const solicitudDuenioCtrl = {};

// Crear solicitud de dueño
solicitudDuenioCtrl.crearSolicitud = async (req, res) => {
    try {
        const { nombre_complejo, direccion_complejo, provincia, telefono_contacto, mensaje } = req.body;

        const token = req.cookies.token;
        const jwt = require('jsonwebtoken');
        const JWT_SECRET = process.env.JWT_SECRET || 'SECRET_KEY_CANCHAS_2026';
        const decoded = jwt.verify(token, JWT_SECRET);

        // Verificar que el usuario no tenga una solicitud pendiente
        const solicitudExistente = await SolicitudDuenio.findOne({
            where: {
                usuario_id: decoded.id,
                estado: 'pendiente'
            }
        });

        if (solicitudExistente) {
            return res.status(400).json({ message: 'Ya tienes una solicitud pendiente' });
        }

        const nuevaSolicitud = await SolicitudDuenio.create({
            nombre_complejo,
            direccion_complejo,
            provincia,
            telefono_contacto,
            mensaje,
            usuario_id: decoded.id
        });

        res.status(201).json({
            message: 'Solicitud creada exitosamente',
            solicitud: nuevaSolicitud
        });
    } catch (error) {
        res.status(500).json({ message: 'Error al crear solicitud', error: error.message });
    }
};

// Obtener mis solicitudes
solicitudDuenioCtrl.getMisSolicitudes = async (req, res) => {
    try {
        const token = req.cookies.token;
        const jwt = require('jsonwebtoken');
        const JWT_SECRET = process.env.JWT_SECRET || 'SECRET_KEY_CANCHAS_2026';
        const decoded = jwt.verify(token, JWT_SECRET);

        const solicitudes = await SolicitudDuenio.findAll({
            where: { usuario_id: decoded.id },
            order: [['createdAt', 'DESC']]
        });

        res.status(200).json({
            message: 'Mis solicitudes obtenidas',
            solicitudes
        });
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener mis solicitudes', error: error.message });
    }
};

// Obtener todas las solicitudes (admin)
solicitudDuenioCtrl.getSolicitudesAdmin = async (req, res) => {
    try {
        const solicitudes = await SolicitudDuenio.findAll({
            include: [{
                model: Usuario,
                as: 'usuario',
                attributes: ['id', 'nombre', 'apellido', 'email']
            }],
            order: [['createdAt', 'DESC']]
        });

        res.status(200).json({
            message: 'Solicitudes obtenidas',
            solicitudes
        });
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener solicitudes', error: error.message });
    }
};

// Aprobar solicitud
solicitudDuenioCtrl.aprobarSolicitud = async (req, res) => {
    try {
        const { id } = req.params;

        const solicitud = await SolicitudDuenio.findByPk(id);
        if (!solicitud) {
            return res.status(404).json({ message: 'Solicitud no encontrada' });
        }

        if (solicitud.estado !== 'pendiente') {
            return res.status(400).json({ message: 'La solicitud ya fue procesada' });
        }

        // Actualizar solicitud
        await solicitud.update({
            estado: 'aprobada',
            fecha_respuesta: new Date()
        });

        // Actualizar rol del usuario a dueño
        const usuario = await Usuario.findByPk(solicitud.usuario_id);
        await usuario.update({ rol: 'duenio' });

        // Crear el complejo automáticamente
        const Complejo = require('../models/complejo.model');
        const nuevoComplejo = await Complejo.create({
            nombre: solicitud.nombre_complejo,
            direccion: solicitud.direccion_complejo,
            provincia: solicitud.provincia,
            telefono: solicitud.telefono_contacto,
            duenio_id: usuario.id
        });

        res.status(200).json({
            message: 'Solicitud aprobada exitosamente',
            solicitud,
            usuario: {
                id: usuario.id,
                nombre: usuario.nombre,
                apellido: usuario.apellido,
                email: usuario.email,
                rol: usuario.rol
            },
            complejo: nuevoComplejo
        });
    } catch (error) {
        res.status(500).json({ message: 'Error al aprobar solicitud', error: error.message });
    }
};

// Rechazar solicitud
solicitudDuenioCtrl.rechazarSolicitud = async (req, res) => {
    try {
        const { id } = req.params;
        const { respuesta_admin } = req.body;

        const solicitud = await SolicitudDuenio.findByPk(id);
        if (!solicitud) {
            return res.status(404).json({ message: 'Solicitud no encontrada' });
        }

        if (solicitud.estado !== 'pendiente') {
            return res.status(400).json({ message: 'La solicitud ya fue procesada' });
        }

        await solicitud.update({
            estado: 'rechazada',
            respuesta_admin,
            fecha_respuesta: new Date()
        });

        res.status(200).json({
            message: 'Solicitud rechazada exitosamente',
            solicitud
        });
    } catch (error) {
        res.status(500).json({ message: 'Error al rechazar solicitud', error: error.message });
    }
};

module.exports = solicitudDuenioCtrl;
