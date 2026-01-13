"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.africanCountries = exports.countryNames = exports.countryMapping = exports.GEO_VALIDATION_ENABLED = exports.APP_CONSTANTS = void 0;
// src/utils/constants.ts
/*
    * BELAFRICA - Plateforme diaspora africaine
    * Copyright © 2025 Rollin Loic Tianga. Tous droits réservés.
    * Code source confidentiel - Usage interdit sans autorisation
    */
exports.APP_CONSTANTS = {
    APP_NAME: 'BELAFRICA',
    VERSION: '1.0.0',
    OTP_EXPIRY_MINUTES: 10,
    POST_NATIONAL_EXPIRY_HOURS: 48,
    POST_INTERNATIONAL_EXPIRY_HOURS: 72,
    ADMIN_CODE_EXPIRY_HOURS: 72,
    // Limites
    MAX_POST_LENGTH: 1000,
    MAX_IMAGE_SIZE_MB: 5,
    MAX_FILE_SIZE_MB: 10,
    // Configuration géolocalisation
    GEO_VALIDATION_ENABLED: process.env.GEO_VALIDATION_ENABLED
        ? process.env.GEO_VALIDATION_ENABLED === 'true'
        : true,
    // Pays autorisés (code téléphone -> codes ISO)
    PHONE_COUNTRY_MAPPING: {
        '+33': ['FR'], // France
        '+32': ['BE'], // Belgique
        '+49': ['DE'], // Allemagne
        '+39': ['IT'], // Italie
        '+34': ['ES'], // Espagne
        '+41': ['CH'], // Suisse
        '+44': ['GB', 'UK'], // Royaume-Uni
        '+1': ['CA', 'US'], // Canada ou USA
        '+7': ['RU', 'KZ'], // Russie ou Kazakhstan
        '+375': ['BY'] // Biélorussie
    },
    // Noms des pays pour affichage
    COUNTRY_NAMES: {
        '+33': 'France',
        '+32': 'Belgique',
        '+49': 'Allemagne',
        '+39': 'Italie',
        '+34': 'Espagne',
        '+41': 'Suisse',
        '+44': 'Royaume-Uni',
        '+1': 'Canada/USA',
        '+7': 'Russie/Kazakhstan',
        '+375': 'Biélorussie'
    },
    // Nationalités africaines
    AFRICAN_COUNTRIES: [
        { code: 'DZ', name: 'Algérie', flag: '🇩🇿' },
        { code: 'AO', name: 'Angola', flag: '🇦🇴' },
        { code: 'BJ', name: 'Bénin', flag: '🇧🇯' },
        { code: 'BW', name: 'Botswana', flag: '🇧🇼' },
        { code: 'BF', name: 'Burkina Faso', flag: '🇧🇫' },
        { code: 'BI', name: 'Burundi', flag: '🇧🇮' },
        { code: 'CM', name: 'Cameroun', flag: '🇨🇲' },
        { code: 'CV', name: 'Cap-Vert', flag: '🇨🇻' },
        { code: 'CF', name: 'République centrafricaine', flag: '🇨🇫' },
        { code: 'TD', name: 'Tchad', flag: '🇹🇩' },
        { code: 'KM', name: 'Comores', flag: '🇰🇲' },
        { code: 'CG', name: 'République du Congo', flag: '🇨🇬' },
        { code: 'CD', name: 'République démocratique du Congo', flag: '🇨🇩' },
        { code: 'CI', name: "Côte d'Ivoire", flag: '🇨🇮' },
        { code: 'DJ', name: 'Djibouti', flag: '🇩🇯' },
        { code: 'EG', name: 'Égypte', flag: '🇪🇬' },
        { code: 'GQ', name: 'Guinée équatoriale', flag: '🇬🇶' },
        { code: 'ER', name: 'Érythrée', flag: '🇪🇷' },
        { code: 'SZ', name: 'Eswatini', flag: '🇸🇿' },
        { code: 'ET', name: 'Éthiopie', flag: '🇪🇹' },
        { code: 'GA', name: 'Gabon', flag: '🇬🇦' },
        { code: 'GM', name: 'Gambie', flag: '🇬🇲' },
        { code: 'GH', name: 'Ghana', flag: '🇬🇭' },
        { code: 'GN', name: 'Guinée', flag: '🇬🇳' },
        { code: 'GW', name: 'Guinée-Bissau', flag: '🇬🇼' },
        { code: 'KE', name: 'Kenya', flag: '🇰🇪' },
        { code: 'LS', name: 'Lesotho', flag: '🇱🇸' },
        { code: 'LR', name: 'Libéria', flag: '🇱🇷' },
        { code: 'LY', name: 'Libye', flag: '🇱🇾' },
        { code: 'MG', name: 'Madagascar', flag: '🇲🇬' },
        { code: 'MW', name: 'Malawi', flag: '🇲🇼' },
        { code: 'ML', name: 'Mali', flag: '🇲🇱' },
        { code: 'MR', name: 'Mauritanie', flag: '🇲🇷' },
        { code: 'MU', name: 'Maurice', flag: '🇲🇺' },
        { code: 'MA', name: 'Maroc', flag: '🇲🇦' },
        { code: 'MZ', name: 'Mozambique', flag: '🇲🇿' },
        { code: 'NA', name: 'Namibie', flag: '🇳🇦' },
        { code: 'NE', name: 'Niger', flag: '🇳🇪' },
        { code: 'NG', name: 'Nigéria', flag: '🇳🇬' },
        { code: 'RW', name: 'Rwanda', flag: '🇷🇼' },
        { code: 'ST', name: 'Sao Tomé-et-Principe', flag: '🇸🇹' },
        { code: 'SN', name: 'Sénégal', flag: '🇸🇳' },
        { code: 'SC', name: 'Seychelles', flag: '🇸🇨' },
        { code: 'SL', name: 'Sierra Leone', flag: '🇸🇱' },
        { code: 'SO', name: 'Somalie', flag: '🇸🇴' },
        { code: 'ZA', name: 'Afrique du Sud', flag: '🇿🇦' },
        { code: 'SS', name: 'Soudan du Sud', flag: '🇸🇸' },
        { code: 'SD', name: 'Soudan', flag: '🇸🇩' },
        { code: 'TZ', name: 'Tanzanie', flag: '🇹🇿' },
        { code: 'TG', name: 'Togo', flag: '🇹🇬' },
        { code: 'TN', name: 'Tunisie', flag: '🇹🇳' },
        { code: 'UG', name: 'Ouganda', flag: '🇺🇬' },
        { code: 'ZM', name: 'Zambie', flag: '🇿🇲' },
        { code: 'ZW', name: 'Zimbabwe', flag: '🇿🇼' }
    ]
};
// Export pour compatibilité
exports.GEO_VALIDATION_ENABLED = exports.APP_CONSTANTS.GEO_VALIDATION_ENABLED;
exports.countryMapping = exports.APP_CONSTANTS.PHONE_COUNTRY_MAPPING;
exports.countryNames = exports.APP_CONSTANTS.COUNTRY_NAMES;
exports.africanCountries = exports.APP_CONSTANTS.AFRICAN_COUNTRIES;
// src/constants.ts
//# sourceMappingURL=constants.js.map