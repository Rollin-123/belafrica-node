"use strict";
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserService = void 0;
const core_1 = require("@angular/core");
const rxjs_1 = require("rxjs");
let UserService = (() => {
    let _classDecorators = [(0, core_1.Injectable)({
            providedIn: 'root'
        })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var UserService = _classThis = class {
        constructor(storageService) {
            this.storageService = storageService;
            this.storageKey = 'belafrica_user';
            this.currentUserSubject = new rxjs_1.BehaviorSubject(this.loadUserFromStorage());
            this.currentUser$ = this.currentUserSubject.asObservable();
        }
        loadUserFromStorage() {
            const user = this.storageService.getItem(this.storageKey);
            if (user) {
                console.log('👤 Utilisateur chargé depuis le stockage:', user.pseudo);
                return user;
            }
            return null;
        }
        setCurrentUser(user) {
            this.currentUserSubject.next(user);
            if (user) {
                this.storageService.setItem(this.storageKey, user);
                console.log('💾 Utilisateur sauvegardé:', user.pseudo);
            }
            else {
                this.storageService.removeItem(this.storageKey);
                console.log('🗑️ Données utilisateur supprimées du stockage.');
            }
        }
        getCurrentUser() {
            return this.currentUserSubject.getValue();
        }
        updateUser(partialUser) {
            const currentUser = this.getCurrentUser();
            if (currentUser) {
                const updatedUser = { ...currentUser, ...partialUser };
                this.setCurrentUser(updatedUser);
                console.log('🔄 Profil utilisateur mis à jour localement.');
            }
        }
        promoteToAdmin(permissions) {
            const adminLevel = permissions.includes('post_international') ? 'international' : 'national';
            this.updateUser({ is_admin: true, admin_permissions: permissions, admin_level: adminLevel });
            console.log(`👑 Utilisateur promu admin avec le niveau: ${adminLevel}`);
        }
        resetAdminStatus() {
            this.updateUser({ is_admin: false, admin_permissions: [], admin_level: undefined });
        }
        canPostNational() {
            return this.getCurrentUser()?.admin_permissions?.includes('post_national') ?? false;
        }
        canPostInternational() {
            return this.getCurrentUser()?.admin_permissions?.includes('post_international') ?? false;
        }
        isUserAdmin() {
            return this.getCurrentUser()?.is_admin ?? false;
        }
        getUserCommunity() {
            return this.getCurrentUser()?.community || '';
        }
    };
    __setFunctionName(_classThis, "UserService");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        UserService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return UserService = _classThis;
})();
exports.UserService = UserService;
//# sourceMappingURL=user.service.js.map