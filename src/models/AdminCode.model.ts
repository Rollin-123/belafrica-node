import { Schema, model, Document } from 'mongoose';

export interface IAdminCode extends Document {
  code: string;
  community: string;
  userEmail: string;
  permissions: string[];
  
  // Validation
  expiresAt: Date;
  used: boolean;
  usedBy?: Schema.Types.ObjectId;
  usedAt?: Date;
  
  createdAt: Date;
}

const adminCodeSchema = new Schema<IAdminCode>({
  code: { 
    type: String, 
    required: true, 
    unique: true 
  },
  community: { 
    type: String, 
    required: true 
  },
  userEmail: { 
    type: String, 
    required: true 
  },
  permissions: [{ 
    type: String, 
    required: true 
  }],
  
  // Validation
  expiresAt: { 
    type: Date, 
    required: true 
  },
  used: { 
    type: Boolean, 
    default: false 
  },
  usedBy: { 
    type: Schema.Types.ObjectId, 
    ref: 'User' 
  },
  usedAt: { 
    type: Date 
  }
}, {
  timestamps: true
});

// Index pour les recherches rapides
adminCodeSchema.index({ code: 1 });
adminCodeSchema.index({ expiresAt: 1 });
adminCodeSchema.index({ used: 1 });

export const AdminCode = model<IAdminCode>('AdminCode', adminCodeSchema);