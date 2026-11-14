const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const Cancha = sequelize.define('Cancha', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    nombre: {
        type: DataTypes.STRING,
        allowNull: false,
        // validate: {
        //     notEmpty: { msg: 'El nombre de la cancha es requerido' }
        // }
    },
    tipo: {
        // type: DataTypes.ENUM('futbol_5', 'futbol_7', 'futbol_11', 'basketball', 'tenis', 'voleibol'),
        type: DataTypes.STRING,
        allowNull: false
    },
    precio_hora: {
        type: DataTypes.FLOAT,
        allowNull: true,
        // validate: {
        //     min: { args: [0], msg: 'El precio debe ser mayor o igual a 0' }
        // }
    },
    duracion_turno: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 60
    },
    estado: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
    },
    techada: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },
    iluminacion: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },
    capacidad: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    descripcion: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    imagen: {
        type: DataTypes.STRING,
        allowNull: true
    },
    complejo_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'complejos',
            key: 'id'
        }
    }
}, {
    tableName: 'canchas',
    timestamps: true,
    paranoid: true
});

module.exports = Cancha;
