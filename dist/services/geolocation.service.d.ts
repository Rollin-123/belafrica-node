export interface GeolocationData {
    country: string;
    countryCode: string;
    city?: string;
    region?: string;
    timezone?: string;
    isProxy?: boolean;
    ip?: string;
}
export declare class GeolocationService {
    private ipApiUrl;
    private ipifyUrl;
    detectLocationByIP(ip?: string): Promise<GeolocationData>;
    validatePhoneCountryMatch(phoneCountryCode: string, detectedCountryCode: string): boolean;
    validateUserLocation(phoneCountryCode: string, userIP?: string): Promise<{
        isValid: boolean;
        detectedCountry?: string;
        detectedCountryCode?: string;
        ip?: string;
        error?: string;
    }>;
    getAllowedCountriesForPhoneCode(phoneCountryCode: string): string[];
    isCountryAllowed(countryCode: string): boolean;
}
export declare function getGeolocationService(): GeolocationService;
//# sourceMappingURL=geolocation.service.d.ts.map