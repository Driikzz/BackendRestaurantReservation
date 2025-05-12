const express = require('express');
const router = express.Router();
const menuController = require('../controllers/menuController');

// Route publique - pas besoin d'authentification
router.get('/', menuController.getAllMenuItems);

module.exports = router;
