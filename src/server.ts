// server.ts - Version corrigée pour Railway
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import { createClient } from '@supabase/supabase-js';

// Charger les variables d'environnement
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// ✅ VÉRIFIER LES VARIABLES D'ENVIRONNEMENT
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables Supabase manquantes dans .env');
  console.error('SUPABASE_URL:', supabaseUrl ? '✅' : '❌');
  console.error('SUPABASE_KEY:', supabaseKey ? '✅' : '❌');
  process.exit(1);
}

// ✅ INITIALISER SUPABASE (version 2.38.0 compatible Node 18)
const supabase = createClient(supabaseUrl, supabaseKey);
console.log('✅ Supabase connecté:', supabaseUrl);

// Middleware
app.use(helmet());
app.use(cors({
  origin: ['http://localhost:4200', 'https://belafrica-version1.netlify.app'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200
});
app.use('/api/', limiter);

// Logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  next();
});

// ✅ ROUTE: Health check améliorée
app.get('/api/health', async (req, res) => {
  try {
    // Tester Supabase
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);

    res.json({ 
      status: 'OK',
      timestamp: new Date().toISOString(),
      service: 'BELAFRICA Backend',
      environment: process.env.NODE_ENV || 'development',
      supabase: error ? 'ERROR' : 'CONNECTED',
      nodeVersion: process.version,
      memory: process.memoryUsage()
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'ERROR',
      error: error.message 
    });
  }
});

// ✅ ROUTE: Demande OTP (simplifiée pour test)
app.post('/api/auth/request-otp', async (req, res) => {
  try {
    const { phoneNumber, countryCode } = req.body;
    
    console.log('📱 OTP demandé pour:', phoneNumber);
    
    if (!phoneNumber || !countryCode) {
      return res.status(400).json({
        success: false,
        error: 'Numéro et code pays requis'
      });
    }

    const fullPhoneNumber = `${countryCode}${phoneNumber.replace(/\D/g, '')}`;
    
    // Vérifier si l'utilisateur existe déjà
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, pseudo')
      .eq('phone_number', fullPhoneNumber)
      .single();

    // Générer OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    res.json({
      success: true,
      message: 'OTP généré',
      code: otpCode,
      phoneNumber: fullPhoneNumber,
      userExists: !!existingUser,
      expiresIn: 600 // 10 minutes en secondes
    });
    
  } catch (error: any) {
    console.error('❌ Erreur OTP:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur'
    });
  }
});

// ✅ ROUTE: Créer utilisateur
app.post('/api/auth/complete-profile', async (req, res) => {
  try {
    const userData = req.body;
    console.log('👤 Création utilisateur:', userData);
    
    // Validation basique
    if (!userData.phoneNumber || !userData.pseudo) {
      return res.status(400).json({
        success: false,
        error: 'Données manquantes'
      });
    }

    // ✅ INSÉRER DANS SUPABASE
    const { data, error } = await supabase
      .from('users')
      .insert([{
        phone_number: userData.phoneNumber,
        country_code: userData.countryCode || '+33',
        country_name: userData.countryName || 'France',
        nationality: userData.nationality || 'FR',
        nationality_name: userData.nationalityName || 'Français',
        pseudo: userData.pseudo,
        email: userData.email || null,
        avatar_url: userData.avatar || null,
        community: userData.community || 'TestCommunity',
        is_admin: false,
        is_verified: true,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) {
      console.error('❌ Erreur Supabase:', error);
      return res.status(500).json({
        success: false,
        error: `Erreur base de données: ${error.message}`
      });
    }

    console.log('✅ Utilisateur créé:', data.id);
    
    res.json({
      success: true,
      user: {
        id: data.id,
        pseudo: data.pseudo,
        community: data.community,
        phoneNumber: data.phone_number
      },
      message: 'Utilisateur créé avec succès'
    });
    
  } catch (error: any) {
    console.error('❌ Erreur création:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ✅ ROUTE: Lister les utilisateurs (pour test)
app.get('/api/users', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    res.json({
      success: true,
      count: data?.length || 0,
      users: data
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ✅ Gestion 404
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route non trouvée',
    availableRoutes: [
      'GET  /api/health',
      'POST /api/auth/request-otp',
      'POST /api/auth/complete-profile',
      'GET  /api/users'
    ]
  });
});

// ✅ Démarrer le serveur
app.listen(PORT, () => {
  console.log(`🚀 Serveur démarré sur le port ${PORT}`);
  console.log(`✅ Environnement: ${process.env.NODE_ENV || 'development'}`);
  console.log(`✅ Supabase: ${supabaseUrl ? 'CONNECTÉ' : 'ERREUR'}`);
  console.log(`✅ Health check: http://localhost:${PORT}/api/health`);
});