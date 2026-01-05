// server.ts - VERSION CORRIGÉE ET VÉRIFIÉE
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import { supabase } from './utils/supabase';
import authRoutes from './routes/auth.routes';
import debugRoutes from './routes/debug.routes';
import postRoutes from './routes/post.routes';
import adminRoutes from './routes/admin.routes';
import { initializeTelegramBot } from './services/telegram.service';
import { getAppConstants } from './controllers/app.controller';
import messagingRoutes from './routes/messaging.routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000; // Utiliser le port 3000 en local

// ✅ MIDDLEWARES
app.use(helmet());
// ✅ CORRECTION: Utiliser la variable d'environnement pour CORS
app.use(cors({
  // La variable d'environnement peut contenir plusieurs URLs séparées par une virgule
  origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : false,
  credentials: true
}));
app.use(express.json({ limit: '10mb' })); // ✅ Augmenter la limite pour le JSON (pour les avatars en base64)
app.use(express.urlencoded({ extended: true, limit: '10mb' })); // ✅ Augmenter aussi pour les formulaires URL-encoded

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

// ✅ ROUTES
// La route pour les constantes doit être déclarée avant les autres groupes
app.get('/api/constants', getAppConstants);

// Les autres groupes de routes
app.use('/api/auth', authRoutes);
app.use('/api/debug', debugRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/messaging', messagingRoutes);

// ✅ ROUTE: Health check
app.get('/api/health', async (req, res) => {
  try {
    const { error } = await supabase.from('users').select('id').limit(1);
    const supabaseStatus = error ? `ERROR: ${error.message}` : 'CONNECTED';
    
    res.json({ 
      status: 'OK',
      timestamp: new Date().toISOString(),
      supabase: supabaseStatus
    });
  } catch (error: any) {
    res.status(500).json({ status: 'ERROR', error: error.message });
  }
});

// ✅ 404 Handler (doit être le DERNIER)
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: `Route non trouvée: ${req.method} ${req.originalUrl}`
  });
});

// ✅ Démarrer serveur
app.listen(PORT, () => {
  console.log(`🚀 Serveur BELAFRICA démarré sur le port ${PORT}`);
  initializeTelegramBot();
  console.log(`🌍 URL: https://belafrica-backend.onrender.com`);
  console.log(`📍 Test géolocalisation: GET /api/debug/geo`);
  console.log(`🔐 Test OTP: POST /api/auth/request-otp`);
});