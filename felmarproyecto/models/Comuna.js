const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Region = require('./Region');

const Comuna = sequelize.define('Comuna', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  nombre: {
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
  }
}, {
  tableName: 'comunas',
  timestamps: false
});

// Definir la relación con Region
// Comuna.belongsTo(Region, {
//   foreignKey: 'region_id',
//   as: 'Region'
// });

module.exports = Comuna; 