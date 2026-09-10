import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { UsersService } from '../users/users.service';

export interface Admin {
  _id: string;
  username?: string;
  email?: string;
  password: string;
  role?: string;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectModel('Admin') private readonly adminModel: Model<Admin>,
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
  ) {}

  async login(loginDto: LoginDto) {
    const email = loginDto.email.trim().toLowerCase();
    const { password } = loginDto;

    const admin = await this.adminModel
      .findOne({ $or: [{ email }, { username: email }] })
      .exec();

    if (admin && (await bcrypt.compare(password, admin.password))) {
      const payload = {
        sub: admin._id.toString(),
        email: admin.email || email,
        name: admin.username || 'Admin',
        role: 'admin',
      };
      const token = this.jwtService.sign(payload);

      return {
        access_token: token,
        user: {
          id: admin._id.toString(),
          email: admin.email || email,
          name: admin.username || 'Admin',
          role: 'admin',
        },
      };
    }

    const user = await this.usersService.findByEmail(email);
    if (!user || !user.password) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }

    const payload = {
      sub: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
    };
    const token = this.jwtService.sign(payload);

    return {
      access_token: token,
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        role: user.role,
      },
    };
  }

  async loginWithGoogle(profile: {
    googleId: string;
    email: string;
    name: string;
    avatar: string;
  }) {
    const { user, mustSetPassword } =
      await this.usersService.findOrCreateByGoogle(profile);

    const payload = {
      sub: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
    };
    const token = this.jwtService.sign(payload);

    return {
      access_token: token,
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        role: user.role,
      },
      mustSetPassword,
    };
  }

  async setPassword(userId: string, password: string) {
    const updated = await this.usersService.setPassword(userId, password);
    if (!updated) {
      throw new UnauthorizedException('Không tìm thấy tài khoản');
    }
    return { success: true };
  }
}