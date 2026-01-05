// src/controllers/posts.controller.ts
import { Request, Response } from 'express';
import { getSupabaseService } from '../services/supabase.factory';

export class PostsController {
  // ✅ RÉCUPÉRER les posts nationaux
  async getNationalPosts(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: 'Non autorisé' });
      }

      const supabase = getSupabaseService();
      
      // Récupérer l'utilisateur pour sa communauté
      const user = await supabase.getUserById(userId);
      if (!user) {
        return res.status(404).json({ error: 'Utilisateur non trouvé' });
      }

      const posts = await supabase.getCommunityPosts(user.community, 'national');

      res.json({
        success: true,
        posts,
        community: user.community,
        count: posts.length
      });

    } catch (error: any) {
      console.error('🔥 Erreur getNationalPosts:', error);
      res.status(500).json({
        error: 'Erreur lors de la récupération des posts'
      });
    }
  }

  // ✅ RÉCUPÉRER les posts internationaux
  async getInternationalPosts(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: 'Non autorisé' });
      }

      const supabase = getSupabaseService();
      const posts = await supabase.getInternationalPosts();

      res.json({
        success: true,
        posts,
        count: posts.length
      });

    } catch (error: any) {
      console.error('🔥 Erreur getInternationalPosts:', error);
      res.status(500).json({
        error: 'Erreur lors de la récupération des posts'
      });
    }
  }

  // ✅ CRÉER un post - CORRECTION ICI !
  async createPost(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const { content, imageUrls, visibility } = req.body;

      if (!userId || !content || !visibility) {
        return res.status(400).json({
          error: 'Contenu et visibilité requis'
        });
      }

      const supabase = getSupabaseService();
      
      // Récupérer l'utilisateur
      const user = await supabase.getUserById(userId);
      if (!user) {
        return res.status(404).json({ error: 'Utilisateur non trouvé' });
      }

      // Vérifier les permissions
      if (!user.is_admin) {
        return res.status(403).json({ error: 'Permissions insuffisantes' });
      }

      if (visibility === 'national' && !user.admin_permissions?.includes('post_national')) {
        return res.status(403).json({ error: 'Pas de permission pour poster en national' });
      }

      if (visibility === 'international' && !user.admin_permissions?.includes('post_international')) {
        return res.status(403).json({ error: 'Pas de permission pour poster en international' });
      }

      // Calculer la date d'expiration
      const expiresAt = new Date();
      if (visibility === 'national') {
        expiresAt.setHours(expiresAt.getHours() + 48); // 48h
      } else {
        expiresAt.setHours(expiresAt.getHours() + 72); // 72h
      }

      // ✅ CORRECTION : Utilisez l'interface PostData correctement
      const postData = {
        authorId: userId,
        content,
        imageUrls: imageUrls || [],
        visibility,
        community: user.community,
        expiresAt: expiresAt 
      };

      const post = await supabase.createPost(postData);
      res.json({
        success: true,
        message: 'Post créé avec succès',
        post: {
          ...post,
          author: {
            pseudo: user.pseudo,
            avatar_url: user.avatar_url,
            community: user.community
          }
        }
      });

    } catch (error: any) {
      console.error('🔥 Erreur createPost:', error);
      res.status(500).json({
        error: 'Erreur lors de la création du post'
      });
    }
  }

  // ✅ AIMER un post
  async toggleLike(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const { id } = req.params;

      if (!userId || !id) {
        return res.status(400).json({
          error: 'Données manquantes'
        });
      }

      const supabase = getSupabaseService();
      const result = await supabase.togglePostLike(id, userId);

      res.json({
        success: true,
        liked: result.liked,
        likesCount: result.likesCount
      });

    } catch (error: any) {
      console.error('🔥 Erreur toggleLike:', error);
      res.status(500).json({
        error: 'Erreur lors du like'
      });
    }
  }

  // ✅ SUPPRIMER un post
  async deletePost(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const { id } = req.params;

      if (!userId || !id) {
        return res.status(400).json({
          error: 'Données manquantes'
        });
      }

      const supabase = getSupabaseService();
      
      // Vérifier que l'utilisateur est admin
      const user = await supabase.getUserById(userId);
      if (!user || !user.is_admin) {
        return res.status(403).json({ error: 'Permissions insuffisantes' });
      }

      // Vérifier que le post appartient à l'utilisateur ou qu'il est super-admin
      const post = await supabase.getPostById(id);
      if (!post) {
        return res.status(404).json({ error: 'Post non trouvé' });
      }

      if (post.author_id !== userId && user.admin_level !== 'super') {
        return res.status(403).json({ error: 'Vous ne pouvez pas supprimer ce post' });
      }

      await supabase.deletePost(id);

      res.json({
        success: true,
        message: 'Post supprimé avec succès'
      });

    } catch (error: any) {
      console.error('🔥 Erreur deletePost:', error);
      res.status(500).json({
        error: 'Erreur lors de la suppression du post'
      });
    }
  }
}

export const postsController = new PostsController();

export { getSupabaseService };