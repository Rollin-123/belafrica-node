import { Observable } from 'rxjs';
import { StorageService } from '.';
export interface User {
    id: string;
    pseudo: string;
    email: string;
    phone_number: string;
    community: string;
    country_code: string;
    country_name: string;
    nationality: string;
    nationality_name: string;
    avatar_url?: string | null;
    is_admin: boolean;
    admin_permissions?: string[];
    admin_level?: 'national' | 'international' | 'super';
    created_at: string;
    updated_at: string;
    is_verified: boolean;
    last_login?: string | null;
    login_attempts: number;
    ip_address?: string | null;
}
export declare class UserService {
    private storageService;
    private readonly storageKey;
    constructor(storageService: StorageService);
    private loadUserFromStorage;
    private currentUserSubject;
    currentUser$: Observable<User | null>;
    setCurrentUser(user: User | null): void;
    getCurrentUser(): User | null;
    updateUser(partialUser: Partial<User>): void;
    promoteToAdmin(permissions: string[]): void;
    resetAdminStatus(): void;
    canPostNational(): boolean;
    canPostInternational(): boolean;
    isUserAdmin(): boolean;
    getUserCommunity(): string;
}
//# sourceMappingURL=user.service.d.ts.map