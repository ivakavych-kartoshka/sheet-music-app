// app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AppService } from './app.service';
import { AppController } from './app.controller';
import { ApiKeyGuard } from './common/api-key.guard';
import { SongsModule } from './module/songs/songs.module';
import { AuthModule } from './module/auth/auth.module';
import { UsersModule } from './module/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => [
        {
          ttl: configService.get<number>('THROTTLE_TTL') ?? 60_000,
          limit: configService.get<number>('THROTTLE_LIMIT') ?? 120,
        },
      ],
    }),

    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const uri = configService.get<string>('MONGO_URI');
        console.log('📌 MongoDB URI:', uri);

        return {
          uri,
          autoIndex: true,
          connectionFactory: (connection) => {
            // Check connection state immediately
            console.log('📊 Connection readyState:', connection.readyState);

            connection.on('connecting', () => {
              console.log('🔄 MongoDB connecting...');
            });

            connection.on('connected', () => {
              console.log('✅ MongoDB connected successfully');
            });

            connection.on('error', (err) => {
              console.error('❌ MongoDB connection error:', err);
            });

            connection.on('disconnected', () => {
              console.log('⚠️ MongoDB disconnected');
            });

            // If already connected
            if (connection.readyState === 1) {
              console.log('✅ MongoDB already connected');
            }

            return connection;
          },
        };
      },
    }),

    AuthModule,
    SongsModule,
    UsersModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ApiKeyGuard,
    },
    AppService,
  ],
})
export class AppModule {}
