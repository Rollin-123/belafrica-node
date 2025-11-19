import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

// Routes (Note: .js extension is needed for direct import in some environments, or configure tsconfig for moduleResolution)
import authRoutes from './routes/auth.routes';
import adminRoutes from './routes/admin.routes';
import postsRoutes from './routes/posts.routes';
import usersRoutes from './routes/users.routes';

// Chargement des variables d'environnement
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: ['http://localhost:4200', 'https://belafrica-version1.netlify.app'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes de base
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/posts', postsRoutes);
app.use('/api/users', usersRoutes);

// Route de santé
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'BELAFRICA API is running!',
    timestamp: new Date().toISOString()
  });
});

// Connexion à MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/belafrica';

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('✅ Connecté à MongoDB');
    
    // Démarrer le serveur
    app.listen(PORT, () => {
      console.log(`🚀 Serveur BELAFRICA démarré sur le port ${PORT}`);
      console.log(`📡 API disponible sur: http://localhost:${PORT}/api`);
      console.log(`❤️  Route santé: http://localhost:${PORT}/api/health`);
    });
  })
  .catch((error) => {
    console.error('❌ Erreur connexion MongoDB:', error);
    process.exit(1);
  });

// Gestion des erreurs globales
process.on('unhandledRejection', (err) => {
  console.error('❌ Erreur non gérée:', err);
  process.exit(1);
});

export default app;