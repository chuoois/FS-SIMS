const { Sequelize } = require("sequelize");
require("dotenv").config();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    dialect: "mysql",
    // Matches MySQL SSL mode REQUIRED: encrypt the connection without certificate verification.
    dialectOptions:
      process.env.DB_SSL === "true"
        ? { ssl: { rejectUnauthorized: false } }
        : {},
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
    logging: process.env.NODE_ENV === "production" ? false : console.log,
  },
);

async function testSequelizeConnection(retries = 5, delayMs = 3000) {
  const attempts = Math.max(1, retries);
  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await sequelize.authenticate();
      console.log("✅ Kết nối MySQL thành công");
      return true;
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  console.error(
    `❌ Kết nối MySQL thất bại sau ${attempts} lần thử:`,
    lastError.message,
  );
  return false;
}

module.exports = { sequelize, testSequelizeConnection };
