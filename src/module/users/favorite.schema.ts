import { Schema } from 'mongoose';

export const FavoriteSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  songId: { type: Schema.Types.ObjectId, ref: 'Song', required: true },
});

FavoriteSchema.index({ userId: 1, songId: 1 }, { unique: true });
