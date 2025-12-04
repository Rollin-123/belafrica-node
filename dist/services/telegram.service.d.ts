export interface TelegramConfig {
    botToken: string;
    chatId?: string;
}
export interface OTPSendResult {
    success: boolean;
    message?: string;
    code?: string;
    error?: string;
}
export interface OTPVerifyResult {
    success: boolean;
    user?: any;
    error?: string;
}
export declare class TelegramService {
    private botToken;
    private apiUrl;
    private creatorChatId;
    constructor(config: TelegramConfig);
    sendOTP(phoneNumber: string, code: string): Promise<OTPSendResult>;
    sendMessage(chatId: string, text: string, parseMode?: string): Promise<boolean>;
    testConnection(): Promise<{
        success: boolean;
        username?: string;
        error?: string;
    }>;
    sendAdminNotification(userData: any, code: string): Promise<boolean>;
    setupBotCommands(): Promise<boolean>;
}
export declare function getTelegramService(): TelegramService;
export default TelegramService;
//# sourceMappingURL=telegram.service.d.ts.map