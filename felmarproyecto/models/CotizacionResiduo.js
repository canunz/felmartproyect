const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const CotizacionResiduo = sequelize.define('CotizacionResiduo', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  cotizacion_id: {
    type: DataTypes.STRING,
    allowNull: false,
    references: {
      model: 'cotizaciones',
      key: 'numero_cotizacion'
    }
  },
  precio_residuo_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'precios_residuos',
      key: 'id'
    }
  },
  descripcion: {
    type: DataTypes.STRING,
    allowNull: false
  },
  precio_unitario: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  cantidad: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 1
  },
  subtotal: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  createdAt: {
    type: DataTypes.DATE,
    field: 'createdAt'
  },
  updatedAt: {
    type: DataTypes.DATE,
    field: 'updatedAt'
  }
}, {
  tableName: 'cotizaciones_residuos',
  timestamps: true,
  hooks: {
    beforeCreate: async (cotizacionResiduo) => {
      // Calcular subtotal
      cotizacionResiduo.subtotal = cotizacionResiduo.precio_unitario * cotizacionResiduo.cantidad;
    },
    beforeUpdate: async (cotizacionResiduo) => {
      if (cotizacionResiduo.changed('precio_unitario') || cotizacionResiduo.changed('cantidad')) {
        // Recalcular subtotal si cambia el precio o la cantidad
        cotizacionResiduo.subtotal = cotizacionResiduo.precio_unitario * cotizacionResiduo.cantidad;
      }
    }
  }
});

// Definir asociaciones
CotizacionResiduo.associate = function(models) {
  CotizacionResiduo.belongsTo(models.Cotizacion, {
    foreignKey: 'cotizacion_id',
    targetKey: 'numeroCotizacion'
  });
  
  CotizacionResiduo.belongsTo(models.PrecioResiduo, {
    foreignKey: 'precio_residuo_id'
  });
};

module.exports = CotizacionResiduo; 