const { OpeningSlot, ExceptionalDate, ExceptionalSlot, Reservation, Table, ReservationTable } = require('../models');
const { Op } = require('sequelize');

// GET /availability - Obtenir les créneaux disponibles pour une date
exports.getAvailabilityByDate = async (req, res) => {
  try {
    const { date } = req.query;
    
    if (!date) {
      return res.status(400).json({ message: 'Date requise' });
    }

    console.log('🔍 Recherche créneaux pour la date:', date);

    // Vérifier si le restaurant est fermé exceptionnellement
    const exceptionalClosure = await ExceptionalDate.findOne({
      where: {
        date,
        is_closed: true
      }
    });

    if (exceptionalClosure) {
      console.log('❌ Restaurant fermé exceptionnellement');
      return res.json({
        date,
        is_closed: true,
        message: exceptionalClosure.note || 'Restaurant fermé exceptionnellement',
        slots: []
      });
    }

    // Calculer le jour de la semaine correctement
    const dateObj = new Date(date + 'T12:00:00'); // Ajouter time pour éviter les problèmes de timezone
    const dayOfWeek = dateObj.getDay(); // 0 = dimanche, 1 = lundi, etc.
    
    console.log('📅 Date parsée:', dateObj);
    console.log('📅 Jour de la semaine:', dayOfWeek);

    // Vérifier s'il y a des créneaux exceptionnels pour cette date
    const exceptionalDate = await ExceptionalDate.findOne({
      where: {
        date,
        is_closed: false
      },
      include: [ExceptionalSlot]
    });

    let allSlots = [];

    // Si date exceptionnelle avec créneaux, utiliser UNIQUEMENT ceux-ci
    if (exceptionalDate && exceptionalDate.ExceptionalSlots?.length > 0) {
      console.log('🎯 Utilisation des créneaux exceptionnels:', exceptionalDate.ExceptionalSlots.length);
      allSlots = exceptionalDate.ExceptionalSlots.map(slot => ({
        time: slot.time,
        duration: slot.duration,
        is_exceptional: true
      }));
    } else {
      // Sinon, récupérer les créneaux standards pour ce jour de la semaine
      console.log('📋 Recherche créneaux standards pour le jour:', dayOfWeek);
      
      const regularSlots = await OpeningSlot.findAll({
        where: {
          day_of_week: dayOfWeek,
          is_active: true
        },
        order: [['time', 'ASC']]
      });

      console.log('📋 Créneaux standards trouvés:', regularSlots.length);
      regularSlots.forEach(slot => {
        console.log(`  - ${slot.time} (jour ${slot.day_of_week})`);
      });

      allSlots = regularSlots.map(slot => ({
        time: slot.time,
        duration: slot.duration,
        is_exceptional: false
      }));
    }

    // Trier par heure
    allSlots.sort((a, b) => a.time.localeCompare(b.time));

    console.log('⏰ Tous les créneaux avant vérification:', allSlots.length);

    // Pour simplifier le debug, retourner tous les créneaux comme disponibles pour l'instant
    const availableSlots = allSlots.map(slot => slot.time);

    console.log('✅ Créneaux disponibles finaux:', availableSlots);

    res.json({
      date,
      is_closed: false,
      slots: availableSlots,
      total_slots: allSlots.length,
      available_slots: availableSlots.length,
      day_of_week: dayOfWeek // Pour debug
    });
    
  } catch (err) {
    console.error('❌ Erreur dans getAvailabilityByDate:', err);
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

// GET /availability/dates - Obtenir les dates disponibles
exports.getAvailableDates = async (req, res) => {
  try {
    const today = new Date();
    const availableDates = [];

    // Obtenir tous les créneaux standards actifs
    const openingSlots = await OpeningSlot.findAll({
      where: { is_active: true }
    });
    
    console.log('📋 Créneaux standards actifs:', openingSlots.length);
    
    const activeDays = new Set(openingSlots.map(slot => slot.day_of_week));
    console.log('📅 Jours actifs:', Array.from(activeDays));

    // Obtenir toutes les dates exceptionnelles
    const exceptionalDates = await ExceptionalDate.findAll({
      include: [ExceptionalSlot]
    });
    
    const exceptionalMap = {};
    exceptionalDates.forEach(ed => {
      exceptionalMap[ed.date] = ed;
    });

    console.log('🎯 Dates exceptionnelles:', Object.keys(exceptionalMap));

    // Générer les 30 prochains jours
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dayOfWeek = date.getDay();
      const dateStr = date.toISOString().slice(0, 10);

      // Vérifier si c'est une date de fermeture exceptionnelle
      if (exceptionalMap[dateStr]?.is_closed) {
        console.log(`❌ ${dateStr} - Fermé exceptionnellement`);
        continue;
      }

      // Si date exceptionnelle avec créneaux
      if (exceptionalMap[dateStr] && exceptionalMap[dateStr].ExceptionalSlots?.length > 0) {
        console.log(`🎯 ${dateStr} - Date exceptionnelle avec ${exceptionalMap[dateStr].ExceptionalSlots.length} créneaux`);
        availableDates.push({
          date: dateStr,
          type: 'exceptional',
          slots_count: exceptionalMap[dateStr].ExceptionalSlots.length
        });
        continue;
      }

      // Si jour standard ouvert
      if (activeDays.has(dayOfWeek)) {
        const slotsForDay = openingSlots.filter(slot => slot.day_of_week === dayOfWeek);
        console.log(`📅 ${dateStr} (jour ${dayOfWeek}) - ${slotsForDay.length} créneaux standards`);
        availableDates.push({
          date: dateStr,
          type: 'regular',
          slots_count: slotsForDay.length
        });
      } else {
        console.log(`❌ ${dateStr} (jour ${dayOfWeek}) - Aucun créneau standard`);
      }
    }

    console.log('✅ Total dates disponibles:', availableDates.length);

    res.json({
      available_dates: availableDates,
      message: `${availableDates.length} dates disponibles trouvées`
    });

  } catch (err) {
    console.error('❌ Erreur dans getAvailableDates:', err);
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

// POST /admin/opening-slots - Créer ou mettre à jour un créneau standard (admin uniquement)
exports.createOrUpdateOpeningSlot = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Accès refusé' });
    }

    const { day_of_week, time, duration, is_active } = req.body;

    if (day_of_week < 0 || day_of_week > 6) {
      return res.status(400).json({ message: 'Jour de la semaine invalide (0-6)' });
    }

    // Rechercher un créneau existant ou en créer un nouveau
    const [slot, created] = await OpeningSlot.findOrCreate({
      where: { day_of_week, time },
      defaults: { duration, is_active }
    });

    if (!created) {
      // Mettre à jour le créneau existant
      await slot.update({ duration, is_active });
    }

    res.status(created ? 201 : 200).json({
      message: created ? 'Créneau créé' : 'Créneau mis à jour',
      slot
    });
    
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

// POST /admin/exceptional-dates - Créer ou mettre à jour une date exceptionnelle (admin uniquement)
exports.createOrUpdateExceptionalDate = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Accès refusé' });
    }

    const { date, is_closed, note, slots } = req.body;

    if (!date) {
      return res.status(400).json({ message: 'Date requise' });
    }

    // Rechercher une date exceptionnelle existante ou en créer une nouvelle
    let [exceptionalDate, created] = await ExceptionalDate.findOrCreate({
      where: { date },
      defaults: { is_closed, note }
    });

    if (!created) {
      // Mettre à jour la date exceptionnelle existante
      await exceptionalDate.update({ is_closed, note });
    }

    // Si des créneaux sont fournis et que le restaurant n'est pas fermé
    if (slots && !is_closed) {
      // Supprimer les créneaux existants
      await ExceptionalSlot.destroy({
        where: { exceptional_date_id: exceptionalDate.id }
      });

      // Créer les nouveaux créneaux
      const newSlots = [];
      for (const slotData of slots) {
        const newSlot = await ExceptionalSlot.create({
          exceptional_date_id: exceptionalDate.id,
          date,
          time: slotData.time,
          duration: slotData.duration || 90
        });
        newSlots.push(newSlot);
      }

      // Recharger la date exceptionnelle avec les nouveaux créneaux
      exceptionalDate = await ExceptionalDate.findByPk(exceptionalDate.id, {
        include: [ExceptionalSlot]
      });
    }

    res.status(created ? 201 : 200).json({
      message: created ? 'Date exceptionnelle créée' : 'Date exceptionnelle mise à jour',
      exceptionalDate
    });
    
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

// GET /admin/opening-slots - Obtenir tous les créneaux standards (admin uniquement)
exports.getAllOpeningSlots = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Accès refusé' });
    }

    const slots = await OpeningSlot.findAll({
      order: [
        ['day_of_week', 'ASC'],
        ['time', 'ASC']
      ]
    });

    res.json(slots);
    
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

