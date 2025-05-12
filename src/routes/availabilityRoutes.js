const express = require('express');
const router = express.Router();
const availabilityController = require('../controllers/availabilityController');
const authMiddleware = require('../middleware/authMiddleware');

// Routes publiques
router.get('/', availabilityController.getAvailabilityByDate);

// Routes administrateur (nécessitent authentification)
router.use('/admin', authMiddleware);
router.get('/admin/opening-slots', availabilityController.getAllOpeningSlots);
router.post('/admin/opening-slots', availabilityController.createOrUpdateOpeningSlot);
router.post('/admin/exceptional-dates', availabilityController.createOrUpdateExceptionalDate);

module.exports = router; 