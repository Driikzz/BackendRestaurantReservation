const express = require('express');
const router = express.Router();
const reservationController = require('../controllers/reservationController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.get('/', reservationController.getAllReservations);
router.get('/my-reservations', reservationController.getMyReservations);
router.post('/', reservationController.createReservation);
router.put('/:id', reservationController.updateReservation);
router.delete('/:id', reservationController.deleteReservation);
router.patch('/:id/validate', reservationController.validateReservation);

module.exports = router;
