const sequelize = require('../config/database');

async function checkTable() {
  try {
    const [results] = await sequelize.query('DESCRIBE visitas_retiro');
    console.log(JSON.stringify(results, null, 2));
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sequelize.close();
  }
}

checkTable(); 