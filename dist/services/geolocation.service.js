"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeolocationService = void 0;
exports.getGeolocationService = getGeolocationService;
// src/services/geolocation.service.ts
/*
    * BELAFRICA - Plateforme diaspora africaine
    * Copyright © 2025 Rollin Loic Tianga. Tous droits réservés.
    * Code source confidentiel - Usage interdit sans autorisation
    */
const axios_1 = __importDefault(require("axios"));
class GeolocationService {
    constructor() {
        this.ipApiUrl = process.env.IP_API_URL || 'http://ip-api.com/json';
        this.proxyCheckUrl = 'http://proxycheck.io/v2';
        this.proxyCheckApiKey = process.env.PROXYCHECK_API_KEY;
    }
    async detectLocationByIP(ip) {
        try {
            let clientIP = ip;
            if (!clientIP || clientIP === '::1' || clientIP === '127.0.0.1') {
                clientIP = '8.8.8.8';
            }
            console.log('🌍 Détection localisation IP:', clientIP);
            const [geoResponse, proxyResponse] = await Promise.all([
                axios_1.default.get(`${this.ipApiUrl}/${clientIP}?fields=status,message,country,countryCode,city,regionName,timezone`),
                axios_1.default.get(`${this.proxyCheckUrl}/${clientIP}?vpn=1&key=${this.proxyCheckApiKey}`)
            ]);
            const geoData = geoResponse.data;
            if (geoData.status === 'fail') {
                throw new Error(`Échec géolocalisation: ${geoData.message}`);
            }
            const proxyData = proxyResponse.data;
            if (proxyData.status !== 'ok') {
                console.warn(`⚠️ Avertissement ProxyCheck: ${proxyData.message || 'Erreur API'}`);
            }
            const isProxy = proxyData[clientIP]?.proxy === 'yes';
            return {
                ip: clientIP,
                country: geoData.country,
                countryCode: geoData.countryCode,
                city: geoData.city,
                region: geoData.regionName,
                timezone: geoData.timezone,
                isProxy: isProxy
            };
        }
        catch (error) {
            console.error('❌ Erreur géolocalisation:', error.message);
            // En cas d'erreur (ex: l'API est en panne), on ne bloque pas l'utilisateur
            // mais on log l'erreur. Pour une sécurité maximale, on pourrait retourner isProxy: true ici.
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
    validatePhoneCountryMatch(phoneCountryCode, detectedCountryCode) {
        // Mapping des codes téléphoniques vers codes pays ISO
        const phoneToCountryMap = {
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
                isValid: false, // En cas d'erreur, on refuse (sécurité)
                error: error.message,
                ip: userIP
            };
        }
    }
    // ✅ OBTENIR la liste des pays autorisés pour un code téléphone
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
    // ✅ VÉRIFIER si un pays est autorisé
    isCountryAllowed(countryCode) {
        const allowedCountries = ['FR', 'BE', 'DE', 'IT', 'ES', 'CH', 'GB', 'CA', 'RU', 'BY'];
        return allowedCountries.includes(countryCode.toUpperCase());
    }
}
exports.GeolocationService = GeolocationService;
// Singleton
let geolocationInstance;
function getGeolocationService() {
    if (!geolocationInstance) {
        geolocationInstance = new GeolocationService();
    }
    return geolocationInstance;
}
//# sourceMappingURL=geolocation.service.js.map