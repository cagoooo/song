# replit.md

## Overview

This is an interactive guitar performance community platform (互動式吉他彈唱社交點播平台) that enables real-time song requests, voting, and social music sharing. The platform allows users to browse songs, vote for their favorites, suggest new songs, and share via QR codes. Administrators can manage songs, tags, and user suggestions through a dedicated backend interface.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack Query for server state, React hooks for local state
- **Styling**: Tailwind CSS with custom theme configuration via `theme.json`
- **UI Components**: Shadcn/ui component library built on Radix UI primitives
- **Animations**: Framer Motion for transitions and effects
- **Build Tool**: Vite with path aliases (`@/` for client src, `@db/` for database)

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ESM modules
- **Real-time Communication**: WebSocket (ws library) for live song updates and voting
- **Authentication**: Passport.js with local strategy, session-based auth using memory store
- **Password Hashing**: bcrypt

### Data Storage
- **Primary Database**: PostgreSQL via Drizzle ORM with Neon serverless driver
- **Alternative/Legacy**: Firebase Firestore (configuration present in `db/firebase.ts`)
- **Schema Definition**: Drizzle schema in `db/schema.ts` with tables for users, songs, votes, suggestions, tags, and song-tag relationships
- **Migrations**: Drizzle Kit for schema migrations (`db:push` command)

### Key Design Patterns
- **API Design**: RESTful endpoints under `/api/*` prefix
- **Real-time Updates**: WebSocket broadcasts song/vote changes to all connected clients
- **Session Management**: In-memory session store with express-session
- **Type Safety**: Shared schema types between frontend and backend via Drizzle-Zod integration

### Build and Development
- **Development**: `tsx` for running TypeScript directly, Vite dev server with HMR
- **Production Build**: Vite builds client to `dist/public`, esbuild bundles server to `dist/index.js`
- **Path Resolution**: TypeScript path aliases configured in `tsconfig.json` and `vite.config.ts`

## External Dependencies

### Database
- **PostgreSQL**: Primary database via `DATABASE_URL` environment variable
- **Neon Serverless**: `@neondatabase/serverless` driver for PostgreSQL connections
- **Drizzle ORM**: SQL toolkit with type-safe queries

### Firebase (Optional/Legacy)
- Required environment variables: `FIREBASE_API_KEY`, `FIREBASE_PROJECT_ID`, `FIREBASE_AUTH_DOMAIN`, `FIREBASE_STORAGE_BUCKET`, `FIREBASE_MESSAGING_SENDER_ID`, `FIREBASE_APP_ID`
- Used for Firestore database operations as an alternative backend

### Authentication
- Passport.js local strategy
- Session secret uses `REPL_ID` environment variable as fallback

### Third-Party UI Libraries
- Radix UI primitives for accessible components
- Recharts for data visualization
- QRCode.react for QR code generation
- Canvas Confetti for celebratory effects
- React Share for social sharing buttons

### Development Tools
- Vite with React plugin and Replit-specific plugins (`@replit/vite-plugin-shadcn-theme-json`, `@replit/vite-plugin-runtime-error-modal`)