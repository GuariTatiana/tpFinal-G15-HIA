const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const SolicitudDuenio = sequelize.define('SolicitudDuenio', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    nombre_complejo: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            notEmpty: { msg: 'El nombre del complejo es requerido' }
        }
    },
    direccion_complejo: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            notEmpty: { msg: 'La dirección es requerida' }
        }
    },
    provincia: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            notEmpty: { msg: 'La provincia es requerida' }
        }
    },
    telefono_contacto: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            notEmpty: { msg: 'El teléfono es requerido' }
        }
    },
    mensaje: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    estado: {
        type: DataTypes.ENUM('pendiente', 'aprobada', 'rechazada'),
        allowNull: false,
        defaultValue: 'pendiente'
    },
    respuesta_admin: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    fecha_respuesta: {
        type: DataTypes.DATE,
        allowNull: true
    },
    usuario_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'usuarios',
            key: 'id'
        }
    }
}, {
    tableName: 'solicitudes_duenio',
    timestamps: true,
    paranoid: true
});

module.exports = SolicitudDuenio;
