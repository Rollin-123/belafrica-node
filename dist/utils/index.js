"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatPhoneNumber = formatPhoneNumber;
exports.generateCommunity = generateCommunity;
exports.isExpired = isExpired;
exports.generateRandomCode = generateRandomCode;
function formatPhoneNumber(phone) {
    return phone.replace(/\D/g, '');
}
function generateCommunity(nationality, country) {
    return `${nationality.replace(/\s+/g, '')}En${country.replace(/\s+/g, '')}`;
}
function isExpired(date) {
    return new Date() > date;
}
function generateRandomCode(length = 6) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < length; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}
//# sourceMappingURL=index.js.map