export interface UserData {
    phoneNumber: string;
    countryCode: string;
    countryName: string;
    nationality: string;
    nationalityName: string;
    pseudo: string;
    email?: string;
    avatarUrl?: string;
    community: string;
}
export interface OTPData {
    phoneNumber: string;
    code: string;
    expiresAt: Date;
}
export interface PostData {
    authorId: string;
    content: string;
    imageUrls?: string[];
    visibility: 'national' | 'international';
    community: string;
    expiresAt: Date;
}
export interface AdminCodeData {
    community: string;
    permissions: string[];
    createdBy: string;
    expiresInHours?: number;
}
export declare class SupabaseService {
    private client;
    constructor();
    createUser(userData: UserData): Promise<any>;
    findUserByPhone(phoneNumber: string): Promise<any>;
    findUserByPseudo(pseudo: string, excludeUserId?: string): Promise<any>;
    getUserById(userId: string): Promise<any>;
    saveOTP(otpData: OTPData): Promise<boolean>;
    hasValidOTP(phoneNumber: string): Promise<boolean>;
    verifyOTP(phoneNumber: string, code: string): Promise<boolean>;
    cleanupExpiredOTPs(): Promise<void>;
    promoteToAdmin(userId: string, permissions: string[]): Promise<boolean>;
    createPost(postData: PostData): Promise<any>;
    getCommunityPosts(community: string, visibility?: 'national' | 'international'): Promise<any[]>;
    getInternationalPosts(): Promise<any[]>;
    getPostById(postId: string): Promise<any>;
    togglePostLike(postId: string, userId: string): Promise<{
        liked: boolean;
        likesCount: number;
    }>;
    private getPostLikesCount;
    deletePost(postId: string): Promise<void>;
    createAdminRequest(requestData: any): Promise<any>;
    generateAdminCode(codeData: AdminCodeData): Promise<any>;
    validateAdminCode(code: string, community: string): Promise<boolean>;
    markAdminCodeAsUsed(code: string, userId: string): Promise<void>;
    getPendingAdminRequests(): Promise<any[]>;
    updateAdminRequestStatus(requestId: string, status: string): Promise<boolean>;
    getGeneratedAdminCodes(): Promise<any[]>;
    updateUser(userId: string, updateData: any): Promise<any>;
    getCommunityUsers(community: string, excludeUserId?: string): Promise<any[]>;
    getUserConversations(userId: string): Promise<any[]>;
    checkConversationAccess(conversationId: string, userId: string): Promise<boolean>;
    getConversationMessages(conversationId: string, limit?: number, offset?: number): Promise<any[]>;
    createMessage(messageData: any): Promise<any>;
    createConversation(conversationData: any): Promise<any>;
    addConversationParticipant(conversationId: string, userId: string, isAdmin?: boolean): Promise<void>;
    getCommunityGroup(communityId: string): Promise<any>;
    getConversationParticipants(conversationId: string): Promise<any[]>;
    getPrivateConversation(userId1: string, userId2: string): Promise<any>;
}
export declare function getSupabaseService(): SupabaseService;
//# sourceMappingURL=supabase.service.d.ts.map