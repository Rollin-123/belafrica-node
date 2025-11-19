import express from 'express';
import { User } from '../models/User.model';
import { AdminCode } from '../models/AdminCode.model';
import jwt from 'jsonwebtoken';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'belafrica_super_secret_2025';

// ✅ GÉNÉRER UN CODE ADMIN (Interface créateur)
router.post('/generate-code', async (req, res) => {
  try {
    const { community, userEmail, permissions, expiresInHours = 72 } = req.body;

    if (!community || !userEmail || !permissions) {
      return res.status(400).json({
        success: false,
        error: 'Communauté, email et permissions requis'
      });
    }

    // Générer un code court unique
    const generateShortCode = (): string => {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let code = '';
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return code;
    };

    const code = generateShortCode();
    const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);

    // Créer le code admin
    const adminCode = new AdminCode({
      code,
      community,
      userEmail,
      permissions,
      expiresAt
    });

    await adminCode.save();

    console.log(`🔑 Code admin généré: ${code} pour ${community}`);

    res.json({
      success: true,
      code,
      expiresAt,
      message: `Code admin généré pour ${community}`
    });

  } catch (error: any) {
    console.error('❌ Erreur génération code admin:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur interne du serveur'
    });
  }
});

// ✅ VALIDER UN CODE ADMIN (Utilisateur)
router.post('/validate-code', async (req, res) => {
  try {
    const { code, userId } = req.body;

    if (!code || !userId) {
      return res.status(400).json({
        success: false,
        error: 'Code et ID utilisateur requis'
      });
    }

    // Trouver le code admin
    const adminCode = await AdminCode.findOne({ 
      code,
      used: false,
      expiresAt: { $gt: new Date() }
    });

    if (!adminCode) {
      return res.status(404).json({
        success: false,
        error: 'Code invalide, expiré ou déjà utilisé'
      });
    }

    // Trouver l'utilisateur
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Utilisateur non trouvé'
      });
    }

    // Vérifier la correspondance de communauté
    if (adminCode.community !== user.community && !adminCode.permissions.includes('post_international')) {
      return res.status(403).json({
        success: false,
        error: 'Ce code ne correspond pas à votre communauté'
      });
    }

    // Promouvoir l'utilisateur
    user.isAdmin = true;
    user.adminPermissions = adminCode.permissions;
    user.adminLevel = adminCode.permissions.includes('post_international') ? 'international' : 'national';
    user.adminSince = new Date();

    // Marquer le code comme utilisé
    adminCode.used = true;
    // adminCode.usedBy = user._id;
    adminCode.usedAt = new Date();

    await Promise.all([user.save(), adminCode.save()]);

    console.log(`✅ Utilisateur ${user.pseudo} promu admin`);

    // Générer un JWT pour l'utilisateur
    const userToken = jwt.sign(
      {
        userId: user._id,
        isAdmin: true,
        permissions: user.adminPermissions,
        community: user.community
      },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      success: true,
      message: 'Félicitations ! Vous êtes maintenant administrateur',
      user: {
        id: user._id,
        pseudo: user.pseudo,
        isAdmin: user.isAdmin,
        adminLevel: user.adminLevel,
        permissions: user.adminPermissions
      },
      token: userToken
    });

  } catch (error: any) {
    console.error('❌ Erreur validation code admin:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur interne du serveur'
    });
  }
});

// ✅ LISTER LES CODES GÉNÉRÉS (Interface créateur)
router.get('/codes', async (req, res) => {
  try {
    const codes = await AdminCode.find()
      .sort({ createdAt: -1 })
      .populate('usedBy', 'pseudo phoneNumber');

    res.json({
      success: true,
      codes: codes.map(code => ({
        id: code._id,
        code: code.code,
        community: code.community,
        userEmail: code.userEmail,
        permissions: code.permissions,
        expiresAt: code.expiresAt,
        used: code.used,
        usedBy: code.usedBy,
        usedAt: code.usedAt,
        createdAt: code.createdAt
      }))
    });

  } catch (error: any) {
    console.error('❌ Erreur récupération codes:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur interne du serveur'
    });
  }
});

export default router;