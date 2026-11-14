const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const Complejo = sequelize.define('Complejo', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    nombre: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            notEmpty: { msg: 'El nombre del complejo es requerido' }
        }
    },
    direccion: {
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
    telefono: {
        type: DataTypes.STRING,
        allowNull: true
    },
    latitud: {
        type: DataTypes.FLOAT,
        allowNull: true
    },
    longitud: {
        type: DataTypes.FLOAT,
        allowNull: true
    },
    duenio_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'usuarios',
            key: 'id'
        }
    }
}, {
    tableName: 'complejos',
    timestamps: true,
    paranoid: true
});

module.exports = Complejo;
