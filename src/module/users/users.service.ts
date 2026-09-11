import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';

export interface User {
  _id: string;
  googleId?: string;
  email: string;
  name: string;
  avatar: string;
  password?: string;
  mustSetPassword?: boolean;
  role: string;
  createdAt: Date;
}

export interface Favorite {
  _id: string;
  userId: string;
  songId: any;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectModel('User') private readonly userModel: Model<User>,
    @InjectModel('Favorite') private readonly favoriteModel: Model<Favorite>,
  ) {}

  async findOrCreateByGoogle(profile: {
    googleId: string;
    email: string;
    name: string;
    avatar: string;
  }): Promise<{ user: User; mustSetPassword: boolean }> {
    let user = await this.userModel.findOne({ googleId: profile.googleId }).exec();

    if (!user && profile.email) {
      user = await this.userModel.findOne({ email: profile.email }).exec();
      if (user) {
        user.googleId = profile.googleId;
      }
    }

    if (!user) {
      user = await this.userModel.create({
        googleId: profile.googleId,
        email: profile.email,
        name: profile.name,
        avatar: profile.avatar,
        mustSetPassword: true,
      });
    } else {
      user.avatar = profile.avatar || user.avatar;
      user.name = profile.name || user.name;
      await user.save();
    }

    const hasPassword = Boolean(user.password);
    const mustSetPassword = user.mustSetPassword ?? !hasPassword;

    return {
      user,
      mustSetPassword,
    };
  }

  async findById(id: string): Promise<User | null> {
    return this.userModel.findById(id).select('-password').exec();
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userModel.findOne({ email: email.toLowerCase() }).exec();
  }

  async setPassword(userId: string, password: string): Promise<User | null> {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    return this.userModel
      .findByIdAndUpdate(
        userId,
        { password: hashedPassword, mustSetPassword: false },
        { new: true },
      )
      .exec();
  }

  async getFavorites(userId: string) {
    const favorites = await this.favoriteModel
      .find({ userId })
      .populate('songId')
      .exec();

    return favorites
      .map((fav) => fav.songId)
      .filter(Boolean);
  }

  async addFavorite(userId: string, songId: string) {
    const existing = await this.favoriteModel.findOne({ userId, songId }).exec();

    if (existing) {
      return existing;
    }

    return this.favoriteModel.create({ userId, songId });
  }

  async removeFavorite(userId: string, songId: string) {
    return this.favoriteModel.findOneAndDelete({ userId, songId }).exec();
  }

  async isFavorite(userId: string, songId: string): Promise<boolean> {
    const fav = await this.favoriteModel.findOne({ userId, songId }).exec();
    return !!fav;
  }

  async getFavoriteSongIds(userId: string): Promise<string[]> {
    const favorites = await this.favoriteModel.find({ userId }).select('songId').exec();
    return favorites.map((fav) => fav.songId.toString());
  }
}