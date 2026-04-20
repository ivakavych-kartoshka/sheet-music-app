import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateSongDto } from './dto/create-song.dto';
import { Document } from 'mongoose';

export interface Song extends Document {
  title: string;
  category: string;
  sections: Array<{
    title: string;
    lines: Array<{
      lyric: string;
      notes: string;
    }>;
  }>;
  audioUrl?: string;
  images?: string[];
}

@Injectable()
export class SongsService {
  constructor(@InjectModel('Song') private readonly songModel: Model<Song>) {}

  async findAll(search?: string, category?: string): Promise<Song[]> {
    const query: Record<string, any> = {};

    if (search) {
      query.title = { $regex: search, $options: 'i' };
    }

    if (category) {
      query.category = category;
    }

    return this.songModel.find(query).exec();
  }

  async findOne(id: string): Promise<Song | null> {
    return this.songModel.findById(id).exec();
  }

  async create(createSongDto: CreateSongDto): Promise<Song> {
    const newSong = new this.songModel(createSongDto);
    return newSong.save();
  }
}
