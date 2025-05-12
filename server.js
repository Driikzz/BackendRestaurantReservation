const express = require('express');
const cors = require('cors');
require('dotenv').config();

const sequelize = require('./src/config/database');

const app = express();

// Routes
const authRoutes = require('./src/routes/auth');
const reservationsRoutes = require('./src/routes/reservationsRoutes');
const menuRoutes = require('./src/routes/menuRoutes');
const tableRoutes = require('./src/routes/tableRoutes');
// const userRoutes = require('./src/routes/userRoute');

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes API
// app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/reservations', reservationsRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/tables', tableRoutes);

// Route de test
app.get('/', (req, res) => {
    res.json({ message: 'Route de test' });
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        message: 'Erreur serveur',
        error: process.env.NODE_ENV === 'development' ? err : {}
    });
});

const PORT = process.env.PORT || 3000;

sequelize.sync({ alter: true }).then(() => {
    console.log('Base de données synchronisée.');
    app.listen(PORT, () => console.log(`Serveur lancé sur le port ${PORT}`));
}).catch((err) => {
    console.error('Erreur de connexion à la base de données :', err);
});
