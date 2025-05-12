const Reservation = require('../models/Reservation');
const Table = require('../models/Table');
const ReservationTable = require('../models/ReservationTable');
const User = require('../models/User');
const OpeningSlot = require('../models/OpeningSlot');
const ExceptionalDate = require('../models/ExceptionalDate');
const ExceptionalSlot = require('../models/ExceptionalSlot');
const { Op } = require('sequelize');

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
    // Vérifier si la date est valide
    if (!date || !time) {
      return res.status(400).json({ message: 'Date et heure requises' });
    }

    // Vérifier si le restaurant est ouvert ce jour-là
    const isOpen = await checkRestaurantAvailability(date, time);
    if (!isOpen) {
      return res.status(400).json({ message: 'Le restaurant est fermé à cette date/heure' });
    }

    // Vérifier la disponibilité des tables pour ce créneau
    const availableTables = await getAvailableTables(date, time);

    if (availableTables.length === 0) {
      return res.status(400).json({ message: 'Pas de tables disponibles pour ce créneau' });
    }

    // Trouver une combinaison de tables qui peut accueillir le nombre de personnes
    const tableAssignment = findTableCombination(availableTables, number_of_people);

    if (!tableAssignment) {
      return res.status(400).json({
        message: 'Pas assez de places disponibles pour ce nombre de personnes',
        availableTables
      });
    }

    const reservation = await Reservation.create({
      user_id: req.user.userId,
      number_of_people,
      date,
      time,
      note
    });

    for (let table of tableAssignment) {
      await reservation.addTable(table);
    }

    res.status(201).json({
      message: 'Réservation enregistrée',
      reservation,
      tables: tableAssignment
    });
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

// Vérifier si le restaurant est ouvert à la date et l'heure spécifiées
async function checkRestaurantAvailability(date, time) {
  // Vérifier si c'est une date de fermeture exceptionnelle
  const exceptionalClosure = await ExceptionalDate.findOne({
    where: {
      date,
      is_closed: true
    }
  });

  if (exceptionalClosure) {
    return false;
  }

  // Vérifier les créneaux exceptionnels pour cette date
  const exceptionalDate = await ExceptionalDate.findOne({
    where: {
      date,
      is_closed: false
    },
    include: [ExceptionalSlot]
  });

  if (exceptionalDate && exceptionalDate.ExceptionalSlots.length > 0) {
    // Utiliser les créneaux exceptionnels
    return exceptionalDate.ExceptionalSlots.some(slot => slot.time === time);
  }

  // Utiliser les créneaux standards
  const dateObj = new Date(date);
  const dayOfWeek = dateObj.getDay();

  const regularSlot = await OpeningSlot.findOne({
    where: {
      day_of_week: dayOfWeek,
      time,
      is_active: true
    }
  });

  return !!regularSlot;
}

// Fonction utilitaire pour trouver une combinaison de tables
function findTableCombination(tables, numberOfPeople) {
  // Génère toutes les combinaisons possibles
  let combos = [[]];
  for (const table of tables) {
    const newCombos = combos.map(c => [...c, table]).filter(c =>
      c.reduce((sum, t) => sum + t.seats, 0) <= numberOfPeople + 2
    );
    combos = combos.concat(newCombos);
  }

  // Trouve la première combinaison valide
  const valid = combos.find(c =>
    c.reduce((sum, t) => sum + t.seats, 0) >= numberOfPeople
  );

  return valid || null;
}

// Fonction utilitaire pour obtenir les tables disponibles
async function getAvailableTables(date, time) {
  // Récupérer toutes les tables
  const allTables = await Table.findAll();

  // Récupérer les tables déjà réservées pour ce créneau
  const reservedTableIds = await getReservedTableIds(date, time);

  // Filtrer les tables disponibles
  return allTables.filter(table => !reservedTableIds.includes(table.id));
}

// Fonction utilitaire pour obtenir les IDs des tables réservées
async function getReservedTableIds(date, time) {
  // Créer une plage horaire de +/- 2 heures autour de l'heure demandée
  const timeObj = new Date(`2000-01-01T${time}`);
  const twoHoursBefore = new Date(timeObj.getTime() - 2 * 60 * 60 * 1000).toTimeString().slice(0, 8);
  const twoHoursAfter = new Date(timeObj.getTime() + 2 * 60 * 60 * 1000).toTimeString().slice(0, 8);

  // Trouver les réservations qui se chevauchent avec ce créneau
  const overlappingReservations = await Reservation.findAll({
    where: {
      date: date,
      time: {
        [Op.between]: [twoHoursBefore, twoHoursAfter]
      },
      status: {
        [Op.ne]: 'cancelled'
      }
    },
    include: [Table]
  });

  // Extraire les IDs des tables
  const reservedTableIds = [];
  overlappingReservations.forEach(reservation => {
    reservation.Tables.forEach(table => {
      reservedTableIds.push(table.id);
    });
  });

  return reservedTableIds;
}
