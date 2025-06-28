// models/Cliente.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Cliente = sequelize.define('Cliente', {
  rut: {
    type: DataTypes.STRING,
    primaryKey: true,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  usuario_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'usuarios',
      key: 'id'
    }
  },
  nombre_empresa: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  telefono: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  contacto_principal: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  direccion: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true
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
  region_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'regiones',
      key: 'id'
    }
  },
  costo_operativo_km: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  costo_operativo_otros: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  created_at: {
    type: DataTypes.DATE,
    field: 'created_at'
  },
  updated_at: {
    type: DataTypes.DATE,
    field: 'updated_at'
  }
}, {
  tableName: 'clientes',
  underscored: true,
  timestamps: true
});

module.exports = Cliente;