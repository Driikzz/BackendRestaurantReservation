const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
    process.env.DB_NAME || 'nom_de_votre_base',
    process.env.DB_USER || 'root',
    process.env.DB_PASSWORD || '',
    {
        host: process.env.DB_HOST || 'localhost',
        dialect: 'mysql',
        logging: false
    }
);

// Test de la connexion
async function testDbConnection() {
    try {
        await sequelize.authenticate();
        console.log('Connexion à la base de données établie avec succès.');
    } catch (error) {
        console.error('Impossible de se connecter à la base de données:', error);
    }
}

testDbConnection();

module.exports = sequelize;