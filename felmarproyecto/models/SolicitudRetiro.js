// models/SolicitudRetiro.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const SolicitudRetiro = sequelize.define('SolicitudRetiro', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  cliente_id: {
    type: DataTypes.STRING,
    allowNull: false,
    references: {
      model: 'clientes',
      key: 'rut'
    },
    field: 'cliente_id'
  },
  descripcion: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  urgencia: {
    type: DataTypes.ENUM('baja', 'media', 'alta'),
    defaultValue: 'media'
  },
  tipo_solicitud: {
    type: DataTypes.ENUM('retiro', 'evaluacion', 'cotizacion', 'visitas', 'otros'),
    allowNull: false
  },
  estado: {
    type: DataTypes.ENUM('pendiente', 'en_proceso', 'completada'),
    defaultValue: 'pendiente'
  },
  created_at: {
    type: DataTypes.DATE,
    field: 'created_at'
  },
  updated_at: {
    type: DataTypes.DATE,
    field: 'updated_at'
  },
}, {
  timestamps: true,
  tableName: 'solicitudes_retiro',
  underscored: true
});

module.exports = SolicitudRetiro;