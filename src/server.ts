// server.ts 
/* 
    * BELAFRICA - Plateforme diaspora africaine
    * Copyright © 2025 Rollin Loic Tianga. Tous droits réservés.
    * Code source confidentiel - Usage interdit sans autorisation
    */
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
import { getAppConstants, handleTelegramWebhook } from './controllers/app.controller';
import messagingRoutes from './routes/messaging.routes';
import http from 'http';  
import { initializeSocketManager } from './services/socket.manager';
import cookieParser from 'cookie-parser';

dotenv.config();

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;  

// Lire les origines autorisées depuis les variables d'environnement.
// Séparez les URLs par des virgules dans votre variable d'environnement sur Render.
const allowedOrigins = (process.env.CORS_ORIGIN || '').split(',');

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    if (!origin) {
      callback(null, true);
     return;
    }
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`🚫 Origine CORS non autorisée bloquée: ${origin}`);
      callback(new Error(`L'origine ${origin} n'est pas autorisée par la politique CORS.`));
    }
  },
  credentials: true,
};
initializeSocketManager(server, corsOptions);

app.use(helmet());
app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json({ limit: '10mb' })); 
app.use(express.urlencoded({ extended: true, limit: '10mb' }));  

app.set('trust proxy', 1);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,  
  max: 1000  
});
app.use('/api/', limiter);
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url} - IP: ${req.ip}`);
  next();
});
app.get('/api/constants', getAppConstants);
app.use('/api/auth', authRoutes);
app.use('/api/debug', debugRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/messaging', messagingRoutes);

app.post(`/api/telegram-webhook/${process.env.TELEGRAM_BOT_TOKEN}`, handleTelegramWebhook);  

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
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: `Route non trouvée: ${req.method} ${req.originalUrl}`
  });
});

server.listen(PORT, () => {
  console.log(`✅ Serveur HTTP et Sockets démarrés sur le port ${PORT}`);
  console.log(`🚀 Serveur BELAFRICA démarré sur le port ${PORT}`);
  initializeTelegramBot(app); 
  console.log(`🌍 URL: https://belafrica-backend.onrender.com`);
  console.log(`📍 Test géolocalisation: GET /api/debug/geo`);
  console.log(`🔐 Test OTP: POST /api/auth/request-otp`);
});