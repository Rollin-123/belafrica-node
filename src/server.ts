import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

// Charger les variables d'environnement
dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;

// ✅ INIT SUPABASE AVEC VALIDATION
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ ERREUR: Variables Supabase manquantes dans .env');
  console.error('SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
  console.error('SUPABASE_KEY:', supabaseKey ? '✓' : '✗');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
console.log('✅ Supabase connecté:', supabaseUrl);

// ✅ SERVICE GÉOLOCALISATION
async function detectLocation(ip?: string): Promise<{country: string, countryCode: string}> {
  try {
    // Si pas d'IP, utiliser l'IP du client
    let clientIP = ip;
    
    if (!clientIP && process.env.NODE_ENV === 'production') {
      // Sur Render, l'IP est dans les headers
      return {
        country: 'Inconnu',
        countryCode: 'XX'
      };
    }

    // Utiliser ip-api.com (gratuit)
    const response = await axios.get(`http://ip-api.com/json/${clientIP}`, {
      timeout: 5000
    });
    
    if (response.data.status === 'success') {
      return {
        country: response.data.country,
        countryCode: response.data.countryCode
      };
    }
    
    return {
      country: 'Inconnu',
      countryCode: 'XX'
    };
    
  } catch (error) {
    console.error('❌ Erreur géolocalisation:', error);
    return {
      country: 'Inconnu',
      countryCode: 'XX'
    };
  }
}

// ✅ VALIDATION PAYS
function validatePhoneCountry(phoneCountryCode: string, detectedCountryCode: string): boolean {
  const countryMapping: Record<string, string[]> = {
    '+33': ['FR'], // France
    '+32': ['BE'], // Belgique
    '+49': ['DE'], // Allemagne
    '+39': ['IT'], // Italie
    '+34': ['ES'], // Espagne
    '+41': ['CH'], // Suisse
    '+44': ['GB'], // Royaume-Uni
    '+1': ['CA', 'US'],
    '+7': ['RU', 'KZ'],
    '+375': ['BY'] // Biélorussie
  };

  const allowedCountries = countryMapping[phoneCountryCode];
  
  if (!allowedCountries) {
    console.warn(`⚠️ Code téléphone non mappé: ${phoneCountryCode}`);
    return true; // Autoriser si non mappé
  }

  const isValid = allowedCountries.includes(detectedCountryCode);
  
  console.log('🌍 Validation pays:', {
    phoneCode: phoneCountryCode,
    detected: detectedCountryCode,
    allowed: allowedCountries,
    isValid
  });
  
  return isValid;
}

// Middleware
app.use(helmet());
app.use(cors({
  origin: [
    'http://localhost:4200',
    'https://belafrica-version1.netlify.app',
    'https://belafrica.netlify.app',
    'https://*.netlify.app'
  ],
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
  console.log(`${new Date().toISOString()} ${req.method} ${req.url} - IP: ${req.ip}`);
  next();
});

// ✅ ROUTE: Demande OTP AVEC GÉOLOCALISATION
app.post('/api/auth/request-otp', async (req, res) => {
  try {
    const { phoneNumber, countryCode } = req.body;
    
    console.log('📱 Demande OTP reçue:', { 
      phoneNumber, 
      countryCode, 
      ip: req.ip,
      headers: req.headers 
    });
    
    if (!phoneNumber || !countryCode) {
      return res.status(400).json({
        success: false,
        error: 'Numéro de téléphone et code pays requis'
      });
    }

    const fullPhoneNumber = `${countryCode}${phoneNumber.replace(/\D/g, '')}`;
    
    // ✅ 1. GÉOLOCALISATION
    const location = await detectLocation(req.ip);
    console.log('📍 Localisation détectée:', location);
    
    // ✅ 2. VALIDATION PAYS
    const isValidCountry = validatePhoneCountry(countryCode, location.countryCode);
    
    if (!isValidCountry && location.country !== 'Inconnu') {
      console.log('❌ Validation pays échouée:', {
        phoneCode: countryCode,
        detected: location.countryCode,
        country: location.country
      });
      
      return res.status(403).json({
        success: false,
        error: `Accès refusé. Votre localisation (${location.country}) ne correspond pas au code pays ${countryCode}.`,
        detectedCountry: location.country,
        phoneCountryCode: countryCode,
        location: location
      });
    }
    
    console.log('✅ Validation pays réussie:', {
      phoneCode: countryCode,
      detected: location.countryCode,
      country: location.country
    });

    // ✅ 3. VÉRIFIER SI UTILISATEUR EXISTE
    const { data: existingUser, error: userError } = await supabase
      .from('users')
      .select('id, pseudo, community')
      .eq('phone_number', fullPhoneNumber)
      .single();

    if (userError && userError.code !== 'PGRST116') {
      console.error('❌ Erreur Supabase:', userError);
    }

    if (existingUser) {
      console.log('👤 Utilisateur existant trouvé:', existingUser.pseudo);
      return res.json({
        success: true,
        message: 'Utilisateur existant',
        userExists: true,
        requiresOTP: true,
        phoneNumber: fullPhoneNumber,
        detectedCountry: location.country
      });
    }

    // ✅ 4. GÉNÉRER OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    
    // Sauvegarder OTP dans Supabase
    const { error: otpError } = await supabase
      .from('otp_codes')
      .insert([{
        phone_number: fullPhoneNumber,
        code: otpCode,
        expires_at: expiresAt.toISOString(),
        created_at: new Date().toISOString()
      }]);

    if (otpError) {
      console.error('❌ Erreur sauvegarde OTP:', otpError);
    } else {
      console.log('✅ OTP sauvegardé dans Supabase');
    }

    console.log(`🔑 OTP généré: ${otpCode} pour ${fullPhoneNumber}`);

    res.json({
      success: true,
      message: 'OTP envoyé',
      code: otpCode,
      phoneNumber: fullPhoneNumber,
      expiresIn: '10 minutes',
      detectedCountry: location.country,
      countryCode: location.countryCode
    });
    
  } catch (error: any) {
    console.error('❌ Erreur requestOTP:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erreur interne du serveur',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ✅ ROUTE: Vérification OTP
app.post('/api/auth/verify-otp', async (req, res) => {
  try {
    const { phoneNumber, code } = req.body;
    
    console.log('🔐 Vérification OTP:', { phoneNumber, code });
    
    if (!phoneNumber || !code) {
      return res.status(400).json({
        success: false,
        error: 'Numéro et code requis'
      });
    }

    // Vérifier OTP dans Supabase
    const { data: otpData, error: otpError } = await supabase
      .from('otp_codes')
      .select('*')
      .eq('phone_number', phoneNumber)
      .eq('code', code)
      .eq('verified', false)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (otpError) {
      console.log('❌ OTP non trouvé ou déjà utilisé');
      
      // Fallback: Vérifier en mémoire pour les tests
      if (process.env.NODE_ENV === 'development') {
        console.log('🔧 Mode développement: Vérification simplifiée');
        
        // Simuler une vérification réussie pour le développement
        if (code.length === 6 && !isNaN(parseInt(code))) {
          console.log('✅ OTP validé (mode développement)');
          
          // Vérifier si utilisateur existe
          const { data: existingUser } = await supabase
            .from('users')
            .select('*')
            .eq('phone_number', phoneNumber)
            .single();

          if (existingUser) {
            const token = `belafrica_${existingUser.id}_${Date.now()}`;
            
            return res.json({
              success: true,
              verified: true,
              token: token,
              user: {
                id: existingUser.id,
                pseudo: existingUser.pseudo,
                community: existingUser.community,
                isAdmin: existingUser.is_admin
              },
              isNewUser: false,
              message: 'Connexion réussie'
            });
          }

          return res.json({
            success: true,
            verified: true,
            message: 'OTP vérifié avec succès',
            phoneNumber: phoneNumber,
            isNewUser: true
          });
        }
      }
      
      return res.status(401).json({
        success: false,
        error: 'Code OTP invalide ou expiré'
      });
    }

    // Marquer comme vérifié
    await supabase
      .from('otp_codes')
      .update({ verified: true, updated_at: new Date().toISOString() })
      .eq('id', otpData.id);

    console.log('✅ OTP validé dans Supabase pour:', phoneNumber);

    // Vérifier si utilisateur existe
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('phone_number', phoneNumber)
      .single();

    if (existingUser) {
      // Générer token
      const token = `belafrica_${existingUser.id}_${Date.now()}`;
      
      return res.json({
        success: true,
        verified: true,
        token: token,
        user: {
          id: existingUser.id,
          pseudo: existingUser.pseudo,
          community: existingUser.community,
          isAdmin: existingUser.is_admin
        },
        isNewUser: false,
        message: 'Connexion réussie'
      });
    }

    res.json({
      success: true,
      verified: true,
      message: 'OTP vérifié avec succès',
      phoneNumber: phoneNumber,
      isNewUser: true
    });
    
  } catch (error: any) {
    console.error('❌ Erreur verifyOTP:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erreur interne du serveur',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ✅ ROUTE: Compléter profil
app.post('/api/auth/complete-profile', async (req, res) => {
  try {
    const profileData = req.body;
    
    console.log('👤 Création profil:', profileData);
    
    // Validation
    const requiredFields = ['phoneNumber', 'countryCode', 'nationality', 'nationalityName', 'pseudo', 'email', 'community'];
    for (const field of requiredFields) {
      if (!profileData[field]) {
        return res.status(400).json({
          success: false,
          error: `Champ manquant: ${field}`
        });
      }
    }

    // Vérifier si existe déjà
    const { data: existingUser, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('phone_number', profileData.phoneNumber)
      .single();

    if (userError && userError.code !== 'PGRST116') {
      console.error('❌ Erreur vérification utilisateur:', userError);
    }

    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'Un utilisateur avec ce numéro existe déjà'
      });
    }

    // Créer utilisateur
    const userData = {
      phone_number: profileData.phoneNumber,
      country_code: profileData.countryCode,
      country_name: profileData.countryName || 'Inconnu',
      nationality: profileData.nationality,
      nationality_name: profileData.nationalityName,
      pseudo: profileData.pseudo,
      email: profileData.email,
      avatar_url: profileData.avatar || null,
      community: profileData.community,
      is_admin: false,
      is_verified: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('📋 Insertion dans Supabase:', userData);

    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert([userData])
      .select()
      .single();

    if (insertError) {
      console.error('❌ Erreur création utilisateur:', insertError);
      return res.status(500).json({
        success: false,
        error: `Erreur création utilisateur: ${insertError.message}`,
        details: insertError
      });
    }

    console.log('✅ Utilisateur créé dans Supabase:', newUser.id);

    // Générer token
    const token = `belafrica_${newUser.id}_${Date.now()}`;

    res.json({
      success: true,
      token: token,
      user: {
        id: newUser.id,
        pseudo: newUser.pseudo,
        community: newUser.community,
        isAdmin: newUser.is_admin,
        avatar: newUser.avatar_url,
        phoneNumber: newUser.phone_number
      },
      message: 'Profil créé avec succès'
    });
    
  } catch (error: any) {
    console.error('❌ Erreur completeProfile:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erreur création profil',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// ✅ Routes de test
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
      supabaseError: error?.message,
      ip: req.ip,
      url: 'https://belafrica-backend.onrender.com'
    });
    
  } catch (error: any) {
    res.status(500).json({
      status: 'ERROR',
      error: error.message
    });
  }
});

app.get('/api/test-geo', async (req, res) => {
  try {
    const location = await detectLocation(req.ip);
    res.json({
      success: true,
      ip: req.ip,
      location: location,
      headers: {
        'x-forwarded-for': req.headers['x-forwarded-for'],
        'x-real-ip': req.headers['x-real-ip']
      },
      message: 'Test géolocalisation'
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false,
      error: 'Erreur géolocalisation',
      details: error.message 
    });
  }
});

// ✅ Route pour voir les utilisateurs (debug)
app.get('/api/users', async (req, res) => {
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) throw error;

    res.json({
      success: true,
      count: users?.length || 0,
      users: users
    });
    
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ✅ Route pour nettoyer (debug)
app.delete('/api/debug/clean', async (req, res) => {
  try {
    // Supprimer les OTPs expirés
    const { error: otpError } = await supabase
      .from('otp_codes')
      .delete()
      .lt('expires_at', new Date().toISOString());

    res.json({
      success: true,
      message: 'Données nettoyées'
    });
    
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 404 Handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    success: false,
    error: 'Route non trouvée',
    path: req.originalUrl,
    method: req.method,
    availableRoutes: [
      'POST /api/auth/request-otp',
      'POST /api/auth/verify-otp',
      'POST /api/auth/complete-profile',
      'GET /api/health',
      'GET /api/test-geo',
      'GET /api/users'
    ]
  });
});

// Error handler global
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('🔥 Erreur serveur:', err);
  
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Erreur interne du serveur',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Démarrer serveur
app.listen(PORT, () => {
  console.log(`🚀 Serveur BELAFRICA démarré sur le port ${PORT}`);
  console.log(`🌍 Environnement: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: https://belafrica-backend.onrender.com/api/health`);
  console.log(`📍 Test géolocalisation: https://belafrica-backend.onrender.com/api/test-geo`);
  console.log(`📱 Test OTP: POST https://belafrica-backend.onrender.com/api/auth/request-otp`);
});