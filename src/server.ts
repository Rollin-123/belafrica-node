import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config, validateConfig } from './config/environments';
import { createClient } from '@supabase/supabase-js';

// Routes
import authRoutes from './routes/auth.routes';
import adminRoutes from './routes/admin.routes';
import postsRoutes from './routes/posts.routes';
import usersRoutes from './routes/user.routes';

// Valider la configuration
validateConfig();

const app = express();
const PORT = config.port;

// ✅ Initialiser Supabase
const supabase = createClient(config.supabase.url, config.supabase.serviceKey);
console.log('✅ Supabase connecté:', config.supabase.url);

// Middleware
app.use(helmet());
app.use(cors({
  origin: config.security.corsOrigin,
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.security.rateLimitWindowMs,
  max: config.security.rateLimitMaxRequests
});
app.use('/api/', limiter);

// Logging personnalisé
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  next();
});

// Injecter Supabase dans les requêtes
app.use((req, res, next) => {
  req.supabase = supabase;
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/posts', postsRoutes);
app.use('/api/users', usersRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'BELAFRICA Backend',
    environment: config.env,
    version: '1.0.0'
  });
});

// 404 Handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Route non trouvée',
    path: req.originalUrl
  });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('🔥 Erreur serveur:', err);
  
  res.status(err.status || 500).json({
    error: err.message || 'Erreur interne du serveur',
    ...(config.env === 'development' && { stack: err.stack })
  });
});

// Démarrer le serveur
app.listen(PORT, () => {
  console.log(`🚀 Serveur BELAFRICA démarré sur le port ${PORT}`);
  console.log(`🌍 Environnement: ${config.env}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
});

// Types étendus pour Express
declare global {
  namespace Express {
    interface Request {
      supabase: any;
    }
  }
}