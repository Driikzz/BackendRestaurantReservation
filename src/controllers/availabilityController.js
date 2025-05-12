const { OpeningSlot, ExceptionalDate, ExceptionalSlot, Reservation } = require('../models');
const { Op } = require('sequelize');

// GET /availability - Obtenir les créneaux disponibles pour une date
exports.getAvailabilityByDate = async (req, res) => {
  try {
    const { date } = req.query;
    
    if (!date) {
      return res.status(400).json({ message: 'Date requise' });
    }

    // Vérifier si le restaurant est fermé exceptionnellement
    const exceptionalClosure = await ExceptionalDate.findOne({
      where: {
        date,
        is_closed: true
      }
    });

    if (exceptionalClosure) {
      return res.json({
        date,
        is_closed: true,
        message: exceptionalClosure.note || 'Restaurant fermé exceptionnellement',
        available_slots: []
      });
    }

    // Obtenir le jour de la semaine (0 = dimanche, 1 = lundi, etc.)
    const dateObj = new Date(date);
    const dayOfWeek = dateObj.getDay();

    // Créneaux standards pour ce jour de la semaine
    const regularSlots = await OpeningSlot.findAll({
      where: {
        day_of_week: dayOfWeek,
        is_active: true
      },
      order: [['time', 'ASC']]
    });

    // Créneaux exceptionnels pour cette date
    const exceptionalDate = await ExceptionalDate.findOne({
      where: {
        date,
        is_closed: false
      },
      include: [
        {
          model: ExceptionalSlot,
          required: false
        }
      ]
    });

    let exceptionalSlots = [];
    if (exceptionalDate && exceptionalDate.ExceptionalSlots) {
      exceptionalSlots = exceptionalDate.ExceptionalSlots;
    }

    // Combiner les créneaux standards et exceptionnels
    let allSlots = [...regularSlots.map(slot => ({
      time: slot.time,
      duration: slot.duration,
      is_exceptional: false
    }))];

    // Ajouter les créneaux exceptionnels
    exceptionalSlots.forEach(slot => {
      allSlots.push({
        time: slot.time,
        duration: slot.duration,
        is_exceptional: true
      });
    });

    // Trier par heure
    allSlots.sort((a, b) => {
      if (a.time < b.time) return -1;
      if (a.time > b.time) return 1;
      return 0;
    });

    // Vérifier les réservations existantes pour déterminer la disponibilité
    const existingReservations = await Reservation.findAll({
      where: {
        date,
        status: {
          [Op.ne]: 'cancelled'
        }
      }
    });

    // Marquer les créneaux comme disponibles ou occupés
    // Cette partie est simplifiée - en réalité, vous devriez vérifier par rapport aux tables disponibles
    const availableSlots = allSlots.map(slot => {
      const timeStr = slot.time;
      const isBooked = existingReservations.some(res => {
        return res.time === timeStr;
      });

      return {
        ...slot,
        available: !isBooked
      };
    });

    res.json({
      date,
      is_closed: false,
      available_slots: availableSlots
    });
    
  } catch (err) {
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