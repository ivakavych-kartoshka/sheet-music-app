// songs.schema.ts
import { Schema } from 'mongoose';

export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^\w\s-]/g, '') // Remove special characters except spaces and hyphens
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/^-+|-+$/g, ''); // Remove leading and trailing hyphens
}

export const SongSchema = new Schema({
  title: { type: String, required: true },
  slug: { type: String, unique: true, required: true },
  category: { type: String },

  sections: [
    {
      title: String,
      lines: [
        {
          lyric: String,
          notes: String,
        },
      ],
    },
  ],

  audioUrl: String,
  images: [String],
});

// Pre-save middleware to generate slug from title
SongSchema.pre('save', async function (next: any) {
  if (this.isModified('title') || this.isNew) {
    this.slug = generateSlug(this.title);
  }
});
