import express from 'express';
import { Post } from '../models/Post.model';
import { User } from '../models/User.model';

const router = express.Router();

// ✅ RÉCUPÉRER LES POSTS NATIONAUX
router.get('/national', async (req, res) => {
  try {
    const { community } = req.query;

    if (!community) {
      return res.status(400).json({
        success: false,
        error: 'Communauté requise'
      });
    }
    const posts = await Post.find({
      community,
      visibility: 'national',
      isExpired: false,
      expiresAt: { $gt: new Date() }
    })
    .populate('authorId', 'pseudo avatar')
    .sort({ createdAt: -1 })
    .limit(50);

    res.json({
      success: true,
      posts: posts.map(post => ({
        id: post._id,
        authorId: post.authorId,
        authorName: post.authorName,
        authorAvatar: post.authorAvatar,
        content: post.content,
        imageUrls: post.imageUrls,
        visibility: post.visibility,
        community: post.community,
        likes: post.likes,
        createdAt: post.createdAt,
        expiresAt: post.expiresAt,
        isExpired: post.isExpired
      }))
    });

  } catch (error: any) {
    console.error('❌ Erreur récupération posts nationaux:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur interne du serveur'
    });
  }
});

// ✅ RÉCUPÉRER LES POSTS INTERNATIONAUX
router.get('/international', async (req, res) => {
  try {
    const posts = await Post.find({
      visibility: 'international',
      isExpired: false,
      expiresAt: { $gt: new Date() }
    })
    .populate('authorId', 'pseudo avatar')
    .sort({ createdAt: -1 })
    .limit(50);

    res.json({
      success: true,
      posts: posts.map(post => ({
        id: post._id,
        authorId: post.authorId,
        authorName: post.authorName,
        authorAvatar: post.authorAvatar,
        content: post.content,
        imageUrls: post.imageUrls,
        visibility: post.visibility,
        community: post.community,
        likes: post.likes,
        createdAt: post.createdAt,
        expiresAt: post.expiresAt,
        isExpired: post.isExpired
      }))
    });

  } catch (error: any) {
    console.error('❌ Erreur récupération posts internationaux:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur interne du serveur'
    });
  }
});

// ✅ CRÉER UN NOUVEAU POST (Admin seulement)
router.post('/create', async (req, res) => {
  try {
    const { authorId, content, imageUrls, visibility } = req.body;

    if (!authorId || !content || !visibility) {
      return res.status(400).json({
        success: false,
        error: 'Auteur, contenu et visibilité requis'
      });
    }

    // Vérifier que l'utilisateur est admin
    const author = await User.findById(authorId);
    if (!author || !author.isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Seuls les administrateurs peuvent créer des posts'
      });
    }

    const newPost = new Post({
      authorId,
      authorName: author.pseudo,
      authorAvatar: author.avatar,
      content,
      imageUrls: imageUrls || [],
      visibility,
      community: author.community,
      likes: []
    });

    await newPost.save();

    console.log(`✅ Nouveau post créé par ${author.pseudo}`);

    res.status(201).json({
      success: true,
      message: 'Post créé avec succès',
      post: {
        id: newPost._id,
        authorName: newPost.authorName,
        content: newPost.content,
        visibility: newPost.visibility,
        community: newPost.community,
        createdAt: newPost.createdAt
      }
    });

  } catch (error: any) {
    console.error('❌ Erreur création post:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur interne du serveur'
    });
  }
});

// ✅ AIMER/NE PLUS AIMER UN POST
router.post('/:postId/like', async (req, res) => {
  try {
    const { postId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'ID utilisateur requis'
      });
    }

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({
        success: false,
        error: 'Post non trouvé'
      });
    }

    const hasLiked = post.likes.includes(userId as any);
    
    if (hasLiked) {
      post.likes = post.likes.filter(id => id.toString() !== userId);
    } else {
      post.likes.push(userId as any);
    }

    await post.save();

    res.json({
      success: true,
      liked: !hasLiked,
      likesCount: post.likes.length
    });

  } catch (error: any) {
    console.error('❌ Erreur like post:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur interne du serveur'
    });
  }
});

export default router;