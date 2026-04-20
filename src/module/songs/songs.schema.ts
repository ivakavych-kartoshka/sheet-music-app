// songs.schema.ts
import { Schema } from 'mongoose';

export const SongSchema = new Schema({
  title: { type: String, required: true },
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
