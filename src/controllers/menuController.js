const MenuItem = require('../models/MenuItem');

// GET /menu - Public
exports.getAllMenuItems = async (req, res) => {
  try {
    const menuItems = await MenuItem.findAll();
    
    // Organiser les éléments par catégorie
    const categorizedMenu = menuItems.reduce((acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = [];
      }
      acc[item.category].push(item);
      return acc;
    }, {});
    
    res.json(categorizedMenu);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};
