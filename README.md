# 🎼 SheetMusicApp — Backend API

REST API cho ứng dụng **Thư Viện FTC** — thư viện nhạc với sheet nhạc (PDF/ảnh), audio, lời và nốt nhạc, hỗ trợ yêu thích và quản trị bài hát.

| | |
|---|---|
| **Framework** | NestJS 11.1 |
| **Database** | MongoDB 9 qua Mongoose 11 |
| **Auth** | JWT (Passport) + Google OAuth2 + bcrypt |
| **Storage** | Cloudinary (upload stream trực tiếp từ server) |
| **Bảo vệ API** | Global `x-api-key` guard + rate limit (Throttler) |
| **Port mặc định** | `3000` |
| **Prefix** | **KHÔNG có** prefix — route nằm ở gốc (`/songs`, `/auth/login`, …) |

> **Quan trọng:** tiền tố `/api` mà trình duyệt thấy **không phải do NestJS tạo ra** — nó đến từ `rewrites` của Next.js frontend. Gọi trực tiếp backend là `http://localhost:3000/songs`, không phải `/api/songs`.

---

## 📑 Mục lục

1. [Yêu cầu hệ thống](#1-yêu-cầu-hệ-thống)
2. [Cài đặt nhanh](#2-cài-đặt-nhanh)
3. [Biến môi trường](#3-biến-môi-trường)
4. [Tạo tài khoản admin đầu tiên](#4-tạo-tài-khoản-admin-đầu-tiên)
5. [Cấu trúc thư mục](#5-cấu-trúc-thư-mục)
6. [Kiến trúc tổng thể](#6-kiến-trúc-tổng-thể)
7. [Danh sách API](#7-danh-sách-api)
8. [Xác thực & phân quyền](#8-xác-thực--phân-quyền)
9. [Rate limiting](#9-rate-limiting)
10. [Database — collections & schema](#10-database--collections--schema)
11. [Upload file lên Cloudinary](#11-upload-file-lên-cloudinary)
12. [Tính năng "Chuẩn hoá lời & nốt nhạc"](#12-tính-năng-chuẩn-hoá-lời--nốt-nhạc)
13. [Cấu hình từng phần](#13-cấu-hình-từng-phần)
14. [Scripts & lệnh thường dùng](#14-scripts--lệnh-thường-dùng)
15. [Testing](#15-testing)
16. [Kết nối với Frontend](#16-kết-nối-với-frontend)
17. [Deploy](#17-deploy)
18. [Lỗi thường gặp & xử lý](#18-lỗi-thường-gặp--xử-lý)
19. [Ghi chú bảo mật](#19-ghi-chú-bảo-mật)
20. [Phụ lục — điểm cần lưu ý trong code](#20-phụ-lục--điểm-cần-lưu-ý-trong-code)

---

## 1. Yêu cầu hệ thống

| Công cụ | Phiên bản | Ghi chú |
|---|---|---|
| **Node.js** | ≥ 20 (khuyến nghị 22.x) | Backend đã chạy với Node `v22.13.0` |
| **npm** | ≥ 10 | kèm Node 22 |
| **MongoDB** | 7.x trở lên | Có thể dùng [MongoDB Atlas](https://www.mongodb.com/atlas) miễn phí |
| **Tài khoản Cloudinary** | — | Bắt buộc nếu muốn upload audio/sheet |

Kiểm tra môi trường:

```bash
node -v     # v22.13.0
npm -v      # 10.9.2
```

> Dự án **không** có file `.nvmrc` và **không** khai báo `engines` trong `package.json`. Nếu máy bạn Node 18 sẽ lỗi.

---

## 2. Cài đặt nhanh

```bash
# 1. Di chuyển vào thư mục backend
cd D:\Year4\SheetMusicApp\backend

# 2. Cài dependencies
npm install

# 3. Tạo file .env từ file mẫu
copy .env.example .env        # Windows CMD
# cp .env.example .env        # macOS / Linux / Git Bash

# 4. Điền các biến môi trường vào .env
#    (xem phần [3. Biến môi trường](#3-biến-môi-trường))
notepad .env

# 5. Tạo tài khoản admin đầu tiên
npm run seed:admin

# 6. Chạy ở chế độ development (tự reload khi sửa code)
npm run start:dev
```

Kết quả mong đợi:

```
🚀 Server running on port 3000
📊 Connection readyState: 1
[Nest] ... RoutesResolver/SongsController {path: '/songs', ...}
```

Kiểm tra server còn sống:

```bash
curl http://localhost:3000
# -> Hello World!
```

### Chạy song song với Frontend

Backend chiếm **port 3000**, Frontend (Next.js) chạy **port 3001** để tránh xung đột:

```bash
# Terminal 1 — backend
cd D:\Year4\SheetMusicApp\backend
npm run start:dev          # http://localhost:3000

# Terminal 2 — frontend
cd D:\Year4\SheetMusicApp\frontend
npx next dev -p 3001       # http://localhost:3001
```

---

## 3. Biến môi trường

Tất cả biến nằm trong file `.env` ở thư mục gốc backend (đã được `.gitignore` loại trừ).
`ConfigModule.forRoot({ isGlobal: true })` nạp file này vào `process.env` cho toàn bộ ứng dụng.

### Bảng đầy đủ biến môi trường

| Biến | Bắt buộc | Mặc định | Được đọc ở đâu | Mô tả |
|---|:---:|---|---|---|
| `MONGO_URI` | ✅ | *(không có)* | `app.module.ts` | Chuỗi kết nối MongoDB. Thiếu → app không khởi động được. |
| `PORT` | ⬜ | `3000` | `main.ts` | Cổng HTTP server. |
| `JWT_SECRET` | ⬜ | `sheet-music-jwt-secret` ⚠️ | `auth.module.ts`, `jwt.strategy.ts` | Khóa ký/verify JWT. **Nên đặt trong production.** |
| `GOOGLE_CLIENT_ID` | ⬜ | `''` | `google.strategy.ts` | OAuth Client ID từ Google Cloud Console. |
| `GOOGLE_CLIENT_SECRET` | ⬜ | `''` | `google.strategy.ts` | OAuth Client Secret. |
| `GOOGLE_CALLBACK_URL` | ⬜ | `http://localhost:3000/auth/google/callback` ⚠️ | `google.strategy.ts` | Redirect URI đã đăng ký trong Google Console. |
| `CLIENT_URL` | ⬜ | `http://localhost:3001` | `auth.controller.ts` | URL frontend mà Google callback **chuyển hướng trình duyệt về**. |
| `CLOUDINARY_CLOUD_NAME` | ✅* | *(không có)* | `songs.service.ts` | Bắt buộc **khi upload file**. |
| `CLOUDINARY_API_KEY` | ✅* | *(không có)* | `songs.service.ts` | Bắt buộc **khi upload file**. |
| `CLOUDINARY_API_SECRET` | ✅* | *(không có)* | `songs.service.ts` | Bắt buộc **khi upload file**. |
| `API_KEY` | ✅ | *(không có)* | `common/api-key.guard.ts` | Shared secret. Mọi request phải gửi header `x-api-key` trùng giá trị này. **Phải khớp với `API_KEY` của frontend.** |
| `THROTTLE_TTL` | ⬜ | `60000` (ms) | `app.module.ts` | Cửa sổ rate limit toàn cục. |
| `THROTTLE_LIMIT` | ⬜ | `120` | `app.module.ts` | Số request tối đa / cửa sổ toàn cục. |

> ✅\* Ba biến Cloudinary chỉ bắt buộc khi gọi 3 endpoint upload. API vẫn chạy bình thường nếu thiếu, nhưng upload sẽ trả `400 Missing Cloudinary server environment variables.`

### File `.env` mẫu cho development

```env
# ---------- Server ----------
PORT=3000

# ---------- MongoDB ----------
# Local:  mongodb://127.0.0.1:27017/sheetmusicapp
# Atlas:  mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/sheetmusicapp?retryWrites=true&w=majority
MONGO_URI=mongodb+srv://admin:YOUR_PASSWORD@YOUR_CLUSTER.mongodb.net/sheetmusicapp?retryWrites=true&w=majority

# ---------- JWT ----------
JWT_SECRET=your-super-long-random-secret-here

# ---------- Google OAuth ----------
GOOGLE_CLIENT_ID=xxxxxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxx
GOOGLE_CALLBACK_URL=http://localhost:3001/api/auth/google/callback
CLIENT_URL=http://localhost:3001

# ---------- Cloudinary ----------
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=your_api_secret

# ---------- Shared secret (KHỚP với frontend) ----------
API_KEY=your-shared-secret-here

# ---------- Rate limit (tùy chọn) ----------
THROTTLE_TTL=60000
THROTTLE_LIMIT=120
```

> ⚠️ `.env.example` hiện tại **thiếu** `PORT`, `JWT_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`, `CLIENT_URL`. Hãy tự thêm khi copy.

### Lưu ý về `GOOGLE_CALLBACK_URL`

Vì Google OAuth **đi qua Next.js rewrite** (`/api/*` → backend), nên redirect URI phải là URL **của frontend**, không phải của backend:

- Development: `http://localhost:3001/api/auth/google/callback`
- Production: `https://sheet-music-app-client.vercel.app/api/auth/google/callback`

Cần đăng ký **cả hai** trong [Google Cloud Console → Credentials → OAuth 2.0 Client ID → Authorized redirect URIs].

---

## 4. Tạo tài khoản admin đầu tiên

Hệ thống **không có endpoint đăng ký**. Tài khoản chỉ được tạo qua Google OAuth hoặc bằng script seed.

```bash
npm run seed:admin
```

Script `src/seed-admin.ts`:
- Kết nối trực tiếp MongoDB bằng `mongoose.connect(MONGO_URI)` (không qua Nest).
- Tự định nghĩa lại schema `Admin` (trùng với `src/module/auth/admin.schema.ts`).
- Hash mật khẩu bằng `bcrypt.genSalt(10)`.
- **Idempotent** — bỏ qua (không lỗi) nếu username hoặc email đã tồn tại.
- Tự `disconnect()` trong `finally`.

### Tài khoản mặc định (⚠️ phải đổi khi lên production)

| Trường | Giá trị hard-code |
|---|---|
| Username | `admin` |
| Email | `admin@ftc.com` |
| Password | `admin123` |

Các giá trị này nằm cứng ở đầu `src/seed-admin.ts`:

```ts
const ADMIN_USERNAME = 'admin';
const ADMIN_EMAIL = 'admin@ftc.com';
const ADMIN_PASSWORD = 'admin123';
```

**Hãy sửa chúng trước khi chạy trên môi trường thật.**

### Đăng nhập admin

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-shared-secret-here" \
  -d '{"email":"admin@ftc.com","password":"admin123"}'
```

Trả về:

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "6f1a2b3c4d5e6f7a8b9c0d1e",
    "email": "admin@ftc.com",
    "name": "admin",
    "role": "admin"
  }
}
```

Trường `email` chấp nhận **cả email lẫn username** (truy vấn `$or: [{ email }, { username: email }]`).

### Tạo tài khoản người dùng

- **Cách 1 (khuyến nghị):** đăng nhập bằng Google tại `/verify-password` → hệ thống tự tạo user, đặt `mustSetPassword: true`.
- **Cách 2:** để admin đó gán role `admin` trong collection `users` bằng MongoDB Compass / Atlas UI.

> Lưu ý: `GET /users/me` tra cứu trong collection `users`, nên **tài khoản admin seed sẽ không đọc được profile** qua endpoint này (trả 404). Điều này là bình thường với thiết kế hiện tại.

---

## 5. Cấu trúc thư mục

```
backend/
├── .env                          # biến môi trường thật (gitignored)
├── .env.example                  # file mẫu (thiếu vài biến — xem ghi chú)
├── .gitignore
├── .prettierrc                   # singleQuote: true, trailingComma: "all"
├── eslint.config.mjs             # ESLint 9 flat config + typescript-eslint + prettier
├── nest-cli.json                 # sourceRoot: src, deleteOutDir: true
├── package.json                  # scripts + cấu hình jest inline
├── tsconfig.json                 # target ES2023, module nodenext
├── tsconfig.build.json
├── dist/                         # output sau khi build (gitignored)
│
├── src/
│   ├── main.ts                   # bootstrap: CORS, ValidationPipe, listen
│   ├── app.module.ts             # ConfigModule, Throttler, Mongoose, guards
│   ├── app.controller.ts         # GET / -> "Hello World!"
│   ├── app.service.ts
│   ├── app.controller.spec.ts    # test mặc định
│   ├── seed-admin.ts             # script tạo admin (chạy ngoài Nest)
│   │
│   ├── common/
│   │   └── api-key.guard.ts      # global x-api-key guard
│   │
│   └── module/
│       ├── auth/
│       │   ├── auth.controller.ts
│       │   ├── auth.service.ts
│       │   ├── auth.module.ts
│       │   ├── admin.schema.ts            # collection "admins"
│       │   ├── admin.guard.ts             # JWT + role === 'admin'
│       │   ├── jwt.strategy.ts
│       │   ├── jwt-auth.guard.ts
│       │   ├── google.strategy.ts
│       │   └── dto/
│       │       ├── login.dto.ts
│       │       └── set-password.dto.ts
│       │
│       ├── songs/
│       │   ├── songs.controller.ts
│       │   ├── songs.service.ts   # 556 dòng — gồm bộ parse normalize()
│       │   ├── songs.module.ts
│       │   ├── songs.schema.ts    # collection "songs" + generateSlug()
│       │   └── dto/
│       │       ├── create-song.dto.ts
│       │       └── normalize-song.dto.ts
│       │
│       └── users/
│           ├── users.controller.ts
│           ├── users.service.ts
│           ├── users.module.ts
│           ├── user.schema.ts     # collection "users"
│           └── favorite.schema.ts # collection "favorites"
│
└── test/
    ├── app.e2e-spec.ts
    └── jest-e2e.json
```

**Tổng cộng 30 file TypeScript trong `src/`.**

> Dự án **không** có `src/common/decorators`, `filters`, `interceptors`, `pipes`, `utils`; **không** có `src/config/`; **không** có Swagger; **không** có versioning API.

---

## 6. Kiến trúc tổng thể

### Luồng request

```
Browser
  ↓  Authorization: Bearer <jwt>
Next.js (port 3001)
  ├─ proxy.ts      → gắn header  x-api-key: <API_KEY>   (matcher: /api/:path*)
  └─ next.config.ts→ rewrite      /api/:path*  →  http://localhost:3000/:path*
  ↓
NestJS (port 3000)
  ├─ CORS allow-list (localhost mọi port + https://sheet-music-app-client.vercel.app)
  ├─ ThrottlerGuard   (APP_GUARD #1) — rate limit
  ├─ ApiKeyGuard      (APP_GUARD #2) — kiểm tra x-api-key
  ├─ ValidationPipe   (global) — whitelist + forbidNonWhitelisted + transform
  └─ Route handler (JwtAuthGuard / AdminGuard nếu route yêu cầu)
  ↓
MongoDB (Atlas)  ·  Cloudinary (upload)
```

### `src/main.ts` (đầy đủ)

```ts
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: [
      /^http:\/\/localhost:\d+$/,
      /^http:\/\/127\.0\.0\.1:\d+$/,
      'https://sheet-music-app-client.vercel.app',
    ],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`🚀 Server running on port ${port}`);
}
void bootstrap();
```

| Cấu hình | Giá trị | Ghi chú |
|---|---|---|
| Global prefix | **không có** | Route ở gốc server |
| Versioning | **không có** | `enableVersioning` không được gọi |
| Swagger | **không có** | `@nestjs/swagger` chưa cài |
| CORS origin | 2 regex localhost + 1 domain prod | `credentials: true` |
| ValidationPipe | `whitelist`, `forbidNonWhitelisted`, `transform` | Không bật `enableImplicitConversion` |
| Security headers | **không có** | Không cài `helmet` |

> ⚠️ `forbidNonWhitelisted: true` nghĩa là **gửi thừa 1 field lạ sẽ bị 400** ngay, kể cả ở query string. Rất dễ gây khó chịu khi debug — hãy kiểm tra payload.

### `src/app.module.ts`

```ts
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRootAsync({ /* THROTTLE_TTL ?? 60_000, THROTTLE_LIMIT ?? 120 */ }),
    MongooseModule.forRootAsync({ /* MONGO_URI, autoIndex: true */ }),
    AuthModule,
    SongsModule,
    UsersModule,
  ],
  controllers: [AppController],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: ApiKeyGuard },
    AppService,
  ],
})
export class AppModule {}
```

Guard toàn cục chạy theo thứ tự: rate limit → API key.

---

## 7. Danh sách API

**Base URL dev:** `http://localhost:3000`
**Qua frontend:** `http://localhost:3001/api/...`

### Yêu cầu bắt buộc

| Header | Bắt buộc | Mô tả |
|---|:---:|---|
| `x-api-key` | ✅ hầu hết route | Phải bằng `process.env.API_KEY`. Ngoại lệ: `GET /`, `GET /auth/google`, `GET /auth/google/callback`, mọi request `OPTIONS`. |
| `Authorization: Bearer <jwt>` | tùy route | Bắt buộc với toàn bộ `/users/*` và `/auth/set-password`. |
| `Content-Type: application/json` | khi có body | Với endpoint upload dùng `multipart/form-data` (do axios tự set). |

### Bảng đầy đủ

| # | Method | Path | Auth | Rate limit | Mô tả |
|---|---|---|---|---|---|
| 1 | `GET` | `/` | — | 120/ph | Health check → `Hello World!` |
| 2 | `POST` | `/auth/login` | — | 5/ph | Đăng nhập email/username + mật khẩu |
| 3 | `GET` | `/auth/google` | — | 10/ph | Khởi động Google OAuth (302) |
| 4 | `GET` | `/auth/google/callback` | — | 10/ph | Google gọi về (302 về frontend) |
| 5 | `POST` | `/auth/set-password` | Bearer | 5/ph | Đặt mật khẩu cho user Google |
| 6 | `GET` | `/users/me` | Bearer | 60/ph | Thông tin người dùng hiện tại (không kèm password) |
| 7 | `GET` | `/users/favorites` | Bearer | 60/ph | Danh sách bài yêu thích (đã populate) |
| 8 | `GET` | `/users/favorites/ids` | Bearer | 60/ph | `{ songIds: string[] }` |
| 9 | `GET` | `/users/favorites/check/:songId` | Bearer | 60/ph | `{ isFavorite: boolean }` |
| 10 | `POST` | `/users/favorites/:songId` | Bearer | 20/ph | Thêm yêu thích (idempotent) |
| 11 | `DELETE` | `/users/favorites/:songId` | Bearer | 20/ph | Xoá yêu thích (idempotent) |
| 12 | `GET` | `/songs` | — | 60/ph | Danh sách bài hát có phân trang + tìm kiếm |
| 13 | `GET` | `/songs/categories` | — | 60/ph | Danh sách thể loại (`string[]`) |
| 14 | `GET` | `/songs/:id` | — | 60/ph | Chi tiết bài hát theo ObjectId |
| 15 | `GET` | `/songs/slug/:slug` | — | 60/ph | Chi tiết bài hát theo slug |
| 16 | `POST` | `/songs` | **Admin** | 10/ph | Tạo bài hát |
| 17 | `POST` | `/songs/normalize` | **Admin** | 10/ph | Chuẩn hoá text thô → payload có cấu trúc |
| 18 | `PUT` | `/songs/:id` | **Admin** | 10/ph | Cập nhật bài hát (**thay thế toàn bộ**) |
| 19 | `DELETE` | `/songs/:id` | **Admin** | 10/ph | Xoá bài hát |
| 20 | `POST` | `/songs/upload-audio` | **Admin** | 5/ph | Upload 1 file mp3 (≤ 20 MB) |
| 21 | `POST` | `/songs/upload-sheet` | **Admin** | 5/ph | Upload 1 sheet (≤ 15 MB) |
| 22 | `POST` | `/songs/upload-sheets` | **Admin** | 2/ph | Upload tối đa 20 sheet (≤ 15 MB mỗi file) |

Ngoài ra mọi route còn chịu thêm rate limit toàn cục **120 req/phút**.

> ⚠️ **Route #15 không hoạt động.** Trong `songs.controller.ts`, `@Get(':id')` được khai báo **trước** `@Get('slug/:slug')`, nên NestJS match `/songs/slug/abc` vào `:id = "slug"` → trả `400 Invalid song ID: slug`. Frontend hiện **phải gọi trực tiếp** `${NEXT_PUBLIC_API_URL}/songs/slug/:slug` từ server component (bỏ qua rewrite `/api`) — đây là lý do bạn sẽ thấy `fetch` thẳng backend trong `app/songs/[id]/page.tsx`.
>
> **Cách sửa:** đổi thứ tự khai báo, đặt `@Get('slug/:slug')` **trước** `@Get(':id')`.

---

## 8. Xác thực & phân quyền

### 8.1 `ApiKeyGuard` — lớp bảo vệ đầu tiên

`src/common/api-key.guard.ts`:

```ts
@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly allowedPaths = new Set([
    '/',
    '/auth/google',
    '/auth/google/callback',
  ]);

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request & { method: string }>();

    if (request.method === 'OPTIONS') return true;
    if (this.allowedPaths.has(request.path)) return true;

    const expected = process.env.API_KEY;
    const provided = request.header('x-api-key');

    if (!expected || provided !== expected) {
      throw new UnauthorizedException('API key is missing or invalid');
    }
    return true;
  }
}
```

| Điểm cần biết | Chi tiết |
|---|---|
| Header | `x-api-key` (không phân biệt hoa thường) |
| Cách so sánh | So chuỗi thẳng — **không** dùng timing-safe compare |
| Nếu `API_KEY` chưa set | **Mọi** route (trừ allowlist) trả `401` |
| Vì sao exempt OAuth? | Google chuyển hướng trình duyệt thẳng tới callback → không thể gắn custom header |

**Gọi bằng curl/Postman phải tự thêm header:**

```bash
curl http://localhost:3000/songs -H "x-api-key: your-shared-secret-here"
```

### 8.2 JWT

| Thuộc tính | Giá trị |
|---|---|
| Thư viện | `@nestjs/jwt` + `passport-jwt` |
| Thuật toán | HS256 (mặc định) |
| Payload | `{ sub, email, name, role }` |
| Hạn | **7 ngày** (`signOptions: { expiresIn: '7d' }`) |
| Refresh token | ❌ **không có** |
| Endpoint refresh | ❌ **không có** |
| Nơi lưu | `localStorage` phía client (không dùng cookie) |

`JwtStrategy.validate()` biến payload thành:

```ts
{ userId: payload.sub, email: payload.email, name: payload.name, role: payload.role }
```

> ⚠️ Lưu ý: `req.user.userId` (không phải `req.user._id`).

Client tự kiểm tra hạn token bằng cách decode payload:

```ts
export const isLoggedIn = () => {
  const token = localStorage.getItem("access_token");
  if (!token) return false;
  try {
    return JSON.parse(atob(token.split(".")[1])).exp * 1000 > Date.now();
  } catch {
    return false;
  }
};
```

### 8.3 Guards

| Guard | File | Logic |
|---|---|---|
| `ThrottlerGuard` | `@nestjs/throttler` | Rate limit, đăng ký global |
| `ApiKeyGuard` | `common/api-key.guard.ts` | Kiểm tra `x-api-key`, đăng ký global |
| `JwtAuthGuard` | `auth/jwt-auth.guard.ts` | `extends AuthGuard('jwt')` — cần Bearer token hợp lệ |
| `AdminGuard` | `auth/admin.guard.ts` | `extends AuthGuard('jwt')` + ép `user.role === 'admin'` |

```ts
// admin.guard.ts
export class AdminGuard extends AuthGuard('jwt') {
  handleRequest(err: any, user: any) {
    if (err || !user || user.role !== 'admin') {
      throw new UnauthorizedException('Không có quyền truy cập quản trị');
    }
    return user;
  }
}
```

> Dự án **không** dùng thư viện RBAC. Kiểm tra role được hard-code trong `AdminGuard`.
> `AdminGuard` áp dụng cho **toàn bộ 8 route ghi/xoá/upload** của songs.

### 8.4 Google OAuth — luồng đầy đủ

```
1. Người dùng bấm "Đăng nhập Google" ở /verify-password
        ↓
2. Frontend: window.location.href = "/api/auth/google"
        ↓
3. Next.js rewrite  →  GET backend /auth/google
        ↓
4. AuthGuard('google') → 302 tới màn hình consent Google
        ↓
5. Người dùng đồng ý  →  Google gọi về  /auth/google/callback
        ↓
6. GoogleStrategy.validate() chuẩn hoá profile:
       { googleId, email, name, avatar }
        ↓
7. AuthService.loginWithGoogle() → UsersService.findOrCreateByGoogle()
       • tìm theo googleId
       • không có → tìm theo email (và ghi back-fill googleId)
       • không có → tạo mới với mustSetPassword: true
        ↓
8. Ký JWT → 302 tới:
     {CLIENT_URL}/auth/callback?access_token=…&name=…&email=…&avatar=…&must_set_password=1|0

   (hoặc  {CLIENT_URL}/verify-password?error=auth_failed  nếu lỗi)
        ↓
9. Frontend /auth/callback lưu localStorage, chuyển hướng:
     must_set_password === "1"  →  /set-password
     ngược lại                   →  /
```

> ⚠️ **Token nằm trong query string** → sẽ xuất hiện trong browser history, `Referer` header và access log của server. Đây là rủi ro bảo mật đã biết.

### 8.5 Bảng mật khẩu

| Cơ chế | Chi tiết |
|---|---|
| Thuật toán | `bcrypt` 6 (native) |
| Salt rounds | `genSalt(10)` |
| Hash khi ghi | `seed-admin.ts`, `UsersService.setPassword` |
| So khớp | `bcrypt.compare` trong `AuthService.login` |
| Giới hạn độ dài | 6–72 ký tự (`@MinLength(6) @MaxLength(72)` — 72 là giới hạn input của bcrypt) |

### 8.6 Hai nguồn định danh, một định dạng token

`AuthService.login()` tra cứu theo thứ tự:

1. Collection `admins` với `$or: [{ email }, { username: email }]` → `bcrypt.compare`
2. Nếu không khớp → collection `users` qua `UsersService.findByEmail` → yêu cầu `user.password` phải tồn tại

> User chỉ đăng nhập bằng Google (chưa đặt mật khẩu) **không thể** đăng nhập bằng password — `user.password` là chuỗi rỗng.

---

## 9. Rate limiting

Dùng `@nestjs/throttler` với một bucket duy nhất tên `default`.

| Phạm vi | Limit | TTL |
|---|---:|---:|
| Toàn cục (mọi route) | 120 | 60 000 ms (đổi bằng `THROTTLE_TTL`) |
| `AuthController` (mặc định) | 30 | 60 000 ms |
| `POST /auth/login` | **5** | 60 000 ms |
| `GET /auth/google`, `/callback` | 10 | 60 000 ms |
| `POST /auth/set-password` | 5 | 60 000 ms |
| `UsersController` (mặc định) | 60 | 60 000 ms |
| `POST/DELETE /users/favorites/:songId` | 20 | 60 000 ms |
| `SongsController` (mặc định) | 60 | 60 000 ms |
| `POST/PUT/DELETE /songs*` | 10 | 60 000 ms |
| `POST /songs/upload-audio`, `/upload-sheet` | 5 | 60 000 ms |
| `POST /songs/upload-sheets` | **2** | 60 000 ms |

Khi vượt limit, response là `429 Too Many Requests` do `@nestjs/throttler` trả về.

> Endpoint `/upload-sheets` chỉ cho phép **2 request/phút** — chọn nhiều file cùng lúc, đừng upload tuần tự từng file.

---

## 10. Database — collections & schema

MongoDB Atlas, kết nối qua `MongooseModule.forRootAsync` với `autoIndex: true` (index được tạo tự động khi khởi động).

### `songs` — `src/module/songs/songs.schema.ts`

| Field | Kiểu | Ràng buộc |
|---|---|---|
| `title` | String | `required: true` |
| `slug` | String | `required: true, unique: true` — tự sinh |
| `category` | String | tuỳ chọn |
| `sections` | `[{ title: String, lines: [{ lyric: String, notes: String }] }]` | sub-document lồng nhau |
| `audioUrl` | String | URL Cloudinary / YouTube |
| `sheetUrl` | String | sheet chính (legacy) |
| `sheetUrls` | `[String]` | nhiều trang sheet |
| `images` | `[String]` | **chưa endpoint nào ghi vào** |

Slug được sinh tự động bởi hook `pre('save')`:

```ts
export function generateSlug(title: string): string {
  return title
    .toLowerCase().trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')   // bỏ dấu tiếng Việt
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}
```

```ts
SongSchema.pre('save', function (this: any) {
  if (this.isModified('title') || this.isNew) {
    this.slug = generateSlug(this.title);
  }
});
```

Ví dụ: `"Nắng Của Em Tôi"` → `nang-cua-em-toi`

> ⚠️ **Cạm bẫy:** `PUT /songs/:id` dùng `findByIdAndUpdate` nên hook `pre('save')` **không chạy** → đổi `title` sẽ **giữ nguyên slug cũ**. `create()` bù lại bằng cách gán `slug` thủ công.
>
> ⚠️ **Cạm bẫy:** slug chỉ là `unique`, **không có xử lý trùng**. Hai bài hát trùng tên sẽ gây lỗi `E11000 duplicate key`. Nên thêm hậu tố `-2`, `-3`… khi `save()` bị lỗi duplicate.

### `users` — `src/module/users/user.schema.ts`

| Field | Kiểu | Ràng buộc |
|---|---|---|
| `googleId` | String | `unique: true, sparse: true` |
| `email` | String | `required: true, unique: true` |
| `name` | String | `required: true` |
| `avatar` | String | `default: ''` |
| `password` | String | `default: ''` — rỗng nghĩa là tài khoản Google-only |
| `mustSetPassword` | Boolean | `default: false` |
| `role` | String | `enum: ['user','admin']`, `default: 'user'` |
| `createdAt` | Date | `default: Date.now` |

### `favorites` — `src/module/users/favorite.schema.ts`

| Field | Kiểu | Ràng buộc |
|---|---|---|
| `userId` | `ObjectId` | `ref: 'User'`, `required` |
| `songId` | `ObjectId` | `ref: 'Song'`, `required` |

```ts
// Index duy nhất được khai báo tường minh trong cả dự án
FavoriteSchema.index({ userId: 1, songId: 1 }, { unique: true });
```

> Schema nằm trong module `users` nhưng `ref` trỏ tới `'Song'` — model do `SongsModule` đăng ký. Hoạt động bình thường vì Mongoose không cần model tồn tại lúc khai báo.

### `admins` — `src/module/auth/admin.schema.ts`

| Field | Kiểu | Ràng buộc |
|---|---|---|
| `username` | String | `unique: true, sparse: true` |
| `email` | String | `unique: true, sparse: true` |
| `password` | String | `required: true` (bcrypt hash) |
| `role` | String | `default: 'admin'` |

Không có `timestamps`.

### Điểm cần lưu ý

- ❌ **Không có** framework migration — chỉ có script `seed-admin.ts`.
- ❌ **Không có** transaction.
- ⚠️ Collection `songs` **không có index** cho `title` hay `category`, trong khi `findAll` dùng `$regex` trên `title` rồi `sort({ title: 1 })` → quét toàn bộ collection. Đây là nút thắt hiệu năng chính.
- ⚠️ `GET /songs` **không dùng projection** → trả về toàn bộ mảng `sections` lồng nhau cho mỗi item. Nên cân nhắc `.select('title slug category')` + endpoint riêng cho chi tiết.

---

## 11. Upload file lên Cloudinary

File được nhận vào **bộ nhớ** (buffer) rồi stream thẳng lên Cloudinary. **Không ghi file tạm xuống ổ đĩa.**

### Bảng giới hạn

| Endpoint | Field | Số file tối đa | Dung lượng/file | Định dạng | Cloudinary `resource_type` | Folder |
|---|---|---:|---:|---|---|---|
| `POST /songs/upload-audio` | `file` | 1 | **20 MB** | `.mp3` / `audio/mpeg` | `video` | `sheet-music-app/beats` |
| `POST /songs/upload-sheet` | `file` | 1 | **15 MB** | `.png` `.jpg` `.jpeg` `.pdf` | `auto` | `sheet-music-app/sheets` |
| `POST /songs/upload-sheets` | `files` | **20** | **15 MB** | như trên | `auto` | `sheet-music-app/sheets` |

### Response

```jsonc
// upload-audio
{ "audioUrl": "https://res.cloudinary.com/.../sheet-music-app/beats/abc123.mp3" }

// upload-sheet
{ "sheetUrl": "https://res.cloudinary.com/.../sheet-music-app/sheets/abc123.png" }

// upload-sheets  (thứ tự giữ nguyên nhờ Promise.all)
{ "sheetUrls": ["https://.../1.png", "https://.../2.pdf"] }
```

### Ví dụ curl

```bash
curl -X POST http://localhost:3000/songs/upload-audio \
  -H "x-api-key: your-shared-secret" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@beat.mp3;type=audio/mpeg"
```

```bash
curl -X POST http://localhost:3000/songs/upload-sheets \
  -H "x-api-key: your-shared-secret" \
  -H "Authorization: Bearer $TOKEN" \
  -F "files=@trang-1.png" \
  -F "files=@trang-2.png" \
  -F "files=@trang-3.pdf"
```

### Vài điểm kỹ thu

| Vấn đề | Giải thích |
|---|---|
| MP3 dùng `resource_type: 'video'` | Cloudinary yêu cầu vậy cho file audio > 8 MB. `secure: true` giúp URL trả về là HTTPS. |
| Validate mime **hoặc** extension | `isSupported = mimetype khớp \|\| tên file kết thúc bằng ext` — chỉ cần một cái đúng là qua. |
| Không có `multer.fileFilter` | File được buffer **toàn bộ** vào RAM rồi mới validate → rủi ro memory nếu request nhiều file lớn. |
| Không tự xoá asset Cloudinary | `DELETE /songs/:id` chỉ xoá document MongoDB, file trên Cloudinary bị **bỏ mồ côi**. Nên thêm cleanup bằng `cloudinary.uploader.destroy()`. |
| `images: [String]` không dùng | Không endpoint nào ghi vào trường này. |
| Config mỗi lần upload | `getCloudinaryConfig()` đọc `process.env` và gọi `cloudinary.config(...)` **mỗi request** thay vì 1 lần lúc bootstrap. |

### Lấy Cloudinary credentials

1. Vào [cloudinary.com](https://cloudinary.com) → đăng ký miễn phí
2. Dashboard → copy **Cloud name**, **API key**, **API secret**
3. Điền vào `.env` với tiền tố `CLOUDINARY_`

---

## 12. Tính năng "Chuẩn hoá lời & nốt nhạc"

`POST /songs/normalize` (Admin) — bộ parser **tự viết bằng TypeScript**, không dùng AI/LLM. Nhận một khối text thô rồi tách thành cấu trúc `sections[].lines[]`.

### Input

```ts
{
  rawText: string;   // bắt buộc (không có @IsOptional)
  title?: string;    // tuỳ chọn — nếu có sẽ ghi đè title tự trích
  category?: string; // tuỳ chọn — mặc định "Nhac Tre"
  audioUrl?: string; // tuỳ chọn
}
```

### Output

```json
{
  "payload": {
    "title": "Untitled Song",
    "category": "Nhac Tre",
    "sections": [
      {
        "title": "Doan 1",
        "lines": [
          { "lyric": "Một ngày mùa thu nắng", "notes": "do re mi fa sol" }
        ]
      }
    ],
    "audioUrl": "",
    "sheetUrl": "",
    "sheetUrls": [],
    "images": []
  },
  "meta": { "sectionsCount": 1, "linesCount": 1 }
}
```

> ⚠️ Endpoint **trả về payload, KHÔNG lưu vào database.** Client phải `POST` payload đó tới `/songs` sau.

### Cách parser hoạt động

| Hàm private | Vai trò |
|---|---|
| `normalizeText` | NFD + bỏ dấu + lowercase + trim — dùng để so khớp không phân biệt dấu |
| `isLikelyNotesLine` | Tách theo dấu câu, khớp pattern solfège (`do\|re\|mi\|fa\|sol\|la\|si` + `#`/`b`) hoặc chữ cái `a–g` kèm dấu phẩm/octave. Cần **≥ 50% token** là note |
| `normalizeSectionTitle` | Bỏ `[` `]` và dấu `:` cuối, rồi map prefix → `Diep Khuc Len Tone` / `Diep Khuc` / `RAP` / `Bridge` / `Nhac Giua` / `Doan Ket`, mặc định `'Doan 1'` |
| `isSectionHeading` | Khớp `/^\[.+\]$/`, `doan \d+`, `doan ket`, `rap`, `bridge`, `intro`, `outro`, `nhac`, `diep khuc`, hoặc dòng kết thúc bằng `:` (và không phải dòng note) |
| `extractTitle` | Chỉ chạy nếu dòng đầu bắt đầu bằng `cam am`/`cảm âm`; bỏ tiền tố `C Am` và hậu tố khoá `A-G#b` |
| `parseRawSections` | Ghép cặp: dòng lời đang chờ ↔ dòng note tiếp theo. Gộp section trùng tên. Lời/note rỗng → thay bằng `' '` (một space) |

### Ví dụ text đầu vào

```
Cảm âm: Am
[Đoạn 1]
Một ngày mùa thu nắng
do re mi fa sol
Chuyến xe đưa em đi
la si do re mi

[RAP]
Bước chân trên phố
fa sol la si do
https://www.youtube.com/watch?v=abc123
```

Kết quả:
- `title` → `''` (không có prefix `Cảm âm` ở đúng vị trí) → fallback `'Untitled Song'`
- `category` → `'Nhac Tre'`
- 2 section: `Doan 1` (2 dòng) và `RAP` (1 dòng)
- `audioUrl` → URL YouTube được tự động trích ra
- Dòng chỉ chứa URL bị loại bỏ

### Lỗi

Nếu không phát hiện được section nào:

```
400 Bad Request: Cannot parse sections from rawText
```

---

## 13. Cấu hình từng phần

Dự án **không** có thư mục `src/config/`. Mọi cấu hình nằm nội tuyến:

| Mối quan tâm | Vị trí | Cơ chế |
|---|---|---|
| Nạp env | `app.module.ts` | `ConfigModule.forRoot({ isGlobal: true })` |
| Kết nối DB | `app.module.ts` | `MongooseModule.forRootAsync` đọc `MONGO_URI` |
| Rate limit | `app.module.ts` | `ThrottlerModule.forRootAsync` đọc `THROTTLE_TTL`/`THROTTLE_LIMIT` |
| JWT ký token | `auth/auth.module.ts` | `JwtModule.registerAsync` đọc `JWT_SECRET` |
| JWT verify | `auth/jwt.strategy.ts` | `configService.get('JWT_SECRET')` |
| Google OAuth | `auth/google.strategy.ts` | đọc `GOOGLE_*` |
| URL redirect OAuth | `auth/auth.controller.ts` | đọc `CLIENT_URL` |
| Cloudinary | `songs/songs.service.ts` → `getCloudinaryConfig()` | đọc `CLOUDINARY_*` từ `process.env` |
| API key | `common/api-key.guard.ts` | đọc `API_KEY` từ `process.env` |

> ⚠️ `songs.service.ts` và `api-key.guard.ts` đọc thẳng `process.env` thay vì qua `ConfigService`. Chạy được vì `ConfigModule` là global và ghi vào `process.env`, nhưng không nhất quán với phần còn lại.

### `tsconfig.json` (chọn lọc)

```jsonc
{
  "compilerOptions": {
    "module": "nodenext",
    "target": "ES2023",
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "strictNullChecks": true,
    "noImplicitAny": false,   // ⚠️ lỏng — rủi ro gõ sai type
    "outDir": "./dist",
    "declaration": true,
    "sourceMap": true,
    "incremental": true
  }
}
```

Không có `include`/`exclude`, không có `baseUrl`/`paths`.
`tsconfig.build.json` loại trừ `node_modules`, `test`, `dist`, `**/*spec.ts`.

### `eslint.config.mjs`

- ESLint 9 **flat config**
- `eslint.configs.recommended` + `tseslint.configs.recommendedTypeChecked`
- `eslint-plugin-prettier/recommended`
- `projectService: true`, `sourceType: 'commonjs'`
- `no-explicit-any: off`
- `no-floating-promises`, `no-unsafe-*` → `warn`
- `prettier/prettier: ['error', { endOfLine: 'auto' }]`

### `.prettierrc`

```json
{ "singleQuote": true, "trailingComma": "all" }
```

---

## 14. Scripts & lệnh thường dùng

| Script | Lệnh | Mô tả |
|---|---|---|
| `npm run start:dev` | `nest start --watch` | Chạy dev, tự reload khi sửa file |
| `npm start` | `nest start` | Chạy dev không watch |
| `npm run start:debug` | `nest start --debug --watch` | Debug với inspector |
| `npm run build` | `nest build` | Build ra `dist/` (xoá `dist` cũ trước) |
| `npm run start:prod` | `node dist/main` | Chạy bản build |
| `npm run lint` | `eslint "..." --fix` | Lint + tự sửa |
| `npm run format` | `prettier --write "src/**/*.ts" "test/**/*.ts"` | Format code |
| `npm run seed:admin` | `ts-node -r tsconfig-paths/register src/seed-admin.ts` | Tạo tài khoản admin |
| `npm test` | `jest` | Unit test (`*.spec.ts` trong `src/`) |
| `npm run test:watch` | `jest --watch` | Unit test chế độ watch |
| `npm run test:cov` | `jest --coverage` | Unit test + coverage ra `../coverage` |
| `npm run test:e2e` | `jest --config ./test/jest-e2e.json` | E2E test (`*.e2e-spec.ts` trong `test/`) |

### Kiểm tra sức khỏe nhanh

```bash
curl http://localhost:3000                                  # -> Hello World!
curl http://localhost:3000/songs -H "x-api-key: $API_KEY"   # -> danh sách bài
curl http://localhost:3000/songs/categories -H "x-api-key: $API_KEY"
```

### Chạy production

```bash
npm run build
NODE_ENV=production node dist/main.js
```

Trên Windows, để chạy nền và ghi log:

```powershell
node dist/main.js > server.out.log 2> server.err.log
```

> Thư mục gốc có sẵn `server.out.log`, `server.err.log`, `server-rl.out.log`, `server-rl.err.log`, `frontend-mb.out.log`, `frontend-mb.err.log` từ các lần chạy thử trước (đã gitignore qua `*.log`).

---

## 15. Testing

| Hạng mục | Chi tiết |
|---|---|
| Framework | Jest 30 + ts-jest 29 + `@nestjs/testing` 11 + supertest 7 |
| Cấu hình unit | **inline trong `package.json`** — `rootDir: "src"`, `testRegex: ".*\\.spec\\.ts$"` |
| Cấu hình e2e | `test/jest-e2e.json` — `rootDir: "."`, `testRegex: ".e2e-spec.ts$"` |
| File unit | `src/app.controller.spec.ts` — assert `getHello() === 'Hello World!'` |
| File e2e | `test/app.e2e-spec.ts` — boot `AppModule`, assert `GET /` → 200 |

```bash
npm test              # unit
npm run test:cov      # unit + coverage
npm run test:e2e      # e2e
npm run test:debug    # debug từng dòng
```

### ⚠️ Giới hạn của test hiện tại

- **Độ phủ gần như bằng 0** — không có test nào cho auth, songs, users hay upload.
- `test/app.e2e-spec.ts` boot toàn bộ `AppModule` nên **cần** `MONGO_URI` hợp lệ và `API_KEY` đã set, nếu không sẽ fail. (Request `GET /` vẫn pass vì nằm trong allowlist của `ApiKeyGuard`.)

### Gợi ý thêm test

```ts
// src/module/songs/songs.service.spec.ts — ví dụ khung
import { Test } from '@nestjs/testing';
import { SongsService } from './songs.service';
import { getModelToken } from '@nestjs/mongoose';

describe('SongsService', () => {
  let service: SongsService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        SongsService,
        { provide: getModelToken('Song'), useValue: mockSongModel },
      ],
    }).compile();

    service = moduleRef.get(SongsService);
  });

  it('should return paginated songs', async () => {
    // ...
  });
});
```

---

## 16. Kết nối với Frontend

Backend **không** có `setGlobalPrefix`, nên frontend phải rewrite thủ công trong `next.config.ts`:

```ts
async rewrites() {
  const backendUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!backendUrl) return [];
  return [{ source: "/api/:path*", destination: `${backendUrl}/:path*` }];
}
```

Và `proxy.ts` của frontend gắn header `x-api-key` (Next.js 16 đã đổi tên `middleware.ts` → `proxy.ts`):

```ts
export function proxy(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  if (process.env.API_KEY) requestHeaders.set("x-api-key", process.env.API_KEY);
  return NextResponse.next({ request: { headers: requestHeaders } });
}
export const config = { matcher: "/api/:path*" };
```

### Ma trận FE function → BE route

| FE (`app/lib/api.ts`) | Method | BE route |
|---|---|---|
| `getSongs(params)` | `GET` | `/songs?search=&category=&page=&limit=` |
| `getSongCategories()` | `GET` | `/songs/categories` |
| `getSongById(id)` | `GET` | `/songs/:id` (timeout 10s) |
| `getSongBySlug(slug)` | `GET` | `/songs/slug/:slug` (timeout 10s) — ⚠️ bug thứ tự route |
| `createSong(payload)` | `POST` | `/songs` |
| `updateSong(id, payload)` | `PUT` | `/songs/:id` |
| `deleteSong(id)` | `DELETE` | `/songs/:id` |
| `normalizeSong(payload)` | `POST` | `/songs/normalize` |
| `uploadAudioFile(file)` | `POST` | `/songs/upload-audio` (field `file`) |
| `uploadSheetFile(file)` | `POST` | `/songs/upload-sheet` (field `file`) |
| `uploadSheetFiles(files)` | `POST` | `/songs/upload-sheets` (field `files`) |
| `login(email, password)` | `POST` | `/auth/login` |
| `setPassword(password)` | `POST` | `/auth/set-password` |
| `getMe()` | `GET` | `/users/me` |
| `getFavorites()` | `GET` | `/users/favorites` |
| `getFavoriteIds()` | `GET` | `/users/favorites/ids` |
| `checkFavorite(songId)` | `GET` | `/users/favorites/check/:songId` |
| `addFavorite(songId)` | `POST` | `/users/favorites/:songId` |
| `removeFavorite(songId)` | `DELETE` | `/users/favorites/:songId` |

### CORS — nhớ thêm origin

`main.ts` chỉ cho phép:
- mọi `http://localhost:<port>`
- mọi `http://127.0.0.1:<port>`
- `https://sheet-music-app-client.vercel.app`

Thêm domain mới → sửa mảng `origin` trong `main.ts`.

---

## 17. Deploy

Backend đã chạy trên **https://sheet-music-app-npoe.onrender.com** (Render). Frontend trên **Vercel**.

### Render (Web Service)

| Cấu hình | Giá trị |
|---|---|
| Root directory | `backend` (nếu monorepo) hoặc `.` |
| Build command | `npm ci && npm run build` |
| Start command | `npm run start:prod` |
| Health check path | `/` |
| Node version | 22.x |

Biến môi trường cần set trên Render (theo từng loại):

```
NODE_ENV=production
PORT=3000
MONGO_URI=mongodb+srv://...
JWT_SECRET=<random dài>
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_CALLBACK_URL=https://<frontend-domain>/api/auth/google/callback
CLIENT_URL=https://<frontend-domain>
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
API_KEY=<phải khớp với Vercel>
```

### Thứ tự triển khai (tránh lỗi)

1. Deploy backend, lấy URL public.
2. Set biến môi trường backend (`CLIENT_URL`, `GOOGLE_CALLBACK_URL` trỏ tới domain FE sắp dùng).
3. Deploy frontend với `NEXT_PUBLIC_API_URL=<backend URL>`, `API_KEY=<khớp>`.
4. Thêm frontend domain vào mảng `origin` của `main.ts` và deploy lại backend.

### Kiểm tra sau deploy

```bash
curl https://<backend-domain>/
curl https://<backend-domain>/songs -H "x-api-key: $API_KEY"
```

---

## 18. Lỗi thường gặp & xử lý

| Lỗi | Nguyên nhân | Cách sửa |
|---|---|---|
| `📌 MongoDB URI: undefined` rồi crash | Thiếu `MONGO_URI` | Điền vào `.env` |
| `MongooseServerSelectionError` | URI sai / IP chưa whitelist (Atlas) | Kiểm tra URI; thêm IP vào Atlas Network Access |
| `401 {"message":"API key is missing or invalid"}` trên mọi endpoint | Thiếu header `x-api-key`, hoặc `API_KEY` chưa set, hoặc lệch giữa BE/FE | So sánh `API_KEY` ở cả `.env` BE và `.env.local` FE |
| `429 Too Many Requests` | Vượt rate limit | Chờ hết cửa sổ 60s; nếu upload nhiều file, dùng `/upload-sheets` một lần thay vì gọi lặp |
| `400 {"message":"property x should not exist"}` | `forbidNonWhitelisted` chặn field lạ | Bỏ field không có trong DTO khỏi body/query |
| `400 Invalid song ID: slug` khi gọi `/songs/slug/x` | Bug thứ tự route (xem [mục 7](#7-danh-sách-api)) | Đặt `@Get('slug/:slug')` trước `@Get(':id')` |
| `E11000 duplicate key error collection: songs index: slug_1` | Hai bài trùng `title` → trùng slug | Thêm hậu tố khi slug trùng, hoặc xoá bài cũ |
| `400 Missing Cloudinary server environment variables.` | Thiếu `CLOUDINARY_*` | Điền 3 biến Cloudinary vào `.env` |
| `Only mp3 files are supported` | Gửi file không phải mp3 | Đổi đuôi `.mp3` |
| `Không tìm thấy tài khoản` khi `GET /users/me` với token admin | Admin nằm ở collection `admins`, `/users/me` tra `users` | Đăng nhập bằng tài khoản trong collection `users`, hoặc sửa service |
| `EADDRINUSE :::3000` | Port 3000 đã bị chiếm (thường do chạy 2 instance) | `taskkill //F //IM node.exe` hoặc đổi `PORT` |
| `Google redirect_uri_mismatch` | `GOOGLE_CALLBACK_URL` không khớp URI đã đăng ký | Phải là `https://<frontend>/api/auth/google/callback`, không phải URL backend |
| `403 Forbidden` từ Google | Domain chưa xác minh | Thêm domain vào Google Console → Branding → Domain verification |

---

## 19. Ghi chú bảo mật

> Nên xử lý trước khi đưa lên production.

| # | Vấn đề | Mức | Vị trí |
|---|---|:---:|---|
| 1 | `console.log('📌 MongoDB URI:', uri)` in **cả chuỗi kết nối kèm mật khẩu Atlas** ra console mỗi lần boot | 🔴 Cao | `app.module.ts` |
| 2 | Tài khoản admin `admin@ftc.com` / `admin123` **hard-code** trong source | 🔴 Cao | `seed-admin.ts` |
| 3 | `API_KEY` thật đã bị **commit** vào `.env.example` (và file này không bị `.gitignore` chặn) | 🔴 Cao | `.env.example` |
| 4 | JWT trả về trong **query string** của OAuth redirect → lọt vào history, `Referer`, log server | 🟡 Trung bình | `auth.controller.ts` |
| 5 | `JWT_SECRET` fallback yếu `'sheet-music-jwt-secret'`; `GOOGLE_CALLBACK_URL` fallback cũng có | 🟡 Trung bình | `auth.module.ts`, `google.strategy.ts` |
| 6 | So sánh API key dùng `!==` thay vì `crypto.timingSafeEqual` | 🟡 Trung bình | `api-key.guard.ts` |
| 7 | Token lưu `localStorage` (phía FE) → dễ bị đánh cắp qua XSS | 🟡 Trung bình | frontend `api.ts` |
| 8 | Không có `helmet`, không có rate limit theo IP độc lập | 🟢 Thấp | `main.ts` |
| 9 | File trên Cloudinary không bị dọn khi xoá bài hát | 🟢 Thấp | `songs.service.ts` |
| 10 | Không có rate limit riêng cho `POST /auth/login` theo email → vẫn có thể brute-force phân tán | 🟢 Thấp | `auth.controller.ts` |

### Khuyến nghị

```ts
// 1. Đừng log URI đầy đủ
const safe = uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:***@');
console.log('📌 MongoDB URI:', safe);

// 6. So sánh an toàn về thời gian
import { timingSafeEqual } from 'crypto';
const a = Buffer.from(provided ?? '');
const b = Buffer.from(expected);
const ok = a.length === b.length && timingSafeEqual(a, b);
```

- Sinh `JWT_SECRET` bằng: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`
- Dùng Access Key hạn chế quyền trên Cloudinary, không dùng API key chính.
- Bật IP Access List trên MongoDB Atlas (chỉ cho phép IP server).

---

## 20. Phụ lục — điểm cần lưu ý trong code

### Điểm tốt

- ✅ Cấu trúc module NestJS chuẩn, tách bạch controller/service/schema/DTO.
- ✅ Validation DTO kỹ, có message tiếng Việt rõ ràng.
- ✅ Rate limit phân tầng hợp lý (upload nhạy cảm hơn bài đọc).
- ✅ `bcrypt` với salt 10.
- ✅ Index compound unique trên `favorites` chống trùng.
- ✅ Parser `normalize()` xử lý tiếng Việt có dấu cẩn thận.
- ✅ Upload giới hạn số file + dung lượng.
- ✅ `pre('save')` hook tự sinh slug.

### Điểm cần cải thiện

| Vấn đề | File |
|---|---|
| `@Get(':id')` khai báo trước `@Get('slug/:slug')` → route slug chết | `songs.controller.ts` |
| `PUT /songs/:id` là **thay thế toàn bộ**, không phải patch; và **không** regenerate slug | `songs.service.ts` |
| Slug unique nhưng không xử lý trùng → `E11000` | `songs.schema.ts` |
| `GET /songs` trả cả `sections` lồng nhau, không projection, không index `title` | `songs.service.ts` |
| Không có `/auth/register`, `/auth/refresh`, `/auth/logout` | `auth.controller.ts` |
| Không có `x-request-id` / logging có hệ thống | toàn bộ |
| Không có `error.tsx`/filter tập trung — lỗi trả thẳng mặc định Nest | toàn bộ |
| Không validate file trước khi buffer vào RAM | `songs.controller.ts` |
| Không dọn asset Cloudinary khi xoá bài | `songs.service.ts` |
| `images` field không dùng | `songs.schema.ts` |
| `noImplicitAny: false` làm lỏng type-safety | `tsconfig.json` |
| Đọc `process.env` trực tiếp ở 2 nơi, không nhất quán với `ConfigService` | `songs.service.ts`, `api-key.guard.ts` |

### Tóm tắt kiến trúc bằng một câu

> Ứng dụng quản lý thư viện nhạc với 4 collection MongoDB (`songs`, `users`, `favorites`, `admins`), 22 endpoint, bảo vệ 3 lớp (rate limit → shared API key → JWT/role), file lưu trên Cloudinary, và một bộ parser chuyển text lời + nốt nhạc thô thành cấu trúc `sections[].lines[]` cho trang quản trị.

---

## Liên kết

- 📖 [NestJS Documentation](https://docs.nestjs.com)
- 📖 [Mongoose Documentation](https://mongoosejs.com/docs)
- 📖 [Cloudinary Node.js SDK](https://cloudinary.com/documentation/node_integration)
- 📖 [Google OAuth 2.0](https://developers.google.com/identity/protocols/oauth2)
- 📖 [Frontend README](../frontend/README.md)
