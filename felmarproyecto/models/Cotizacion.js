// models/Cotizacion.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Cotizacion = sequelize.define('Cotizacion', {
  numeroCotizacion: {
    type: DataTypes.STRING,
    primaryKey: true,
    allowNull: false,
    field: 'numero_cotizacion'
  },
  fecha: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  nombre: {
    type: DataTypes.STRING,
    allowNull: false
  },
  rut: {
    type: DataTypes.STRING,
    allowNull: false
  },
  correo: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isEmail: true
    }
  },
  telefono: {
    type: DataTypes.STRING,
    allowNull: false
  },
  direccion: {
    type: DataTypes.STRING,
    allowNull: false
  },
  region_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'regiones',
      key: 'id'
    }
  },
  comuna_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'comunas',
      key: 'id'
    }
  },
  nombreEmpresa: {
    type: DataTypes.STRING,
    allowNull: true
  },
  rutEmpresa: {
    type: DataTypes.STRING,
    allowNull: true
  },
  subtotal: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  iva: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  total: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  estado: {
    type: DataTypes.ENUM('pendiente', 'aceptada', 'rechazada', 'vencida'),
    defaultValue: 'pendiente'
  },
  observaciones: {
    type: DataTypes.TEXT
  },
  detalles: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  cliente_id: {
    type: DataTypes.STRING,
    allowNull: true,
    references: {
      model: 'clientes',
      key: 'rut'
    }
  },
  createdAt: {
    type: DataTypes.DATE,
    field: 'createdAt'
  },
  updatedAt: {
    type: DataTypes.DATE,
    field: 'updatedAt'
  },
}, {
  timestamps: true,
  tableName: 'cotizaciones',
  underscored: true
});

module.exports = Cotizacion;