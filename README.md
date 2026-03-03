# SaaS File Management System — Backend

REST API built with **Node.js · Express · TypeScript · Prisma ORM · PostgreSQL**.

Live URL: `https://saasfilemanagementsystembackend.onrender.com`

---

## Default Accounts (seeded automatically)

| Role  | Email                          | Password   |
|-------|--------------------------------|------------|
| Admin | admin@saasfilemanager.com      | Admin@123  |
| User  | user1@saasfilemanager.com      | User1@123  |
| User  | user2@saasfilemanager.com      | User2@123  |

---

## Tech Stack

| Layer        | Technology                          |
|--------------|-------------------------------------|
| Runtime      | Node.js 22                          |
| Framework    | Express 5                           |
| Language     | TypeScript 5                        |
| ORM          | Prisma 7 (driver adapter: `pg`)     |
| Database     | PostgreSQL 15                       |
| Auth         | JWT (access + refresh token pair)   |
| File upload  | Multer                              |
| Email        | Nodemailer                          |
| Passwords    | bcryptjs                            |
| Deployment   | Render                              |

---

## Project Structure

```
src/
├── app.ts                  # Express app setup (CORS, middleware, routes)
├── server.ts               # Entry point — migrate, seed, listen
├── seed.ts                 # Default admin, users & packages seeder
├── config/
│   ├── database.ts         # Prisma client with pg Pool + SSL
│   └── env.ts              # Typed environment variables
├── controllers/
│   ├── auth.controller.ts  # Auth logic
│   ├── admin.controller.ts # Package CRUD
│   └── user.contoller.ts   # Folder, file & subscription logic
├── middleware/
│   ├── auth.ts             # JWT authenticate + authorizeAdmin guards
│   └── errorHandler.ts     # Centralised AppError handler
├── routes/
│   ├── auth.routes.ts
│   ├── admin.routes.ts
│   ├── user.routes.ts
│   └── index.ts
└── utils/
    ├── jwt.ts              # Token generation & verification
    ├── crypto.ts           # Random token + SHA-256 hash helpers
    ├── email.ts            # Nodemailer wrappers
    └── subscriptionEnforcer.ts  # Core business-rule engine
prisma/
├── schema.prisma
└── migrations/
```

---

## API Routes

All routes are prefixed with `/api`.

### Auth — `/api/auth`

| Method | Path                        | Auth | Description                        |
|--------|-----------------------------|------|------------------------------------|
| POST   | `/register`                 | No   | Register new user                  |
| POST   | `/login`                    | No   | Login, returns access + refresh JWT|
| GET    | `/verify-email?token=`      | No   | Verify email address               |
| POST   | `/forgot-password`          | No   | Send password-reset email          |
| POST   | `/reset-password?token=`    | No   | Reset password with token          |
| POST   | `/refresh-token`            | No   | Issue new access token             |
| GET    | `/profile`                  | JWT  | Get current user profile           |
| POST   | `/logout`                   | JWT  | Revoke refresh token               |

### Admin — `/api/admin` (Admin JWT required)

| Method | Path               | Description                    |
|--------|--------------------|--------------------------------|
| GET    | `/packages`        | List all packages              |
| POST   | `/packages`        | Create package                 |
| PUT    | `/packages/:id`    | Update package                 |
| DELETE | `/packages/:id`    | Delete package                 |
| GET    | `/packages/public` | Public list (no auth needed)   |

### User — `/api/user` (User JWT required)

#### Subscriptions
| Method | Path                     | Description                         |
|--------|--------------------------|-------------------------------------|
| POST   | `/subscribe`             | Subscribe to a package              |
| POST   | `/unsubscribe`           | Cancel active subscription          |
| GET    | `/subscription-history`  | Full subscription history with dates|
| GET    | `/subscription-status`   | Current limits and usage            |

#### Folders
| Method | Path                    | Description              |
|--------|-------------------------|--------------------------|
| POST   | `/folders`              | Create root folder       |
| POST   | `/folders/sub`          | Create sub-folder        |
| GET    | `/folders`              | List all user folders    |
| DELETE | `/folders/:id`          | Delete folder            |
| PATCH  | `/folders/:id/rename`   | Rename folder            |
| PATCH  | `/folders/:id/move`     | Move folder              |

