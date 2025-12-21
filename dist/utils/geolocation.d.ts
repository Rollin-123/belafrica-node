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
export declare function getClientIP(req: any): string;
/**
 * Détecte le pays par IP avec bypass pour développement
 */
export declare function detectCountryByIP(ip: string): Promise<GeolocationResult>;
/**
 * Valide si un code téléphone correspond à un code pays
 */
export declare function validatePhoneCountryMatch(phoneCountryCode: string, detectedCountryCode: string): {
    isValid: boolean;
    error?: string;
};
//# sourceMappingURL=geolocation.d.ts.map