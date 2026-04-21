import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateSongDto } from './dto/create-song.dto';
import { Document } from 'mongoose';
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

export type UploadedAudioFile = {
  mimetype: string;
  originalname: string;
  buffer: Buffer;
};

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

  private getCloudinaryConfig() {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      throw new BadRequestException(
        'Missing Cloudinary server environment variables.',
      );
    }

    return {
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    };
  }

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

  async update(id: string, updateSongDto: CreateSongDto): Promise<Song> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`Invalid song ID: ${id}`);
    }

    const updatedSong = await this.songModel
      .findByIdAndUpdate(id, updateSongDto, {
        new: true,
        runValidators: true,
      })
      .exec();

    if (!updatedSong) {
      throw new NotFoundException(`Song with ID ${id} not found`);
    }

    return updatedSong;
  }

  async remove(id: string): Promise<{ message: string }> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`Invalid song ID: ${id}`);
    }

    const deletedSong = await this.songModel.findByIdAndDelete(id).exec();

    if (!deletedSong) {
      throw new NotFoundException(`Song with ID ${id} not found`);
    }

    return { message: 'Song deleted successfully' };
  }

  async uploadAudio(file: UploadedAudioFile): Promise<{ audioUrl: string }> {
    if (!file) {
      throw new BadRequestException('Audio file is required');
    }

    const isMp3 =
      file.mimetype === 'audio/mpeg' ||
      file.originalname.toLowerCase().endsWith('.mp3');

    if (!isMp3) {
      throw new BadRequestException('Only mp3 files are supported');
    }

    cloudinary.config(this.getCloudinaryConfig());

    const uploaded = await new Promise<{ secure_url: string }>(
      (resolve, reject) => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            resource_type: 'video',
            folder: 'sheet-music-app/beats',
          },
          (error, result) => {
            if (error || !result?.secure_url) {
              // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
              reject(error ?? new Error('Cloudinary upload failed'));
              return;
            }

            resolve({ secure_url: result.secure_url });
          },
        );

        Readable.from(file.buffer).pipe(uploadStream);
      },
    );

    return { audioUrl: uploaded.secure_url };
  }
}