#### Files
| Method | Path                       | Description              |
|--------|----------------------------|--------------------------|
| POST   | `/files/upload`            | Upload file to a folder  |
| GET    | `/files/:folderId`         | List files in folder     |
| PATCH  | `/files/:id/rename`        | Rename file              |
| PATCH  | `/files/:id/move`          | Move file to folder      |
| DELETE | `/files/:id`               | Delete file              |

### Public
| Method | Path          | Description                   |
|--------|---------------|-------------------------------|
| GET    | `/api/packages` | Public list of all packages |
| GET    | `/api/health`   | Health check                |

---

## Core Features (Required)

- **Admin Panel**
  - Login with seeded admin credentials
  - Create, update, and delete subscription packages (Free / Silver / Gold / Diamond)
  - Each package defines: maxFolders, maxNestingLevel, allowedFileTypes, maxFileSize, totalFileLimit, filesPerFolder

- **User Panel**
  - Register & login
  - Browse and subscribe to a package; unsubscribe and switch plans
  - Create root folders and nested sub-folders
  - Upload files (Image, Video, PDF, Audio) into folders
  - View, rename, move, and delete folders and files

- **Subscription Enforcement** (`subscriptionEnforcer.ts`)
  - Every folder action validates maxFolders and maxNestingLevel against the user's active package
  - Every file upload validates allowedFileTypes, maxFileSize, totalFileLimit, and filesPerFolder
  - Switching packages immediately applies new limits without deleting existing data

---

## Extra Features Added

| Feature | Detail |
|---------|--------|
| **Email Verification** | Token sent on registration; 24-hour expiry; SHA-256 hashed in DB |
| **Password Reset** | Forgot-password flow with time-limited token emailed to user |
| **JWT Refresh Token** | Separate short-lived access token + long-lived refresh token; refresh token stored in DB and revoked on logout |
| **Subscription History** | Every package change recorded with timestamps for auditing |
| **Admin bypass** | Admins have no folder/file restrictions — enforced server-side in `subscriptionEnforcer.ts` |
| **Subscription Status endpoint** | Returns current limits, counts, and remaining quota in one call |
| **SSL-aware DB pool** | `pg.Pool` configured with `ssl: { rejectUnauthorized: false }` in production for Render PostgreSQL |
| **Auto-migrate on start** | `prisma migrate deploy` runs before the server starts to apply any pending migrations |
| **Auto-seed on start** | Idempotent seeder runs on every startup — creates admin/users/packages only if absent |
| **Graceful shutdown** | SIGINT / SIGTERM handlers disconnect Prisma before exit |
| **Centralised error handling** | `AppError` class + Express error middleware with typed HTTP codes |

---

## Local Development

### Prerequisites
- Node.js 22+
- Docker (for local PostgreSQL) **or** an existing PostgreSQL instance

```bash
# 1. Clone and install
git clone https://github.com/Hacnine/SaaSFileManagementSystemBackend.git
cd SaaSFileManagementSystemBackend
npm install

# 2. Start DB (Docker)
docker compose up -d

# 3. Configure .env
cp .env.example .env   # then fill in values

# 4. Migrate & seed
npx prisma migrate dev
npm run prisma:seed

# 5. Start dev server
npm run dev
# → http://localhost:5000/api
```

### Environment Variables

| Variable         | Description                              |
|------------------|------------------------------------------|
| `DATABASE_URL`   | PostgreSQL connection string             |
| `JWT_SECRET`     | Secret for signing access tokens         |
| `JWT_REFRESH_SECRET` | Secret for signing refresh tokens    |
| `JWT_EXPIRES_IN` | Access token TTL (e.g. `15m`)            |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token TTL (e.g. `7d`)  |
| `FRONTEND_URL`   | Allowed CORS origin                      |
| `SMTP_HOST`      | SMTP server host                         |
| `SMTP_PORT`      | SMTP server port                         |
| `SMTP_USER`      | SMTP username                            |
| `SMTP_PASS`      | SMTP password                            |
| `NODE_ENV`       | `development` or `production`            |
| `PORT`           | Server port (default `5000`)             |
