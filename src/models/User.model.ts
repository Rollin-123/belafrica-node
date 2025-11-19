import { Schema, model, Document } from 'mongoose';

export interface IUser extends Document {
  phoneNumber: string;
  countryCode: string;
  countryName: string;
  nationality: string;
  nationalityName: string;
  pseudo: string;
  email?: string;
  avatar?: string;
  community: string;
  
  // Authentification
  otpCode?: string;
  otpExpires?: Date;
  isVerified: boolean;
  
  // Administration
  isAdmin: boolean;
  adminPermissions?: string[];
  adminLevel?: 'national' | 'international' | 'super';
  adminSince?: Date;
  
  // Métadonnées
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>({
  phoneNumber: { 
    type: String, 
    required: true, 
    unique: true 
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
    required: true 
  },
  email: { 
    type: String 
  },
  avatar: { 
    type: String 
  },
  community: { 
    type: String, 
    required: true 
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
  },
  
  // Métadonnées
  lastLogin: { 
    type: Date 
  }
}, {
  timestamps: true
});

// Index pour les recherches par communauté
userSchema.index({ community: 1 });
userSchema.index({ phoneNumber: 1 });
userSchema.index({ isAdmin: 1 });

export const User = model<IUser>('User', userSchema);