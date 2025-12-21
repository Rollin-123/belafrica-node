// server.ts - VERSION COMPLÈTE POUR RENDER
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
// Charger les variables d'environnement
dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;

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

// ✅ ROUTES
app.use('/api/auth', authRoutes);
app.use('/api/debug', debugRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/admin', adminRoutes);

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
        '/api/auth/complete-profile',
        'GET /api/posts',
        'POST /api/posts',
        'DELETE /api/posts/:id',
        'POST /api/admin/generate-code',
        'POST /api/admin/validate-code'
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
      'POST /api/auth/complete-profile',
      'GET /api/posts',
      'POST /api/posts',
      'DELETE /api/posts/:id'
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