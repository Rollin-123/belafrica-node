"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeolocationService = void 0;
exports.getGeolocationService = getGeolocationService;
const axios_1 = __importDefault(require("axios"));
class GeolocationService {
    constructor() {
        this.ipApiUrl = process.env.IP_API_URL || 'http://ip-api.com/json';
        this.ipifyUrl = process.env.IPIFY_URL || 'https://api.ipify.org?format=json';
    }
    async detectLocationByIP(ip) {
        try {
            let clientIP = ip;
            if (!clientIP || clientIP === '::1' || clientIP === '127.0.0.1') {
                const ipResponse = await axios_1.default.get(this.ipifyUrl);
                clientIP = ipResponse.data.ip;
            }
            console.log('🌍 Détection localisation IP:', clientIP);
            const geoResponse = await axios_1.default.get(`${this.ipApiUrl}/${clientIP}`);
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
        }
        catch (error) {
            console.error('❌ Erreur géolocalisation:', error.message);
            return {
                ip: ip || 'inconnu',
                country: 'Inconnu',
                countryCode: 'XX',
                city: 'Inconnu',
                isProxy: false
            };
        }
    }
    validatePhoneCountryMatch(phoneCountryCode, detectedCountryCode) {
        const phoneToCountryMap = {
            '+33': ['FR'],
            '+32': ['BE'],
            '+49': ['DE'],
            '+39': ['IT'],
            '+34': ['ES'],
            '+41': ['CH'],
            '+44': ['GB'],
            '+1': ['CA'],
            '+7': ['RU'],
            '+375': ['BY']
        };
        const allowedCountries = phoneToCountryMap[phoneCountryCode];
        if (!allowedCountries) {
            console.warn(`⚠️ Code téléphone non mappé: ${phoneCountryCode}`);
            return false;
        }
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
    async validateUserLocation(phoneCountryCode, userIP) {
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
        }
        catch (error) {
            console.error('❌ Erreur validation localisation:', error);
            return {
                isValid: false,
                error: error.message,
                ip: userIP
            };
        }
    }
    getAllowedCountriesForPhoneCode(phoneCountryCode) {
        const phoneToCountryMap = {
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
    isCountryAllowed(countryCode) {
        const allowedCountries = ['FR', 'BE', 'DE', 'IT', 'ES', 'CH', 'GB', 'CA', 'RU', 'BY'];
        return allowedCountries.includes(countryCode.toUpperCase());
    }
}
exports.GeolocationService = GeolocationService;
let geolocationInstance;
function getGeolocationService() {
    if (!geolocationInstance) {
        geolocationInstance = new GeolocationService();
    }
    return geolocationInstance;
}
//# sourceMappingURL=geolocation.service.js.map