const Reservation = require('../models/Reservation');
const Table = require('../models/Table');
const ReservationTable = require('../models/ReservationTable');
const User = require('../models/User');

// GET /reservations - Admin only
exports.getAllReservations = async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Accès refusé' });
  const reservations = await Reservation.findAll({ include: [User, Table] });
  res.json(reservations);
};

// GET /my-reservations - Client
exports.getMyReservations = async (req, res) => {
  const reservations = await Reservation.findAll({
    where: { user_id: req.user.userId },
    include: [Table]
  });
  res.json(reservations);
};

// POST /reservations - Création avec attribution automatique
exports.createReservation = async (req, res) => {
  const { number_of_people, date, time, note } = req.body;
  try {
    const tables = await Table.findAll();

    // Génère toutes les combinaisons possibles
    let combos = [[]];
    for (const table of tables) {
      const newCombos = combos.map(c => [...c, table]).filter(c =>
        c.reduce((sum, t) => sum + t.seats, 0) <= number_of_people + 2
      );
      combos = combos.concat(newCombos);
    }
    const valid = combos.find(c =>
      c.reduce((sum, t) => sum + t.seats, 0) >= number_of_people
    );

    if (!valid) return res.status(400).json({ message: 'Pas de tables disponibles' });

    const reservation = await Reservation.create({
      user_id: req.user.userId,
      number_of_people,
      date,
      time,
      note
    });

    for (let table of valid) {
      await reservation.addTable(table);
    }

    res.status(201).json({ message: 'Réservation enregistrée', reservation });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

// PUT /reservations/:id - Modifier si "pending"
exports.updateReservation = async (req, res) => {
  const id = req.params.id;
  const reservation = await Reservation.findByPk(id);
  if (!reservation || reservation.status !== 'pending')
    return res.status(404).json({ message: 'Non modifiable' });

  await reservation.update(req.body);
  res.json({ message: 'Modifiée', reservation });
};

// DELETE /reservations/:id
exports.deleteReservation = async (req, res) => {
  const id = req.params.id;
  const reservation = await Reservation.findByPk(id);
  if (!reservation) return res.status(404).json({ message: 'Introuvable' });

  await reservation.destroy();
  res.json({ message: 'Annulée' });
};

// PATCH /reservations/:id/validate - Admin uniquement
exports.validateReservation = async (req, res) => {
  const id = req.params.id;
  const reservation = await Reservation.findByPk(id);
  if (!reservation) return res.status(404).json({ message: 'Introuvable' });

  reservation.status = 'confirmed';
  await reservation.save();

  res.json({ message: 'Réservation confirmée', reservation });
};
