/*
 * BELAFRICA - Plateforme diaspora africaine
 * Copyright © 2025 Rollin Loic Tianga. Tous droits réservés.
 * Code source confidentiel - Usage interdit sans autorisation
 */

export interface UserPayload {
  admin_level: string;
  id: string;
  pseudo: string;
  community: string;
  is_admin: boolean;
  admin_permissions?: string[];
}
