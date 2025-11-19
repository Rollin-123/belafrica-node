import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import helmet from 'helmet';
import morgan from 'morgan';

// Routes
import authRoutes from './routes/auth.routes';
import adminRoutes from './routes/admin.routes';
import postsRoutes from './routes/posts.routes';
import usersRoutes from './routes/users.routes';

// Middlewares
import errorHandler from './middleware/errorHandler.middleware';
import requestLogger from './middleware/requestLogger.middleware';

// Chargement des variables d'environnement
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/belafrica';

// Middlewares de sécurité
app.use(helmet());
app.use(cors({
  origin: [
    'http://localhost:4200', 
    'https://belafrica-version1.netlify.app',
    // 'https://belafrica.netlify.app'
  ],
  credentials: true
}));

// Middlewares de parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging
app.use(morgan('combined'));
app.use(requestLogger);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/posts', postsRoutes);
app.use('/api/users', usersRoutes);

// Route de santé
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: '🚀 BELAFRICA API is running!',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Route 404
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route non trouvée'
  });
});

// Gestionnaire d'erreurs global
app.use(errorHandler);

// Connexion à MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connecté à MongoDB avec succès');
  } catch (error) {
    console.error('❌ Erreur de connexion à MongoDB:', error);
    process.exit(1);
  }
};

// Démarrage du serveur
const startServer = async () => {
  await connectDB();
  
  app.listen(PORT, () => {
    console.log(`\n🎉 Serveur BELAFRICA démarré !`);
    console.log(`📍 Port: ${PORT}`);
    console.log(`🌐 Environnement: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📡 API: http://localhost:${PORT}/api`);
    console.log(`❤️  Santé: http://localhost:${PORT}/api/health`);
    console.log(`\n🚀 Prêt à recevoir des requêtes...\n`);
  });
};

// Gestion propre de l'arrêt
process.on('SIGINT', async () => {
  console.log('\n🛑 Arrêt du serveur...');
  await mongoose.connection.close();
  process.exit(0);
});

process.on('unhandledRejection', (err) => {
  console.error('❌ Erreur non gérée:', err);
  process.exit(1);
});

startServer();

export default app;