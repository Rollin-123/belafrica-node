// server.ts - VERSION COMPLÈTE POUR RENDER
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

// ✅ INIT SUPABASE
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables Supabase manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
console.log('✅ Supabase connecté');

// ✅ FONCTION: Géolocalisation
async function detectCountryByIP(ip: string): Promise<{country: string, countryCode: string}> {
  try {
    if (ip === '::1' || ip === '127.0.0.1' || ip.startsWith('192.168.')) {
      return { country: 'Local', countryCode: 'XX' };
    }

    const response = await axios.get(`http://ip-api.com/json/${ip}?fields=country,countryCode`);
    if (response.data.status === 'success') {
      return {
        country: response.data.country,
        countryCode: response.data.countryCode
      };
    }
    
    return { country: 'Unknown', countryCode: 'XX' };
  } catch (error) {
    return { country: 'Error', countryCode: 'XX' };
  }
}

// ✅ MIDDLEWARE
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

// ✅ ROUTE: Debug géolocalisation
app.get('/api/debug/geo', async (req, res) => {
  try {
    const ip = req.ip || req.headers['x-forwarded-for']?.toString() || 'unknown';
    const location = await detectCountryByIP(ip);
    
    res.json({
      success: true,
      ip: ip,
      location: location,
      headers: {
        'x-forwarded-for': req.headers['x-forwarded-for'],
        'x-real-ip': req.headers['x-real-ip']
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ✅ ROUTE: Test validation
app.post('/api/debug/test-validation', async (req, res) => {
  try {
    const { phoneNumber, countryCode } = req.body;
    
    if (!phoneNumber || !countryCode) {
      return res.status(400).json({
        success: false,
        error: 'Numéro et code pays requis'
      });
    }

    const ip = req.ip || req.headers['x-forwarded-for']?.toString() || 'unknown';
    const location = await detectCountryByIP(ip);
    
    res.json({
      success: true,
      phoneNumber: `${countryCode}${phoneNumber.replace(/\D/g, '')}`,
      clientIP: ip,
      location: location,
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ✅ ROUTE: Demande OTP AVEC GÉOLOCALISATION
app.post('/api/auth/request-otp', async (req, res) => {
  try {
    const { phoneNumber, countryCode } = req.body;
    
    console.log('📱 Demande OTP:', { phoneNumber, countryCode });
    
    if (!phoneNumber || !countryCode) {
      return res.status(400).json({
        success: false,
        error: 'Numéro de téléphone et code pays requis'
      });
    }

    const fullPhoneNumber = `${countryCode}${phoneNumber.replace(/\D/g, '')}`;
    const ip = req.ip || req.headers['x-forwarded-for']?.toString() || 'unknown';
    
    // ✅ DÉTECTION GÉOLOCALISATION
    const location = await detectCountryByIP(ip);
    
    console.log('📍 Localisation:', {
      ip: ip,
      country: location.country,
      code: location.countryCode
    });
    
    // ✅ VALIDATION PAYS (SIMPLIFIÉE POUR LE MOMENT)
    // Vous pouvez activer/désactiver cette validation
    const GEO_VALIDATION_ENABLED = true; 
    
    if (GEO_VALIDATION_ENABLED) {
      // Mapping simple pour test
      const countryMapping: Record<string, string[]> = {
        '+33': ['FR'],
        '+32': ['BE'],
        '+49': ['DE'],
        '+39': ['IT'],
        '+34': ['ES'],
        '+41': ['CH'],
        '+44': ['GB'],
        '+1': ['CA', 'US'],
        '+7': ['RU', 'KZ'],
        '+375': ['BY']
      };

      const allowedCountries = countryMapping[countryCode];
      
      if (allowedCountries && !allowedCountries.includes(location.countryCode)) {
        console.log('❌ Validation échouée:', {
          phoneCode: countryCode,
          detected: location.countryCode,
          allowed: allowedCountries
        });
        
        return res.status(403).json({
          success: false,
          error: `Localisation (${location.country}) ne correspond pas au code pays ${countryCode}`,
          detectedCountry: location.country,
          phoneCountryCode: countryCode,
          geoValidationEnabled: true
        });
      }
    }
    
    console.log('✅ Validation géolocalisation:', location.country);

    // Vérifier si utilisateur existe
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, pseudo, community')
      .eq('phone_number', fullPhoneNumber)
      .single();

    if (existingUser) {
      return res.json({
        success: true,
        message: 'Utilisateur existant',
        userExists: true,
        requiresOTP: true,
        phoneNumber: fullPhoneNumber,
        detectedCountry: location.country
      });
    }

    // Générer OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    
    // Sauvegarder OTP
    await supabase
      .from('otp_codes')
      .insert([{
        phone_number: fullPhoneNumber,
        code: otpCode,
        expires_at: expiresAt.toISOString(),
        created_at: new Date().toISOString()
      }]);

    console.log(`🔑 OTP généré: ${otpCode} pour ${fullPhoneNumber}`);

    res.json({
      success: true,
      message: 'OTP envoyé',
      code: otpCode,
      phoneNumber: fullPhoneNumber,
      expiresIn: '10 minutes',
      detectedCountry: location.country,
      countryCode: location.countryCode,
      geoValidationEnabled: GEO_VALIDATION_ENABLED
    });
    
  } catch (error: any) {
    console.error('❌ Erreur requestOTP:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erreur interne du serveur'
    });
  }
});

// ✅ ROUTE: Vérification OTP
app.post('/api/auth/verify-otp', async (req, res) => {
  try {
    const { phoneNumber, code } = req.body;
    
    if (!phoneNumber || !code) {
      return res.status(400).json({
        success: false,
        error: 'Numéro et code requis'
      });
    }

    // Vérifier OTP dans Supabase
    const { data: otpData } = await supabase
      .from('otp_codes')
      .select('*')
      .eq('phone_number', phoneNumber)
      .eq('code', code)
      .eq('verified', false)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (!otpData) {
      return res.status(401).json({
        success: false,
        error: 'Code OTP invalide ou expiré'
      });
    }

    // Marquer comme vérifié
    await supabase
      .from('otp_codes')
      .update({ verified: true })
      .eq('id', otpData.id);

    console.log('✅ OTP validé pour:', phoneNumber);

    res.json({
      success: true,
      verified: true,
      message: 'OTP vérifié avec succès',
      phoneNumber: phoneNumber
    });
    
  } catch (error: any) {
    console.error('❌ Erreur verifyOTP:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erreur interne du serveur'
    });
  }
});

// ✅ ROUTE: Compléter profil
app.post('/api/auth/complete-profile', async (req, res) => {
  try {
    const profileData = req.body;
    
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
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('phone_number', profileData.phoneNumber)
      .single();

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
      country_name: profileData.countryName || 'Unknown',
      nationality: profileData.nationality,
      nationality_name: profileData.nationalityName,
      pseudo: profileData.pseudo,
      email: profileData.email,
      avatar_url: profileData.avatar || null,
      community: profileData.community,
      is_admin: false,
      is_verified: true,
      created_at: new Date().toISOString()
    };

    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert([userData])
      .select()
      .single();

    if (insertError) {
      console.error('❌ Erreur création utilisateur:', insertError);
      return res.status(500).json({
        success: false,
        error: 'Erreur création utilisateur'
      });
    }

    console.log('✅ Utilisateur créé:', newUser.id);

    // Générer token simple
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
      error: error.message || 'Erreur création profil'
    });
  }
});

// ✅ ROUTE: Health check améliorée
app.get('/api/health', async (req, res) => {
  try {
    // Tester Supabase
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);

    const supabaseStatus = error ? 'ERROR' : 'CONNECTED';
    
    res.json({ 
      status: 'OK',
      timestamp: new Date().toISOString(),
      service: 'BELAFRICA Backend',
      environment: process.env.NODE_ENV || 'production',
      supabase: supabaseStatus,
      ip: req.ip,
      url: 'https://belafrica-backend.onrender.com',
      routes: [
        '/api/health',
        '/api/debug/geo',
        '/api/debug/test-validation',
        '/api/auth/request-otp',
        '/api/auth/verify-otp',
        '/api/auth/complete-profile'
      ]
    });
    
  } catch (error: any) {
    res.status(500).json({
      status: 'ERROR',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ✅ 404 Handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Route non trouvée',
    availableRoutes: [
      'GET /api/health',
      'GET /api/debug/geo',
      'POST /api/debug/test-validation',
      'POST /api/auth/request-otp',
      'POST /api/auth/verify-otp',
      'POST /api/auth/complete-profile'
    ]
  });
});

// ✅ Démarrer serveur
app.listen(PORT, () => {
  console.log(`🚀 Serveur BELAFRICA démarré sur le port ${PORT}`);
  console.log(`🌍 URL: https://belafrica-backend.onrender.com`);
  console.log(`📍 Test géolocalisation: GET /api/debug/geo`);
  console.log(`🔐 Test OTP: POST /api/auth/request-otp`);
});