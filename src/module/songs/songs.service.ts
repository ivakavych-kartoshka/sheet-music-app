import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
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

export interface FindSongsResult {
  items: Song[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class SongsService {
  constructor(@InjectModel('Song') private readonly songModel: Model<Song>) {}

  async findAll(
    search?: string,
    category?: string,
    page = 1,
    limit = 9,
  ): Promise<FindSongsResult> {
    const query: Record<string, any> = {};
    const normalizedPage = Math.max(1, page);
    const normalizedLimit = Math.min(Math.max(1, limit), 50);

    if (search) {
      query.title = { $regex: search, $options: 'i' };
    }

    if (category) {
      query.category = category;
    }

    const [items, total] = await Promise.all([
      this.songModel
        .find(query)
        .sort({ title: 1 })
        .skip((normalizedPage - 1) * normalizedLimit)
        .limit(normalizedLimit)
        .exec(),
      this.songModel.countDocuments(query).exec(),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / normalizedLimit));

    return {
      items,
      total,
      page: normalizedPage,
      limit: normalizedLimit,
      totalPages,
    };
  }

  async findCategories(): Promise<string[]> {
    const categories = await this.songModel.distinct('category').exec();

    return categories
      .map((category) => category?.trim())
      .filter((category): category is string => Boolean(category))
      .sort((a, b) => a.localeCompare(b));
  }

  async findOne(id: string): Promise<Song> {
    // Validate MongoDB ObjectId
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`Invalid song ID: ${id}`);
    }

    const song = await this.songModel.findById(id).exec();

    if (!song) {
      throw new NotFoundException(`Song with ID ${id} not found`);
    }

    return song;
  }

  async create(createSongDto: CreateSongDto): Promise<Song> {
    const newSong = new this.songModel(createSongDto);
    return newSong.save();
  }
}
