const express = require('express');
const router = express.Router();
const tableController = require('../controllers/tableController');
const authMiddleware = require('../middleware/authMiddleware');

// Toutes les routes nécessitent une authentification
router.use(authMiddleware);

// Routes pour la gestion des tables
router.get('/', tableController.getAllTables);
router.post('/', tableController.createTable);
router.put('/:id', tableController.updateTable);
router.delete('/:id', tableController.deleteTable);
router.get('/available', tableController.getAvailableTables);

module.exports = router;
