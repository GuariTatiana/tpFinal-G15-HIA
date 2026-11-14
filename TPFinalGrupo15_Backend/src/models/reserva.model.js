const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const Reserva = sequelize.define('Reserva', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    fecha: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    hora_inicio: {
        type: DataTypes.TIME,
        allowNull: false
    },
    hora_fin: {
        type: DataTypes.TIME,
        allowNull: false
    },
    monto_total: {
        type: DataTypes.FLOAT,
        allowNull: false,
        validate: {
            min: { args: [0], msg: 'El monto debe ser mayor o igual a 0' }
        }
    },
    estado: {
        type: DataTypes.ENUM('pendiente', 'confirmada', 'cancelada', 'completada'),
        allowNull: false,
        defaultValue: 'pendiente'
    },
    pagada: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },
    jugador_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'usuarios',
            key: 'id'
        }
    },
    cancha_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'canchas',
            key: 'id'
        }
    }
}, {
    tableName: 'reservas',
    timestamps: true,
    paranoid: true
});

module.exports = Reserva;
