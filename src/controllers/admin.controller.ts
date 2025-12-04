import { Request, Response } from 'express';
import { AdminService } from '../services/admin.service';

export class AdminController {
  private adminService = new AdminService();

  async generateAdminCode(req: Request, res: Response) {
    try {
      const { community, permissions, expiresInHours } = req.body;
      const userId = (req as any).user?.id; // From auth middleware
      
      if (!community || !permissions) {
        return res.status(400).json({
          success: false,
          error: 'Communauté et permissions requises'
        });
      }

      const result = await this.adminService.generateAdminCode(community, permissions, expiresInHours, userId);
      res.json(result);
      
    } catch (error: any) {
      console.error('🔥 Erreur generateAdminCode:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur interne du serveur'
      });
    }
  }

  async validateAdminCode(req: Request, res: Response) {
    try {
      const { code } = req.body;
      const userId = (req as any).user?.id;
      
      if (!code) {
        return res.status(400).json({
          success: false,
          error: 'Code requis'
        });
      }

      const result = await this.adminService.validateAdminCode(code, userId);
      res.json(result);
      
    } catch (error: any) {
      console.error('🔥 Erreur validateAdminCode:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur interne du serveur'
      });
    }
  }

  async getAdminRequests(req: Request, res: Response) {
    try {
      const requests = await this.adminService.getAdminRequests();
      res.json({
        success: true,
        requests
      });
      
    } catch (error: any) {
      console.error('🔥 Erreur getAdminRequests:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur interne du serveur'
      });
    }
  }

  async updateRequestStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      if (!id || !status) {
        return res.status(400).json({
          success: false,
          error: 'ID et status requis'
        });
      }

      const result = await this.adminService.updateRequestStatus(id, status);
      
      if (!result.success) {
        return res.status(400).json(result);
      }

      res.json(result);
      
    } catch (error: any) {
      console.error('🔥 Erreur updateRequestStatus:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur interne du serveur'
      });
    }
  }
}