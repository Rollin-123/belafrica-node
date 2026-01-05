import TelegramBot from 'node-telegram-bot-api';
declare const bot: TelegramBot | null;
export declare const initializeTelegramBot: () => void;
export declare const sendTelegramMessage: (chatId: number, message: string) => Promise<TelegramBot.Message>;
export { bot };
//# sourceMappingURL=telegram.service.d.ts.map