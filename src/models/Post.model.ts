import { Schema, model, Document } from 'mongoose';

export interface IPost extends Document {
  authorId: Schema.Types.ObjectId;
  authorName: string;
  authorAvatar?: string;
  content: string;
  imageUrls: string[];
  visibility: 'national' | 'international';
  community: string;
  likes: Schema.Types.ObjectId[];
  
  // Expiration automatique
  expiresAt: Date;
  isExpired: boolean;
  
  createdAt: Date;
  updatedAt: Date;
}

const postSchema = new Schema<IPost>({
  authorId: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  authorName: { 
    type: String, 
    required: true 
  },
  authorAvatar: { 
    type: String 
  },
  content: { 
    type: String, 
    required: true,
    maxlength: 1000 
  },
  imageUrls: [{ 
    type: String 
  }],
  visibility: { 
    type: String, 
    enum: ['national', 'international'], 
    required: true 
  },
  community: { 
    type: String, 
    required: true 
  },
  likes: [{ 
    type: Schema.Types.ObjectId, 
    ref: 'User' 
  }],
  
  // Expiration automatique
  expiresAt: { 
    type: Date, 
    required: true 
  },
  isExpired: { 
    type: Boolean, 
    default: false 
  }
}, {
  timestamps: true
});

// Index pour les performances
postSchema.index({ community: 1, visibility: 1 });
postSchema.index({ expiresAt: 1 });
postSchema.index({ authorId: 1 });
postSchema.index({ createdAt: -1 });

// Middleware pour calculer l'expiration automatiquement
postSchema.pre('save', function(next) {
  if (this.isNew) {
    const hours = this.visibility === 'national' ? 48 : 72;
    this.expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);
  }
  next();
});

export const Post = model<IPost>('Post', postSchema);