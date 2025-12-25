"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyCountryByIp = void 0;
const axios_1 = __importDefault(require("axios"));
const constants_1 = require("../utils/constants");
/**
 * Middleware pour vérifier que l'IP de l'utilisateur correspond au pays attendu.
 * Le pays attendu est passé en paramètre dans le corps de la requête.
 * @param expectedCountrySource - La clé dans `req.body` qui contient le code pays attendu (ex: '+33').
 */
const verifyCountryByIp = (expectedCountrySource) => {
    return async (req, res, next) => {
        // ✅ Logique de bypass finale : Lire la variable d'environnement directement ici
        const bypassGeo = process.env.GEO_BYPASS_IN_DEV === 'true';
        if (bypassGeo) {
            console.log(' GÉO: Bypass de la vérification en mode développement.');
            return next();
        }
        const testIp = req.headers['x-test-ip'];
        const ip = testIp || req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress;
        // Le reste du code est bon, on ne le touche pas.
        try {
            // Appel à l'API ip-api.com
            const response = await axios_1.default.get(`http://ip-api.com/json/${ip}`);
            const geo = response.data;
            if (geo.status !== 'success') {
                console.warn(`GÉO: Échec de la localisation pour l'IP ${ip}. Raison: ${geo.message}`);
                // ✅ Sécurité renforcée : si l'API de géo-ip échoue, on bloque.
                return res.status(403).json({ success: false, error: 'Votre localisation n\'a pas pu être vérifiée. Veuillez réessayer.' });
            }
            const detectedIpCountry = geo.countryCode; // Ex: 'FR', 'BE', 'DE'
            console.log(` GÉO: IP=${ip}, Pays détecté=${detectedIpCountry} (${geo.country})`);
            const expectedPhoneCode = req.body[expectedCountrySource];
            if (!expectedPhoneCode) {
                return res.status(400).json({ success: false, error: `Le code pays attendu ('${expectedCountrySource}') est manquant.` });
            }
            // Récupérer les codes ISO correspondants au code téléphone
            const allowedIsoCodes = constants_1.APP_CONSTANTS.PHONE_COUNTRY_MAPPING[expectedPhoneCode];
            if (!allowedIsoCodes || !allowedIsoCodes.includes(detectedIpCountry)) {
                console.warn(` GÉO: Tentative de fraude détectée ! IP de ${detectedIpCountry}, mais code pays attendu pour ${allowedIsoCodes.join('/')}.`);
                return res.status(403).json({ success: false, error: 'La localisation de votre connexion ne correspond pas au pays de votre numéro. L\'utilisation de VPN est interdite.' });
            }
            console.log(' GÉO: Vérification de la localisation réussie.');
            next();
        }
        catch (error) {
            console.error("❌ Erreur critique dans le middleware de géolocalisation:", error.message);
            // ✅ Sécurité renforcée : si l'appel à l'API plante, on bloque.
            return res.status(500).json({ success: false, error: 'Erreur du service de géolocalisation.' });
        }
    };
};
exports.verifyCountryByIp = verifyCountryByIp;
//# sourceMappingURL=geoip.middleware.js.map