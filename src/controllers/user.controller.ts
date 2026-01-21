// src/controllers/user.controller.ts
/* 

    * BELAFRICA - Plateforme diaspora africaine
    * Copyright © 2025 Rollin Loic Tianga. Tous droits réservés.
    * Code source confidentiel - Usage interdit sans autorisation
    */
import { Request, Response } from 'express';
import { getSupabaseService } from '../services/supabase.factory';

export class UserController {
  // ✅ RÉCUPÉRER le profil utilisateur
  async getProfile(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: 'Non autorisé' });
      }
      const supabase = getSupabaseService();
      const user = await supabase.getUserById(userId);

      if (!user) {
        return res.status(404).json({ error: 'Utilisateur non trouvé' });
      }

      const { password, ...safeUser } = user;

      res.json({
        success: true,
        user: safeUser
      });

    } catch (error: any) {
      console.error('🔥 Erreur getProfile:', error);
      res.status(500).json({
        error: 'Erreur lors de la récupération du profil'
      });
    }
  }

  // ✅ METTRE À JOUR le profil
  async updateProfile(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { pseudo, email, bio, gender, profession, interests } = req.body;

      if (!userId) {
        return res.status(401).json({ error: 'Non autorisé' });
      }

      const supabase = getSupabaseService();
      
      if (pseudo) {
        const existingUser = await supabase.findUserByPseudo(pseudo, userId);
        if (existingUser) {
          return res.status(400).json({
            error: 'Ce pseudo est déjà utilisé'
          });
        }
      }

      const updateData: any = {};
      if (pseudo) updateData.pseudo = pseudo;
      if (email) updateData.email = email;
      if (bio !== undefined) updateData.bio = bio;
      if (gender) updateData.gender = gender;
      if (profession) updateData.profession = profession;
      if (interests) updateData.interests = interests;

      const updatedUser = await supabase.updateUser(userId, updateData);

      res.json({
        success: true,
        message: 'Profil mis à jour avec succès',
        user: updatedUser
      });

    } catch (error: any) {
      console.error('🔥 Erreur updateProfile:', error);
      res.status(500).json({
        error: 'Erreur lors de la mise à jour du profil'
      });
    }
  }

  // ✅ METTRE À JOUR l'avatar
  async updateAvatar(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { avatarUrl } = req.body;

      if (!userId || !avatarUrl) {
        return res.status(400).json({
          error: 'URL de l\'avatar requise'
        });
      }

      const supabase = getSupabaseService();
      const updatedUser = await supabase.updateUser(userId, { avatar_url: avatarUrl });

      res.json({
        success: true,
        message: 'Avatar mis à jour avec succès',
        user: updatedUser
      });

    } catch (error: any) {
      console.error('🔥 Erreur updateAvatar:', error);
      res.status(500).json({
        error: 'Erreur lors de la mise à jour de l\'avatar'
      });
    }
  }

  // ✅ RÉCUPÉRER les utilisateurs de la communauté
  async getCommunityUsers(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: 'Non autorisé' });
      }

      const supabase = getSupabaseService();
      
      const user = await supabase.getUserById(userId);
      if (!user) {
        return res.status(404).json({ error: 'Utilisateur non trouvé' });
      }

      const users = await supabase.getCommunityUsers(user.community, userId);

      res.json({
        success: true,
        users,
        count: users.length,
        community: user.community
      });

    } catch (error: any) {
      console.error('🔥 Erreur getCommunityUsers:', error);
      res.status(500).json({
        error: 'Erreur lors de la récupération des utilisateurs'
      });
    }
  }

  // ✅ RÉCUPÉRER un utilisateur par ID
  async getUserById(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { id } = req.params;

      if (!userId || !id) {
        return res.status(400).json({
          error: 'ID utilisateur requis'
        });
      }

      const supabase = getSupabaseService();
      
      const requester = await supabase.getUserById(userId);
      if (!requester) {
        return res.status(404).json({ error: 'Utilisateur non trouvé' });
      }

      const targetUser = await supabase.getUserById(id);
      if (!targetUser) {
        return res.status(404).json({ error: 'Utilisateur cible non trouvé' });
      }

      if (requester.community !== targetUser.community) {
        return res.status(403).json({ error: 'Accès non autorisé' });
      }

      const { password, email, phone_number, ...safeUser } = targetUser;

      res.json({
        success: true,
        user: safeUser
      });

    } catch (error: any) {
      console.error('🔥 Erreur getUserById:', error);
      res.status(500).json({
        error: 'Erreur lors de la récupération de l\'utilisateur'
      });
    }
  }
}

export const userController = new UserController();

export { getSupabaseService };