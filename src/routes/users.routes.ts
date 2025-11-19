import express from 'express';
import { User } from '../models/User.model';

const router = express.Router();

// ✅ METTRE À JOUR LE PROFIL
router.put('/profile', async (req, res) => {
  try {
    const { userId, pseudo, email, avatar } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'ID utilisateur requis'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Utilisateur non trouvé'
      });
    }

    // Mettre à jour les champs
    if (pseudo) user.pseudo = pseudo;
    if (email) user.email = email;
    if (avatar) user.avatar = avatar;

    await user.save();

    res.json({
      success: true,
      message: 'Profil mis à jour avec succès',
      user: {
        id: user._id,
        pseudo: user.pseudo,
        email: user.email,
        avatar: user.avatar,
        community: user.community,
        isAdmin: user.isAdmin
      }
    });

  } catch (error: any) {
    console.error('❌ Erreur mise à jour profil:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur interne du serveur'
    });
  }
});

// ✅ RÉCUPÉRER LES INFORMATIONS UTILISATEUR
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).select('-otpCode -otpExpires');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Utilisateur non trouvé'
      });
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        phoneNumber: user.phoneNumber,
        countryCode: user.countryCode,
        countryName: user.countryName,
        nationality: user.nationality,
        nationalityName: user.nationalityName,
        pseudo: user.pseudo,
        email: user.email,
        avatar: user.avatar,
        community: user.community,
        isAdmin: user.isAdmin,
        adminLevel: user.adminLevel,
        adminPermissions: user.adminPermissions,
        createdAt: user.createdAt
      }
    });

  } catch (error: any) {
    console.error('❌ Erreur récupération utilisateur:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur interne du serveur'
    });
  }
});

// ✅ RÉCUPÉRER LES MEMBRES D'UNE COMMUNAUTÉ
router.get('/community/:community', async (req, res) => {
  try {
    const { community } = req.params;

    const users = await User.find({ community })
      .select('pseudo avatar isAdmin adminLevel createdAt')
      .sort({ createdAt: -1 })
      .limit(100);

    res.json({
      success: true,
      community,
      members: users.map(user => ({
        id: user._id,
        pseudo: user.pseudo,
        avatar: user.avatar,
        isAdmin: user.isAdmin,
        adminLevel: user.adminLevel,
        memberSince: user.createdAt
      }))
    });

  } catch (error: any) {
    console.error('❌ Erreur récupération membres:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur interne du serveur'
    });
  }
});

export default router;