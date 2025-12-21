// src/utils/geolocation.ts
import axios from 'axios';

export interface GeolocationResult {
  country: string;
  countryCode: string;
  city: string;
  isp?: string;
  query?: string;
  success: boolean;
}

/**
 * Fonction pour récupérer la VRAIE IP du client
 * ESSENTIEL POUR RENDER/NETLIFY
 */
export function getClientIP(req: any): string {
  // 📌 PRIORITÉ 1 : x-forwarded-for (Render, Netlify, etc.)
  const forwardedFor = req.headers['x-forwarded-for'];
  if (forwardedFor) {
    if (Array.isArray(forwardedFor)) {
      return forwardedFor[0].split(',')[0].trim();
    }
    return forwardedFor.split(',')[0].trim();
  }
  
  // 📌 PRIORITÉ 2 : x-real-ip
  const realIP = req.headers['x-real-ip'];
  if (realIP) {
    if (Array.isArray(realIP)) {
      return realIP[0];
    }
    return realIP;
  }
  
  // 📌 PRIORITÉ 3 : cf-connecting-ip (Cloudflare)
  const cfIP = req.headers['cf-connecting-ip'];
  if (cfIP) {
    return cfIP;
  }
  
  // 📌 DERNIER RECOURS : l'IP de la connexion
  return req.ip || req.connection?.remoteAddress || 'unknown';
}

/**
 * Détecte le pays par IP avec bypass pour développement
 */
export async function detectCountryByIP(ip: string): Promise<GeolocationResult> {
  try {
    // 🎯 RÈGLE IMPORTANTE : En développement local, on simule la Biélorussie
    const isLocalhost = ip === '::1' || ip === '127.0.0.1' || ip.includes('192.168.');
    const isProduction = process.env.NODE_ENV === 'production';
    
    // 🔧 OPTION DE BYPASS CONFIGURABLE
    const GEO_BYPASS_IN_DEV = process.env.GEO_BYPASS_IN_DEV === 'true';
    
    if (isLocalhost && GEO_BYPASS_IN_DEV) {
      console.log('🌍 MODE DÉVELOPPEMENT : Bypass activé -> Simulation Biélorussie');
      return {
        country: 'Belarus',
        countryCode: 'BY',
        city: 'Minsk',
        success: true,
        query: ip
      };
    }
    
    // 📍 EN PRODUCTION OU IP RÉELLE
    console.log('🌍 Détection géographique réelle pour IP:', ip);
    
    try {
      const response = await axios.get(`http://ip-api.com/json/${ip}?fields=status,country,countryCode,city,isp,query`, {
        timeout: 5000
      });
      
      if (response.data.status === 'success') {
        return {
          country: response.data.country,
          countryCode: response.data.countryCode,
          city: response.data.city || 'Unknown',
          isp: response.data.isp,
          query: response.data.query,
          success: true
        };
      }
      
      console.warn('⚠️ ip-api.com a retourné un statut fail:', response.data);
    } catch (apiError: any) {
      console.error('❌ Erreur API géolocalisation:', apiError.message);
    }
    
    // 📍 FALLBACK : Utiliser ipapi.co comme alternative
    console.log('🌍 Tentative avec ipapi.co comme fallback');
    try {
      const fallbackResponse = await axios.get(`https://ipapi.co/${ip}/json/`, {
        timeout: 5000
      });
      
      if (fallbackResponse.data.country_code) {
        return {
          country: fallbackResponse.data.country_name || 'Unknown',
          countryCode: fallbackResponse.data.country_code,
          city: fallbackResponse.data.city || 'Unknown',
          isp: fallbackResponse.data.org,
          query: ip,
          success: true
        };
      }
    } catch (fallbackError: any) {
      console.error('❌ Fallback géolocalisation échoué:', fallbackError.message);
    }
    
    // 💀 MODE DÉGRADÉ : Si tout échoue
    return {
      country: 'Unknown',
      countryCode: 'XX',
      city: 'Unknown',
      success: false,
      query: ip
    };
    
  } catch (error: any) {
    console.error('❌ Erreur fatale géolocalisation:', error.message);
    
    return {
      country: 'Error',
      countryCode: 'XX',
      city: 'Error',
      success: false,
      query: ip
    };
  }
}

/**
 * Valide si un code téléphone correspond à un code pays
 */
export function validatePhoneCountryMatch(
  phoneCountryCode: string, 
  detectedCountryCode: string
): { isValid: boolean; error?: string } {
  
  // 🔧 MAPPING COMPLET DES CODES
  const phoneToCountryMap: Record<string, string[]> = {
    '+33': ['FR'],        // France
    '+32': ['BE'],        // Belgique
    '+49': ['DE'],        // Allemagne
    '+39': ['IT'],        // Italie
    '+34': ['ES'],        // Espagne
    '+41': ['CH'],        // Suisse
    '+44': ['GB', 'UK'],  // Royaume-Uni (GB ou UK)
    '+1': ['CA', 'US'],   // Canada ou USA
    '+7': ['RU', 'KZ'],   // Russie ou Kazakhstan
    '+375': ['BY']        // Biélorussie
  };
  
  // Nettoyer les codes
  const cleanPhoneCode = phoneCountryCode.trim();
  const cleanDetectedCode = detectedCountryCode.toUpperCase().trim();
  
  console.log('🔍 Validation pays:', {
    phoneCode: cleanPhoneCode,
    detectedCode: cleanDetectedCode
  });
  
  // Vérifier si le code téléphone est autorisé
  const allowedCountries = phoneToCountryMap[cleanPhoneCode];
  
  if (!allowedCountries) {
    console.error(`❌ Code téléphone non autorisé: ${cleanPhoneCode}`);
    return {
      isValid: false,
      error: `Code pays ${cleanPhoneCode} non supporté par BELAFRICA`
    };
  }
  
  // Vérifier la correspondance
  const isValid = allowedCountries.includes(cleanDetectedCode);
  
  if (!isValid) {
    console.warn('⚠️ Correspondance échouée:', {
      phoneCode: cleanPhoneCode,
      detected: cleanDetectedCode,
      allowed: allowedCountries
    });
  }
  
  return {
    isValid,
    ...(!isValid && {
      error: `Vous semblez être en ${detectedCountryCode}, mais vous utilisez un numéro ${cleanPhoneCode}`
    })
  };
}