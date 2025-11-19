import axios from 'axios';

export class GeolocationService {
  // ✅ DÉTECTER LE PAYS PAR IP
  static async getCountryByIP(ip: string): Promise<{ countryCode: string; countryName: string }> {
    try {
      // Service gratuit de géolocalisation par IP
      const response = await axios.get(`http://ip-api.com/json/${ip}`);
      const data = response.data;

      if (data.status === 'success') {
        return {
          countryCode: data.countryCode,
          countryName: data.country
        };
      }
      return {
        countryCode: 'FR',
        countryName: 'France'
      };

    } catch (error) {
      console.error('❌ Erreur géolocalisation:', error);
      return {
        countryCode: 'FR', 
        countryName: 'France'
      };
    }
  }

  // ✅ VALIDER LE PAYS AUTORISÉ
  static isCountryAllowed(countryCode: string): boolean {
    const allowedCountries = [
      'FR', 'BE', 'DE', 'IT', 'ES', 'CH', 'GB', 
      'CA', 'RU', 'BY' 
    ];
    
    return allowedCountries.includes(countryCode.toUpperCase());
  }

  // ✅ VALIDER LA CORRESPONDANCE TÉLÉPHONE/PAYS
  static validatePhoneCountry(phoneNumber: string, countryCode: string): boolean {
    const countryPrefixes: { [key: string]: string } = {
      'FR': '+33', 'BE': '+32', 'DE': '+49', 'IT': '+39',
      'ES': '+34', 'CH': '+41', 'GB': '+44', 'CA': '+1',
      'RU': '+7', 'BY': '+375'
    };

    const expectedPrefix = countryPrefixes[countryCode];
    return phoneNumber.startsWith(expectedPrefix);
  }
}