// GET /admin/exceptional-dates - Obtenir toutes les dates exceptionnelles
exports.getAllExceptionalDates = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Accès refusé' });
    }

    const exceptionalDates = await ExceptionalDate.findAll({
      include: [ExceptionalSlot],
      order: [['date', 'ASC']]
    });

    res.json(exceptionalDates);
    
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

// GET /available-tables - Obtenir les tables disponibles pour un créneau
exports.getAvailableTables = async (req, res) => {
  try {
    const { date, time } = req.query;
    
    if (!date || !time) {
      return res.status(400).json({ message: 'Date et heure requises' });
    }

    // Récupérer toutes les tables
    const allTables = await Table.findAll();

    // Créer une plage horaire
    const timeObj = new Date(`2000-01-01T${time}`);
    const bufferMs = 2 * 60 * 60 * 1000; // 2 heures

    const startTime = new Date(timeObj.getTime() - bufferMs).toTimeString().slice(0, 8);
    const endTime = new Date(timeObj.getTime() + bufferMs).toTimeString().slice(0, 8);

    // Trouver les réservations qui se chevauchent
    const conflictingReservations = await Reservation.findAll({
      where: {
        date: date,
        time: {
          [Op.between]: [startTime, endTime]
        },
        status: {
          [Op.ne]: 'cancelled'
        }
      },
      include: [Table]
    });

    const reservedTableIds = new Set();
    conflictingReservations.forEach(reservation => {
      reservation.Tables.forEach(table => {
        reservedTableIds.add(table.id);
      });
    });

    const availableTables = allTables.filter(table => !reservedTableIds.has(table.id));

    res.json({
      date,
      time,
      available_tables: availableTables,
      total_tables: allTables.length,
      reserved_tables: reservedTableIds.size
    });
    
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
}; 