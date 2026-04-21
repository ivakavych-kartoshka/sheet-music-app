import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateSongDto } from './dto/create-song.dto';
import { NormalizeSongDto } from './dto/normalize-song.dto';
import { Document } from 'mongoose';
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';
import { generateSlug } from './songs.schema';

export type UploadedAudioFile = {
  mimetype: string;
  originalname: string;
  buffer: Buffer;
};

export interface Song extends Document {
  title: string;
  slug: string;
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

type NormalizedLine = {
  lyric: string;
  notes: string;
};

type NormalizedSection = {
  title: string;
  lines: NormalizedLine[];
};

@Injectable()
export class SongsService {
  constructor(@InjectModel('Song') private readonly songModel: Model<Song>) {}

  private normalizeText(input: string): string {
    return input
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  private isLikelyNotesLine(line: string): boolean {
    const tokens = line
      .toLowerCase()
      .split(/[\s/|(),\\[\]{}.!?:;"'`~@#$%^&*_+=<>-]+/)
      .map((token) => token.trim())
      .filter(Boolean);

    if (tokens.length === 0) {
      return false;
    }

    const noteTokenPattern =
      /^(do|re|mi|fa|sol|la|si|do#|re#|fa#|sol#|la#|dob|reb|mib|fab|solb|lab|sib|[a-g](#|b)?\d*)$/i;

    let noteLikeCount = 0;
    for (const token of tokens) {
      if (noteTokenPattern.test(token)) {
        noteLikeCount += 1;
      }
    }

    return noteLikeCount / tokens.length >= 0.5;
  }

  private normalizeSectionTitle(rawTitle: string): string {
    const title = rawTitle
      .replace(/^\[/, '')
      .replace(/\]$/, '')
      .replace(/:$/, '')
      .trim();
    const normalized = this.normalizeText(title);

    if (normalized.startsWith('diep khuc len tone')) {
      return 'Diep Khuc Len Tone';
    }
    if (normalized.startsWith('diep khuc')) {
      return 'Diep Khuc';
    }
    if (normalized.startsWith('rap')) {
      return 'RAP';
    }
    if (normalized.startsWith('bridge')) {
      return 'Bridge';
    }
    if (normalized.startsWith('nhac')) {
      return 'Nhac Giua';
    }
    if (normalized.startsWith('doan ket')) {
      return 'Doan Ket';
    }

    return title || 'Doan 1';
  }

  private isSectionHeading(line: string): boolean {
    const trimmed = line.trim();
    if (!trimmed) {
      return false;
    }

    if (/^\[.+\]$/.test(trimmed)) {
      return true;
    }

    const normalized = this.normalizeText(trimmed);

    if (
      /^(doan\s+\d+|doan\s+ket|rap|bridge|intro|outro|nhac|diep\s*khuc)/.test(
        normalized,
      )
    ) {
      return true;
    }

    if (trimmed.endsWith(':') && !this.isLikelyNotesLine(trimmed)) {
      return true;
    }

    return false;
  }

  private extractTitle(lines: string[]): string | undefined {
    const first = lines[0]?.trim();
    if (!first) {
      return undefined;
    }

    const normalized = this.normalizeText(first);
    if (!normalized.startsWith('cam am')) {
      return undefined;
    }

    const candidate = first
      .replace(/^c[aả]m\s*[aâ]m\s*/i, '')
      .replace(/\b[A-G](#|b)?\d\b\s*$/i, '')
      .trim();

    return candidate || undefined;
  }

  private parseRawSections(lines: string[]): NormalizedSection[] {
    const sections: NormalizedSection[] = [];
    let currentSection: NormalizedSection = { title: 'Doan 1', lines: [] };
    let pendingLyric: string | null = null;

    const flushPendingLyric = () => {
      if (!pendingLyric) {
        return;
      }
      currentSection.lines.push({ lyric: pendingLyric.trim(), notes: ' ' });
      pendingLyric = null;
    };

    const pushSection = () => {
      flushPendingLyric();
      if (currentSection.lines.length === 0) {
        return;
      }

      const existing = sections.find(
        (section) =>
          this.normalizeText(section.title) ===
          this.normalizeText(currentSection.title),
      );

      if (existing) {
        existing.lines.push(...currentSection.lines);
      } else {
        sections.push(currentSection);
      }
    };

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) {
        continue;
      }

      if (this.isSectionHeading(trimmed)) {
        pushSection();
        currentSection = {
          title: this.normalizeSectionTitle(trimmed),
          lines: [],
        };
        continue;
      }

      if (this.isLikelyNotesLine(trimmed)) {
        if (pendingLyric) {
          currentSection.lines.push({
            lyric: pendingLyric.trim(),
            notes: trimmed,
          });
          pendingLyric = null;
        } else {
          currentSection.lines.push({ lyric: ' ', notes: trimmed });
        }
        continue;
      }

      pendingLyric = pendingLyric ? `${pendingLyric} ${trimmed}` : trimmed;
    }

    pushSection();
    return sections;
  }

  normalize(normalizeSongDto: NormalizeSongDto) {
    const rawText = normalizeSongDto.rawText?.trim();
    if (!rawText) {
      throw new BadRequestException('rawText is required');
    }

    const rawLines = rawText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    const urlRegex = /https?:\/\/\S+/gi;
    const foundUrls = rawText.match(urlRegex) ?? [];
    const youtubeUrl = foundUrls.find((url) =>
      /youtube\.com|youtu\.be/i.test(url),
    );
    const mp3Url = foundUrls.find((url) => /\.mp3(\?|$)/i.test(url));

    const extractedTitle = this.extractTitle(rawLines);
    const filteredLines = rawLines.filter((line) => {
      if (/^https?:\/\/\S+$/i.test(line)) {
        return false;
      }
      return line !== extractedTitle;
    });

    const sections = this.parseRawSections(filteredLines)
      .map((section) => ({
        title: section.title.trim(),
        lines: section.lines
          .map((line) => ({
            lyric: line.lyric.trim() || ' ',
            notes: line.notes.trim() || ' ',
          }))
          .filter((line) => Boolean(line.lyric) || Boolean(line.notes)),
      }))
      .filter((section) => section.title && section.lines.length > 0);

    if (sections.length === 0) {
      throw new BadRequestException('Cannot parse sections from rawText');
    }

    const payload: CreateSongDto = {
      title:
        normalizeSongDto.title?.trim() || extractedTitle || 'Untitled Song',
      category: normalizeSongDto.category?.trim() || 'Nhac Tre',
      sections,
      audioUrl: normalizeSongDto.audioUrl?.trim() || mp3Url || youtubeUrl || '',
      images: [],
    };

    return {
      payload,
      meta: {
        sectionsCount: payload.sections?.length ?? 0,
        linesCount:
          payload.sections?.reduce(
            (sum, section) => sum + (section.lines?.length ?? 0),
            0,
          ) ?? 0,
      },
    };
  }

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

  async findBySlug(slug: string): Promise<Song> {
    if (!slug || slug.trim() === '') {
      throw new BadRequestException('Slug is required');
    }

    const song = await this.songModel.findOne({ slug: slug.trim() }).exec();

    if (!song) {
      throw new NotFoundException(`Song with slug '${slug}' not found`);
    }

    return song;
  }

  async create(createSongDto: CreateSongDto): Promise<Song> {
    // Generate slug from title
    const songData = {
      ...createSongDto,
      slug: generateSlug(createSongDto.title || 'untitled'),
    };

    const newSong = new this.songModel(songData);
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
