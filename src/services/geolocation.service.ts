// src/services/geolocation.service.ts
/* 
    * BELAFRICA - Plateforme diaspora africaine
    * Copyright © 2025 Rollin Loic Tianga. Tous droits réservés.
    * Code source confidentiel - Usage interdit sans autorisation
    */
import axios from 'axios';

export interface GeolocationData {
  country: string;
  countryCode: string;
  city?: string;
  region?: string;
  timezone?: string;
  isProxy?: boolean;
  ip?: string;
}

export class GeolocationService {
  private ipApiUrl = process.env.IP_API_URL || 'http://ip-api.com/json';
  private ipifyUrl = process.env.IPIFY_URL || 'https://api.ipify.org?format=json';

  async detectLocationByIP(ip?: string): Promise<GeolocationData> {
    try {
      // Récupérer l'IP si non fournie
      let clientIP = ip;
      
      if (!clientIP || clientIP === '::1' || clientIP === '127.0.0.1') {
        // En local ou IP invalide, utiliser ipify
        const ipResponse = await axios.get(this.ipifyUrl);
        clientIP = ipResponse.data.ip;
      }

      console.log('🌍 Détection localisation IP:', clientIP);

      // Récupérer les infos de géolocalisation
      const geoResponse = await axios.get(`${this.ipApiUrl}/${clientIP}`);
      const geoData = geoResponse.data;

      if (geoData.status === 'fail') {
        throw new Error(`Échec géolocalisation: ${geoData.message}`);
      }

      return {
        ip: clientIP,
        country: geoData.country,
        countryCode: geoData.countryCode,
        city: geoData.city,
        region: geoData.regionName,
        timezone: geoData.timezone,
        isProxy: geoData.proxy || geoData.hosting || false
      };
      
    } catch (error: any) {
      console.error('❌ Erreur géolocalisation:', error.message);
      
      // Retourner des valeurs par défaut en cas d'erreur
      return {
        ip: ip || 'inconnu',
        country: 'Inconnu',
        countryCode: 'XX',
        city: 'Inconnu',
        isProxy: false
      };
    }
  }

  // ✅ VÉRIFIER la correspondance pays/téléphone (STRICTE)
  validatePhoneCountryMatch(phoneCountryCode: string, detectedCountryCode: string): boolean {
    // Mapping des codes téléphoniques vers codes pays ISO
    const phoneToCountryMap: Record<string, string[]> = {
      '+33': ['FR'], // France
      '+32': ['BE'], // Belgique
      '+49': ['DE'], // Allemagne
      '+39': ['IT'], // Italie
      '+34': ['ES'], // Espagne
      '+41': ['CH'], // Suisse
      '+44': ['GB'], // Royaume-Uni
      '+1': ['CA'], // Canada
      '+7': ['RU'], // Russie
      '+375': ['BY'] // Biélorussie
    };

    const allowedCountries = phoneToCountryMap[phoneCountryCode];
    
    if (!allowedCountries) {
      console.warn(`⚠️ Code téléphone non mappé: ${phoneCountryCode}`);
      return false; // REFUSER les codes non autorisés
    }

    // Nettoyer le code pays détecté
    const cleanDetectedCode = detectedCountryCode.toUpperCase().trim();
    
    const isValid = allowedCountries.includes(cleanDetectedCode);
    
    console.log('🌍 Validation pays:', {
      phoneCode: phoneCountryCode,
      detected: cleanDetectedCode,
      allowed: allowedCountries,
      isValid
    });
    
    return isValid;
  }

  // ✅ VÉRIFIER si l'utilisateur est dans un pays autorisé
  async validateUserLocation(phoneCountryCode: string, userIP?: string): Promise<{
    isValid: boolean;
    detectedCountry?: string;
    detectedCountryCode?: string;
    ip?: string;
    error?: string;
  }> {
    try {
      const location = await this.detectLocationByIP(userIP);
      
      const isValid = this.validatePhoneCountryMatch(phoneCountryCode, location.countryCode);
      
      return {
        isValid,
        detectedCountry: location.country,
        detectedCountryCode: location.countryCode,
        ip: location.ip,
        ...(location.isProxy && { warning: 'Proxy/VPN détecté' })
      };
      
    } catch (error: any) {
      console.error('❌ Erreur validation localisation:', error);
      
      return {
        isValid: false, // En cas d'erreur, on refuse (sécurité)
        error: error.message,
        ip: userIP
      };
    }
  }

  // ✅ OBTENIR la liste des pays autorisés pour un code téléphone
  getAllowedCountriesForPhoneCode(phoneCountryCode: string): string[] {
    const phoneToCountryMap: Record<string, string[]> = {
      '+33': ['France'],
      '+32': ['Belgique'],
      '+49': ['Allemagne'],
      '+39': ['Italie'],
      '+34': ['Espagne'],
      '+41': ['Suisse'],
      '+44': ['Royaume-Uni'],
      '+1': ['Canada'],
      '+7': ['Russie'],
      '+375': ['Biélorussie']
    };

    return phoneToCountryMap[phoneCountryCode] || [];
  }

  // ✅ VÉRIFIER si un pays est autorisé
  isCountryAllowed(countryCode: string): boolean {
    const allowedCountries = ['FR', 'BE', 'DE', 'IT', 'ES', 'CH', 'GB', 'CA', 'RU', 'BY'];
    return allowedCountries.includes(countryCode.toUpperCase());
  }
}

// Singleton
let geolocationInstance: GeolocationService;

export function getGeolocationService(): GeolocationService {
  if (!geolocationInstance) {
    geolocationInstance = new GeolocationService();
  }
  
  return geolocationInstance;
}
