const express = require('express');
const router = express.Router();
const availabilityController = require('../controllers/availabilityController');
const authMiddleware = require('../middleware/authMiddleware');

// Routes publiques
router.get('/', availabilityController.getAvailabilityByDate);
router.get('/dates', availabilityController.getAvailableDates);

// Routes avec authentification
router.use(authMiddleware);
router.get('/available-tables', availabilityController.getAvailableTables);

// Routes administrateur
router.get('/admin/opening-slots', availabilityController.getAllOpeningSlots);
router.post('/admin/opening-slots', availabilityController.createOrUpdateOpeningSlot);
router.get('/admin/exceptional-dates', availabilityController.getAllExceptionalDates);
router.post('/admin/exceptional-dates', availabilityController.createOrUpdateExceptionalDate);

module.exports = router; 