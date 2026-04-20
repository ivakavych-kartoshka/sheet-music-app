// app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AppService } from './app.service';
import { AppController } from './app.controller';
import { SongsModule } from './module/songs/songs.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

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

    SongsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
