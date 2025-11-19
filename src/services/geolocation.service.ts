import axios from 'axios';

export interface GeolocationData {
  ip: string;
  country: string;
  countryCode: string;
  region: string;
  regionName: string;
  city: string;
  timezone: string;
  lat: number;
  lon: number;
  isp: string;
}

class GeolocationService {
  private apiUrl = 'http://ip-api.com/json';

  async getLocationByIP(ip: string): Promise<GeolocationData | null> {
    try {
      // Si IP locale, utiliser une IP de test ou service différent
      if (ip === '127.0.0.1' || ip === '::1') {
        return this.getFallbackLocation();
      }

      const response = await axios.get(`${this.apiUrl}/${ip}?fields=status,message,country,countryCode,region,regionName,city,timezone,lat,lon,isp`);
      
      if (response.data.status === 'success') {
        return {
          ip,
          country: response.data.country,
          countryCode: response.data.countryCode,
          region: response.data.region,
          regionName: response.data.regionName,
          city: response.data.city,
          timezone: response.data.timezone,
          lat: response.data.lat,
          lon: response.data.lon,
          isp: response.data.isp
        };
      }

      return this.getFallbackLocation();
    } catch (error) {
      console.error('❌ Erreur géolocalisation:', error);
      return this.getFallbackLocation();
    }
  }

  private getFallbackLocation(): GeolocationData {
    return {
      ip: 'unknown',
      country: 'France',
      countryCode: 'FR',
      region: 'Île-de-France',
      regionName: 'Île-de-France',
      city: 'Paris',
      timezone: 'Europe/Paris',
      lat: 48.8566,
      lon: 2.3522,
      isp: 'Unknown'
    };
  }

  // Vérifier si le pays est autorisé
  isCountryAllowed(countryCode: string): boolean {
    const allowedCountries = ['FR', 'BE', 'DE', 'IT', 'ES', 'CH', 'GB', 'CA', 'RU', 'BY'];
    return allowedCountries.includes(countryCode.toUpperCase());
  }

  // Valider la cohérence pays numéro/pays géolocalisation
  validateCountryConsistency(phoneCountryCode: string, detectedCountryCode: string): boolean {
    const countryMapping: { [key: string]: string[] } = {
      '33': ['FR'], // France
      '32': ['BE'], // Belgique
      '49': ['DE'], // Allemagne
      '39': ['IT'], // Italie
      '34': ['ES'], // Espagne
      '41': ['CH'], // Suisse
      '44': ['GB'], // Royaume-Uni
      '1': ['CA', 'US'], // Canada/US
      '7': ['RU', 'KZ'], // Russie/Kazakhstan
      '375': ['BY'] // Biélorussie
    };

    const allowedCountries = countryMapping[phoneCountryCode] || [];
    return allowedCountries.includes(detectedCountryCode.toUpperCase());
  }
}

export const geolocationService = new GeolocationService();
export default GeolocationService;