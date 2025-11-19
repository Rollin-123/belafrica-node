import { Schema, model, Document } from 'mongoose';

export interface IUser extends Document {
  // Identité
  phoneNumber: string;
  countryCode: string;
  countryName: string;
  nationality: string;
  nationalityName: string;
  pseudo: string;
  email?: string;
  avatar?: string;
  community: string;
  
  // Géolocalisation
  ipAddress?: string;
  detectedCountry?: string;
  timezone?: string;
  
  // Authentification
  otpCode?: string;
  otpExpires?: Date;
  isVerified: boolean;
  lastLogin?: Date;
  
  // Administration
  isAdmin: boolean;
  adminPermissions?: string[];
  adminLevel?: 'national' | 'international' | 'super';
  adminSince?: Date;
  
  // Métadonnées
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>({
  // Identité
  phoneNumber: { 
    type: String, 
    required: true, 
    unique: true,
    index: true 
  },
  countryCode: { 
    type: String, 
    required: true 
  },
  countryName: { 
    type: String, 
    required: true 
  },
  nationality: { 
    type: String, 
    required: true 
  },
  nationalityName: { 
    type: String, 
    required: true 
  },
  pseudo: { 
    type: String, 
    required: true,
    minlength: 3,
    maxlength: 30
  },
  email: { 
    type: String,
    sparse: true
  },
  avatar: { 
    type: String 
  },
  community: { 
    type: String, 
    required: true,
    index: true
  },
  
  // Géolocalisation
  ipAddress: { 
    type: String 
  },
  detectedCountry: { 
    type: String 
  },
  timezone: { 
    type: String 
  },
  
  // Authentification
  otpCode: { 
    type: String 
  },
  otpExpires: { 
    type: Date 
  },
  isVerified: { 
    type: Boolean, 
    default: false 
  },
  lastLogin: { 
    type: Date 
  },
  
  // Administration
  isAdmin: { 
    type: Boolean, 
    default: false 
  },
  adminPermissions: [{ 
    type: String 
  }],
  adminLevel: { 
    type: String, 
    enum: ['national', 'international', 'super'], 
    default: 'national' 
  },
  adminSince: { 
    type: Date 
  }
}, {
  timestamps: true
});

// Index composites pour les performances
userSchema.index({ community: 1, isAdmin: 1 });
userSchema.index({ phoneNumber: 1, isVerified: 1 });
userSchema.index({ createdAt: -1 });

// Middleware pour formater le numéro de téléphone
userSchema.pre('save', function(next) {
  if (this.isModified('phoneNumber')) {
    this.phoneNumber = this.phoneNumber.replace(/\s/g, '');
  }
  next();
});

// Méthode pour vérifier si l'OTP est valide
userSchema.methods.isOTPValid = function(otp: string): boolean {
  if (!this.otpCode || !this.otpExpires) return false;
  
  const now = new Date();
  return this.otpCode === otp && now < this.otpExpires;
};

// Méthode pour générer le nom de communauté
userSchema.methods.generateCommunityName = function(): string {
  const cleanNationality = this.nationalityName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, '');
  
  const cleanCountry = this.countryName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, '');
  
  return `${cleanNationality}En${cleanCountry}`;
};

export const User = model<IUser>('User', userSchema);