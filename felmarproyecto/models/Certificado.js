// models/Certificado.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Certificado = sequelize.define('Certificado', {
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
  visita_retiro_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'visitas_retiro',
      key: 'solicitud_retiro_id'
    },
    field: 'visita_retiro_id'
  },
  fecha_emision: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'fecha_emision'
  },
  observaciones: {
    type: DataTypes.TEXT
  },
  ruta_pdf: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'ruta_pdf'
  }
}, {
  timestamps: true,
  tableName: 'certificados'
});

module.exports = Certificado;