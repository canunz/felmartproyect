module.exports = {
    development: {
      username: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME,
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      dialect: 'mysql',
      dialectOptions: {
        timezone: '-06:00',
        ssl: {
          require: true,
          rejectUnauthorized: false
        },
        connectTimeout: 60000,
        acquireTimeout: 60000,
        timeout: 60000
      },
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
      }
    },
    // Otras configuraciones para test y production
  };