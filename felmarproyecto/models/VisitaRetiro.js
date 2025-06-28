// models/VisitaRetiro.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const VisitaRetiro = sequelize.define('VisitaRetiro', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  clienteId: {
    type: DataTypes.STRING,
    references: {
      model: 'clientes',
      key: 'rut'
    },
    allowNull: false,
    field: 'cliente_id'
  },
  tipoVisita: {
    type: DataTypes.ENUM('evaluacion', 'retiro'),
    allowNull: false,
    field: 'tipo_visita'
  },
  fecha: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  hora: {
    type: DataTypes.TIME,
    allowNull: false
  },
  estado: {
    type: DataTypes.ENUM('pendiente', 'confirmada', 'completada', 'rechazada'),
    allowNull: false,
    defaultValue: 'pendiente'
  },
  observaciones: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  cotizacionId: {
    type: DataTypes.STRING,
    references: {
      model: 'cotizaciones',
      key: 'numero_cotizacion'
    },
    allowNull: true,
    field: 'cotizacion_id'
  },
  solicitudRetiroId: {
    type: DataTypes.INTEGER,
    references: {
      model: 'solicitudes_retiro',
      key: 'id'
    },
    allowNull: true,
    field: 'solicitud_retiro_id'
  }
}, {
  timestamps: true,
  tableName: 'visitas_retiro',
  underscored: true
});

module.exports = VisitaRetiro;