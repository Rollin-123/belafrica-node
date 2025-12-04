"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupabaseService = void 0;
exports.getSupabaseService = getSupabaseService;
const supabase_js_1 = require("@supabase/supabase-js");
class SupabaseService {
    constructor() {
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
        this.client = (0, supabase_js_1.createClient)(supabaseUrl, supabaseKey);
    }
    async createUser(userData) {
        try {
            const community = userData.community ||
                `${userData.nationalityName}En${userData.countryName.replace(/\s/g, '')}`;
            const { data, error } = await this.client
                .from('users')
                .insert([{
                    phone_number: userData.phoneNumber,
                    country_code: userData.countryCode,
                    country_name: userData.countryName,
                    nationality: userData.nationality,
                    nationality_name: userData.nationalityName,
                    pseudo: userData.pseudo,
                    email: userData.email,
                    avatar_url: userData.avatarUrl,
                    community: community,
                    is_verified: true,
                    created_at: new Date().toISOString()
                }])
                .select()
                .single();
            if (error) {
                console.error('❌ [SUPABASE] Erreur création utilisateur:', error);
                throw new Error(`Erreur création utilisateur: ${error.message}`);
            }
            console.log('✅ [SUPABASE] Utilisateur créé:', data.id);
            return data;
        }
        catch (error) {
            console.error('❌ [SUPABASE] Erreur createUser:', error);
            throw error;
        }
    }
    async findUserByPhone(phoneNumber) {
        try {
            const { data, error } = await this.client
                .from('users')
                .select('*')
                .eq('phone_number', phoneNumber)
                .maybeSingle();
            if (error) {
                console.error('❌ [SUPABASE] Erreur recherche utilisateur:', error);
                return null;
            }
            if (data) {
                console.log('✅ [SUPABASE] Utilisateur trouvé:', data.id);
            }
            else {
                console.log('🔍 [SUPABASE] Aucun utilisateur trouvé pour:', phoneNumber);
            }
            return data;
        }
        catch (error) {
            console.error('❌ [SUPABASE] Erreur findUserByPhone:', error);
            return null;
        }
    }
    async findUserByPseudo(pseudo, excludeUserId) {
        try {
            let query = this.client
                .from('users')
                .select('*')
                .eq('pseudo', pseudo);
            if (excludeUserId) {
                query = query.neq('id', excludeUserId);
            }
            const { data, error } = await query.single();
            if (error && error.code !== 'PGRST116')
                throw error;
            return data || null;
        }
        catch (error) {
            console.error('❌ Erreur recherche par pseudo:', error);
            throw error;
        }
    }
    async getUserById(userId) {
        try {
            const { data, error } = await this.client
                .from('users')
                .select('*')
                .eq('id', userId)
                .single();
            if (error)
                throw error;
            return data;
        }
        catch (error) {
            console.error('❌ Erreur récupération utilisateur:', error);
            throw error;
        }
    }
    async saveOTP(otpData) {
        try {
            await this.client
                .from('otp_codes')
                .delete()
                .eq('phone_number', otpData.phoneNumber);
            const { error } = await this.client
                .from('otp_codes')
                .insert([{
                    phone_number: otpData.phoneNumber,
                    code: otpData.code,
                    expires_at: otpData.expiresAt.toISOString(),
                    created_at: new Date().toISOString()
                }]);
            if (error) {
                console.error('❌ [SUPABASE] Erreur sauvegarde OTP:', error);
                return false;
            }
            console.log('✅ [SUPABASE] OTP sauvegardé pour:', otpData.phoneNumber);
            return true;
        }
        catch (error) {
            console.error('❌ [SUPABASE] Erreur saveOTP:', error);
            return false;
        }
    }
    async hasValidOTP(phoneNumber) {
        try {
            const now = new Date().toISOString();
            const { data, error } = await this.client
                .from('otp_codes')
                .select('id')
                .eq('phone_number', phoneNumber)
                .eq('verified', true)
                .gt('expires_at', now)
                .limit(1);
            if (error) {
                console.error('❌ [SUPABASE] Erreur vérification OTP valide:', error);
                return false;
            }
            const hasOTP = data && data.length > 0;
            console.log(`🔍 [SUPABASE] OTP valide pour ${phoneNumber}: ${hasOTP ? 'OUI' : 'NON'}`);
            return hasOTP;
        }
        catch (error) {
            console.error('❌ [SUPABASE] Erreur hasValidOTP:', error);
            return false;
        }
    }
    async verifyOTP(phoneNumber, code) {
        try {
            console.log('🔍 [SUPABASE] Vérification OTP:', { phoneNumber, code });
            const now = new Date().toISOString();
            const { data, error } = await this.client
                .from('otp_codes')
                .select('*')
                .eq('phone_number', phoneNumber)
                .eq('code', code)
                .eq('verified', false)
                .gt('expires_at', now)
                .maybeSingle();
            if (error) {
                console.error('❌ [SUPABASE] Erreur requête OTP:', error);
                return false;
            }
            if (!data) {
                console.log('❌ [SUPABASE] Aucun OTP valide trouvé');
                return false;
            }
            console.log('✅ [SUPABASE] OTP trouvé:', data.id);
            const { error: updateError } = await this.client
                .from('otp_codes')
                .update({
                verified: true,
                verified_at: now
            })
                .eq('id', data.id);
            if (updateError) {
                console.error('❌ [SUPABASE] Erreur mise à jour OTP:', updateError);
                return false;
            }
            console.log('✅ [SUPABASE] OTP marqué comme vérifié');
            return true;
        }
        catch (error) {
            console.error('❌ [SUPABASE] Erreur vérification OTP:', error);
            return false;
        }
    }
    async cleanupExpiredOTPs() {
        try {
            const { error } = await this.client
                .from('otp_codes')
                .delete()
                .lt('expires_at', new Date().toISOString());
            if (error)
                throw error;
            console.log('🧹 OTP expirés nettoyés');
        }
        catch (error) {
            console.error('❌ Erreur nettoyage OTP:', error);
        }
    }
    async promoteToAdmin(userId, permissions) {
        try {
            const { error } = await this.client
                .from('users')
                .update({
                is_admin: true,
                admin_permissions: permissions,
                admin_level: permissions.includes('post_international') ? 'international' : 'national',
                admin_since: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
                .eq('id', userId);
            if (error)
                throw error;
            console.log('✅ Utilisateur promu admin:', userId);
            return true;
        }
        catch (error) {
            console.error('❌ Erreur promotion admin:', error);
            return false;
        }
    }
    async createPost(postData) {
        try {
            const { data, error } = await this.client
                .from('posts')
                .insert([{
                    author_id: postData.authorId,
                    content: postData.content,
                    image_urls: postData.imageUrls || [],
                    visibility: postData.visibility,
                    community: postData.community,
                    expires_at: postData.expiresAt.toISOString(),
                    created_at: new Date().toISOString()
                }])
                .select(`
          *,
          author:users(pseudo, avatar_url, community)
        `)
                .single();
            if (error)
                throw error;
            console.log('✅ Post créé:', data.id);
            return data;
        }
        catch (error) {
            console.error('❌ Erreur création post:', error);
            throw error;
        }
    }
    async getCommunityPosts(community, visibility = 'national') {
        try {
            const { data, error } = await this.client
                .from('posts')
                .select(`
          *,
          author:users(pseudo, avatar_url, community),
          likes:post_likes(count)
        `)
                .eq('community', community)
                .eq('visibility', visibility)
                .gt('expires_at', new Date().toISOString())
                .order('created_at', { ascending: false });
            if (error)
                throw error;
            return data || [];
        }
        catch (error) {
            console.error('❌ Erreur récupération posts:', error);
            return [];
        }
    }
    async getInternationalPosts() {
        try {
            const { data, error } = await this.client
                .from('posts')
                .select(`
          *,
          author:users(pseudo, avatar_url, community),
          likes:post_likes(count)
        `)
                .eq('visibility', 'international')
                .gt('expires_at', new Date().toISOString())
                .order('created_at', { ascending: false });
            if (error)
                throw error;
            return data || [];
        }
        catch (error) {
            console.error('❌ Erreur récupération posts internationaux:', error);
            return [];
        }
    }
    async getPostById(postId) {
        try {
            const { data, error } = await this.client
                .from('posts')
                .select('*')
                .eq('id', postId)
                .single();
            if (error)
                throw error;
            return data;
        }
        catch (error) {
            console.error('❌ Erreur récupération post:', error);
            throw error;
        }
    }
    async togglePostLike(postId, userId) {
        try {
            const { data: existingLike, error: checkError } = await this.client
                .from('post_likes')
                .select('*')
                .eq('post_id', postId)
                .eq('user_id', userId)
                .single();
            if (checkError && checkError.code !== 'PGRST116')
                throw checkError;
            if (existingLike) {
                await this.client
                    .from('post_likes')
                    .delete()
                    .eq('id', existingLike.id);
                await this.client
                    .from('posts')
                    .update({ likes_count: this.client.rpc('decrement', { x: 1 }) })
                    .eq('id', postId);
                console.log(`❌ Like supprimé: post ${postId}, user ${userId}`);
                return { liked: false, likesCount: await this.getPostLikesCount(postId) };
            }
            else {
                await this.client
                    .from('post_likes')
                    .insert([{
                        post_id: postId,
                        user_id: userId
                    }]);
                await this.client
                    .from('posts')
                    .update({ likes_count: this.client.rpc('increment', { x: 1 }) })
                    .eq('id', postId);
                console.log(`❤️  Like ajouté: post ${postId}, user ${userId}`);
                return { liked: true, likesCount: await this.getPostLikesCount(postId) };
            }
        }
        catch (error) {
            console.error('❌ Erreur toggle like:', error);
            throw error;
        }
    }
    async getPostLikesCount(postId) {
        try {
            const { count, error } = await this.client
                .from('post_likes')
                .select('*', { count: 'exact', head: true })
                .eq('post_id', postId);
            if (error)
                throw error;
            return count || 0;
        }
        catch (error) {
            return 0;
        }
    }
    async deletePost(postId) {
        try {
            const { error } = await this.client
                .from('posts')
                .delete()
                .eq('id', postId);
            if (error)
                throw error;
            console.log('🗑️  Post supprimé:', postId);
        }
        catch (error) {
            console.error('❌ Erreur suppression post:', error);
            throw error;
        }
    }
    async createAdminRequest(requestData) {
        try {
            const { data, error } = await this.client
                .from('admin_requests')
                .insert([{
                    user_id: requestData.user_id,
                    passport_photo_url: requestData.passport_photo_url,
                    additional_info: requestData.additional_info,
                    status: 'pending',
                    submitted_at: new Date().toISOString()
                }])
                .select()
                .single();
            if (error)
                throw error;
            console.log('✅ Demande admin créée:', data.id);
            return data;
        }
        catch (error) {
            console.error('❌ Erreur création demande admin:', error);
            throw error;
        }
    }
    async generateAdminCode(codeData) {
        try {
            const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
            let code = '';
            for (let i = 0; i < 6; i++) {
                code += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            const expiresAt = new Date();
            expiresAt.setHours(expiresAt.getHours() + (codeData.expiresInHours || 72));
            const { data, error } = await this.client
                .from('admin_codes')
                .insert([{
                    code,
                    community: codeData.community,
                    permissions: codeData.permissions,
                    expires_at: expiresAt.toISOString(),
                    created_by: codeData.createdBy,
                    used: false,
                    created_at: new Date().toISOString()
                }])
                .select()
                .single();
            if (error)
                throw error;
            console.log('✅ Code admin généré:', code);
            return data;
        }
        catch (error) {
            console.error('❌ Erreur génération code admin:', error);
            throw error;
        }
    }
    async validateAdminCode(code, community) {
        try {
            const { data, error } = await this.client
                .from('admin_codes')
                .select('*')
                .eq('code', code)
                .eq('community', community)
                .eq('used', false)
                .gt('expires_at', new Date().toISOString())
                .single();
            if (error) {
                if (error.code === 'PGRST116') {
                    return false;
                }
                throw error;
            }
            return true;
        }
        catch (error) {
            console.error('❌ Erreur validation code admin:', error);
            return false;
        }
    }
    async markAdminCodeAsUsed(code, userId) {
        try {
            const { error } = await this.client
                .from('admin_codes')
                .update({
                used: true,
                used_by: userId,
                used_at: new Date().toISOString()
            })
                .eq('code', code);
            if (error)
                throw error;
            console.log('✅ Code admin utilisé:', code);
        }
        catch (error) {
            console.error('❌ Erreur marquage code admin:', error);
            throw error;
        }
    }
    async getPendingAdminRequests() {
        try {
            const { data, error } = await this.client
                .from('admin_requests')
                .select(`
          *,
          user:users(pseudo, phone_number, email, community)
        `)
                .eq('status', 'pending')
                .order('submitted_at', { ascending: true });
            if (error)
                throw error;
            return data || [];
        }
        catch (error) {
            console.error('❌ Erreur récupération demandes admin:', error);
            return [];
        }
    }
    async updateAdminRequestStatus(requestId, status) {
        try {
            const { error } = await this.client
                .from('admin_requests')
                .update({
                status,
                reviewed_at: new Date().toISOString()
            })
                .eq('id', requestId)
                .eq('status', 'pending');
            if (error)
                throw error;
            console.log(`✅ Demande admin ${requestId} mise à jour: ${status}`);
            return true;
        }
        catch (error) {
            console.error('❌ Erreur mise à jour demande admin:', error);
            return false;
        }
    }
    async getGeneratedAdminCodes() {
        try {
            const { data, error } = await this.client
                .from('admin_codes')
                .select(`
          *,
          creator:users!created_by(pseudo),
          user:users!used_by(pseudo)
        `)
                .order('created_at', { ascending: false });
            if (error)
                throw error;
            return data || [];
        }
        catch (error) {
            console.error('❌ Erreur récupération codes admin:', error);
            return [];
        }
    }
    async updateUser(userId, updateData) {
        try {
            const { data, error } = await this.client
                .from('users')
                .update({
                ...updateData,
                updated_at: new Date().toISOString()
            })
                .eq('id', userId)
                .select()
                .single();
            if (error)
                throw error;
            console.log('✅ Utilisateur mis à jour:', userId);
            return data;
        }
        catch (error) {
            console.error('❌ Erreur mise à jour utilisateur:', error);
            throw error;
        }
    }
    async getCommunityUsers(community, excludeUserId) {
        try {
            let query = this.client
                .from('users')
                .select('id, pseudo, avatar_url, is_admin, admin_level, created_at')
                .eq('community', community)
                .order('pseudo', { ascending: true });
            if (excludeUserId) {
                query = query.neq('id', excludeUserId);
            }
            const { data, error } = await query;
            if (error)
                throw error;
            return data || [];
        }
        catch (error) {
            console.error('❌ Erreur récupération utilisateurs communauté:', error);
            return [];
        }
    }
    async getUserConversations(userId) {
        try {
            const { data, error } = await this.client
                .from('conversations')
                .select(`
          *,
          participants:conversation_participants!inner(user_id),
          last_message:messages!conversation_id(content, created_at, sender:users(pseudo)),
          unread_count:messages!conversation_id(count)
        `)
                .contains('participants.user_id', [userId])
                .order('updated_at', { ascending: false });
            if (error)
                throw error;
            return data || [];
        }
        catch (error) {
            console.error('❌ Erreur récupération conversations:', error);
            return [];
        }
    }
    async checkConversationAccess(conversationId, userId) {
        try {
            const { data, error } = await this.client
                .from('conversation_participants')
                .select('*')
                .eq('conversation_id', conversationId)
                .eq('user_id', userId)
                .single();
            if (error) {
                if (error.code === 'PGRST116') {
                    return false;
                }
                throw error;
            }
            return true;
        }
        catch (error) {
            console.error('❌ Erreur vérification accès conversation:', error);
            return false;
        }
    }
    async getConversationMessages(conversationId, limit = 50, offset = 0) {
        try {
            const { data, error } = await this.client
                .from('messages')
                .select(`
          *,
          sender:users(pseudo, avatar_url)
        `)
                .eq('conversation_id', conversationId)
                .order('created_at', { ascending: false })
                .range(offset, offset + limit - 1);
            if (error)
                throw error;
            return data || [];
        }
        catch (error) {
            console.error('❌ Erreur récupération messages:', error);
            return [];
        }
    }
    async createMessage(messageData) {
        try {
            const { data, error } = await this.client
                .from('messages')
                .insert([{
                    conversation_id: messageData.conversation_id,
                    sender_id: messageData.sender_id,
                    content: messageData.content,
                    encrypted_content: messageData.encrypted_content,
                    message_type: messageData.message_type,
                    media_url: messageData.media_url,
                    created_at: new Date().toISOString()
                }])
                .select(`
          *,
          sender:users(pseudo, avatar_url)
        `)
                .single();
            if (error)
                throw error;
            await this.client
                .from('conversations')
                .update({ updated_at: new Date().toISOString() })
                .eq('id', messageData.conversation_id);
            console.log('✅ Message créé:', data.id);
            return data;
        }
        catch (error) {
            console.error('❌ Erreur création message:', error);
            throw error;
        }
    }
    async createConversation(conversationData) {
        try {
            const { data, error } = await this.client
                .from('conversations')
                .insert([{
                    type: conversationData.type,
                    name: conversationData.name,
                    community: conversationData.community,
                    created_by: conversationData.created_by,
                    description: conversationData.description,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }])
                .select()
                .single();
            if (error)
                throw error;
            console.log('✅ Conversation créée:', data.id);
            return data;
        }
        catch (error) {
            console.error('❌ Erreur création conversation:', error);
            throw error;
        }
    }
    async addConversationParticipant(conversationId, userId, isAdmin = false) {
        try {
            const { error } = await this.client
                .from('conversation_participants')
                .insert([{
                    conversation_id: conversationId,
                    user_id: userId,
                    is_admin: isAdmin,
                    joined_at: new Date().toISOString()
                }]);
            if (error)
                throw error;
            console.log(`✅ Participant ajouté: conversation ${conversationId}, user ${userId}`);
        }
        catch (error) {
            console.error('❌ Erreur ajout participant:', error);
            throw error;
        }
    }
    async getCommunityGroup(communityId) {
        try {
            const { data, error } = await this.client
                .from('conversations')
                .select(`
          *,
          participants:conversation_participants(
            user:users(id, pseudo, avatar_url, is_admin)
          )
        `)
                .eq('type', 'group')
                .eq('community', communityId)
                .single();
            if (error && error.code !== 'PGRST116')
                throw error;
            return data || null;
        }
        catch (error) {
            console.error('❌ Erreur récupération groupe communauté:', error);
            return null;
        }
    }
    async getConversationParticipants(conversationId) {
        try {
            const { data, error } = await this.client
                .from('conversation_participants')
                .select(`
          user:users(id, pseudo, avatar_url, is_admin),
          is_admin,
          joined_at
        `)
                .eq('conversation_id', conversationId);
            if (error)
                throw error;
            return data || [];
        }
        catch (error) {
            console.error('❌ Erreur récupération participants:', error);
            return [];
        }
    }
    async getPrivateConversation(userId1, userId2) {
        try {
            const { data, error } = await this.client
                .from('conversations')
                .select(`
          *,
          participants:conversation_participants!inner(user_id)
        `)
                .eq('type', 'private')
                .contains('participants.user_id', [userId1, userId2]);
            if (error)
                throw error;
            const validConversation = data?.find((conv) => {
                const participantIds = conv.participants.map((p) => p.user_id);
                return participantIds.includes(userId1) && participantIds.includes(userId2);
            });
            return validConversation || null;
        }
        catch (error) {
            console.error('❌ Erreur récupération conversation privée:', error);
            return null;
        }
    }
}
exports.SupabaseService = SupabaseService;
let supabaseInstance = null;
function getSupabaseService() {
    if (!supabaseInstance) {
        supabaseInstance = new SupabaseService();
    }
    return supabaseInstance;
}
//# sourceMappingURL=supabase.service.js.map