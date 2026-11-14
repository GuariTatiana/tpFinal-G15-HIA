const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const Usuario = sequelize.define('Usuario', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    nombre: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            notEmpty: { msg: 'El nombre es requerido' }
        }
    },
    apellido: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            notEmpty: { msg: 'El apellido es requerido' }
        }
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: { msg: 'Ya existe un usuario registrado con ese email' },
        validate: {
            isEmail: { msg: 'El email debe tener un formato válido' },
            notEmpty: { msg: 'El email es requerido' }
        }
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            notEmpty: { msg: 'La contraseña es requerida' }
        }
    },
    rol: {
        type: DataTypes.ENUM('admin', 'duenio', 'jugador'),
        allowNull: false,
        defaultValue: 'jugador'
    },
    estado: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
    },
    foto_perfil: {
        type: DataTypes.STRING,
        allowNull: true
    },
    google_id: {
        type: DataTypes.STRING,
        allowNull: true
    }
}, {
    tableName: 'usuarios',
    timestamps: true,
    paranoid: true,
    scopes: {
        admin: {
            where: { rol: 'admin' }
        },
        duenio: {
            where: { rol: 'duenio' }
        },
        jugador: {
            where: { rol: 'jugador' }
        }
    }
});

module.exports = Usuario;
