import { Request, Response } from 'express';
import { AdminService } from '../services/admin.service'; 

export class AdminController {
  private adminService: AdminService;

  constructor() {
    this.adminService = new AdminService();
  }

  async generateCode(req: Request, res: Response) {
    try {
      const { community, permissions } = req.body;
      
      if (!community) {
        return res.status(400).json({
          success: false,
          error: 'Communauté requise'
        });
      }

      const result = await this.adminService.generateAdminCode(community, permissions);
      
      if (result.success) {
        res.json({
          success: true,
          code: result.code,
          message: 'Code admin généré'
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }
    } catch (error: any) {
      console.error('❌ Erreur génération code admin:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur interne'
      });
    }
  }

  async validateCode(req: Request, res: Response) {
    try {
      const { code, userId } = req.body;
      
      if (!code || !userId) {
        return res.status(400).json({
          success: false,
          error: 'Code et userId requis'
        });
      }

      const result = await this.adminService.validateAdminCode(code, userId);
      
      if (result.success) {
        res.json({
          success: true,
          valid: true,
          permissions: result.permissions,
          message: 'Code admin validé'
        });
      } else {
        res.status(401).json({
          success: false,
          error: result.error
        });
      }
    } catch (error: any) {
      console.error('❌ Erreur validation code admin:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur interne'
      });
    }
  }

   async getAdminRequests(req: Request, res: Response) {
    try {
      const supabase = (req as any).supabase;
      const userId = (req as any).userId;

      // Vérifier que l'utilisateur est admin
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('is_admin')
        .eq('id', userId)
        .single();

      if (userError || !user?.is_admin) {
        return res.status(403).json({
          success: false,
          error: 'Permissions insuffisantes'
        });
      }

      const { data: requests, error } = await supabase
        .from('admin_requests')
        .select('*')
        .eq('status', 'pending')
        .order('submitted_at', { ascending: true });

      if (error) throw error;

      res.json({
        success: true,
        requests: requests || []
      });
    } catch (error: any) {
      console.error('❌ Erreur récupération demandes admin:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  async updateRequestStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const supabase = (req as any).supabase;

      if (!['approved', 'rejected'].includes(status)) {
        return res.status(400).json({
          success: false,
          error: 'Statut invalide'
        });
      }

      const { error } = await supabase
        .from('admin_requests')
        .update({
          status,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      res.json({
        success: true,
        message: `Demande ${status === 'approved' ? 'approuvée' : 'rejetée'}`
      });
    } catch (error: any) {
      console.error('❌ Erreur mise à jour demande:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}