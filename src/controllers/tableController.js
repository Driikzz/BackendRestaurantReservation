const Table = require('../models/Table');
const Reservation = require('../models/Reservation');
const ReservationTable = require('../models/ReservationTable');
const { Op } = require('sequelize');
const sequelize = require('../config/database');

// GET /tables - Obtenir toutes les tables
exports.getAllTables = async (req, res) => {
  try {
    const tables = await Table.findAll();
    res.json(tables);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

// POST /tables - Créer une nouvelle table (admin uniquement)
exports.createTable = async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Accès refusé' });
  }

  const { seats } = req.body;
  
  // Vérifier que le nombre de places est valide (2, 4 ou 6)
  if (![2, 4, 6].includes(seats)) {
    return res.status(400).json({ message: 'Le nombre de places doit être 2, 4 ou 6' });
  }

  try {
    const table = await Table.create({ seats });
    res.status(201).json({ message: 'Table créée', table });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

// PUT /tables/:id - Modifier une table (admin uniquement)
exports.updateTable = async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Accès refusé' });
  }

  const id = req.params.id;
  const { seats } = req.body;

  // Vérifier que le nombre de places est valide (2, 4 ou 6)
  if (![2, 4, 6].includes(seats)) {
    return res.status(400).json({ message: 'Le nombre de places doit être 2, 4 ou 6' });
  }

  try {
    const table = await Table.findByPk(id);
    if (!table) {
      return res.status(404).json({ message: 'Table introuvable' });
    }

    await table.update({ seats });
    res.json({ message: 'Table modifiée', table });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

// DELETE /tables/:id - Supprimer une table (admin uniquement)
exports.deleteTable = async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Accès refusé' });
  }

  const id = req.params.id;

  try {
    const table = await Table.findByPk(id);
    if (!table) {
      return res.status(404).json({ message: 'Table introuvable' });
    }

    // Vérifier si la table est utilisée dans des réservations
    const reservationCount = await ReservationTable.count({ where: { TableId: id } });
    if (reservationCount > 0) {
      return res.status(400).json({ message: 'Impossible de supprimer une table utilisée dans des réservations' });
    }

    await table.destroy();
    res.json({ message: 'Table supprimée' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

// GET /tables/available - Vérifier les tables disponibles pour un créneau
exports.getAvailableTables = async (req, res) => {
  const { date, time, number_of_people } = req.query;

  if (!date || !time) {
    return res.status(400).json({ message: 'Date et heure requises' });
  }

  try {
    // Récupérer toutes les tables
    const allTables = await Table.findAll();
    
    // Récupérer les tables déjà réservées pour ce créneau
    const reservedTableIds = await getReservedTableIds(date, time);
    
    // Filtrer les tables disponibles
    const availableTables = allTables.filter(table => !reservedTableIds.includes(table.id));
    
    // Vérifier si nous pouvons accommoder le nombre de personnes
    let result = { available: false, tables: availableTables };
    
    if (number_of_people) {
      const tableAssignment = findTableCombination(availableTables, parseInt(number_of_people));
      result.available = !!tableAssignment;
      result.tableAssignment = tableAssignment;
    }
    
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

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
