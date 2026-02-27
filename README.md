# Path of Strife

A turn-based RPG game with a React frontend and Node.js/Express backend. Players manage parties of characters, progress through multiple areas, and engage in tactical turn-based combat.

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL database

### Setup

1. **Backend**:
   ```bash
   cd server
   npm install
   npx prisma migrate dev
   npm run dev
   ```

2. **Frontend** (new terminal):
   ```bash
   cd client
   npm install
   npm run dev
   ```

The app will be available at ``

### Docker Compose

To run both services with PostgreSQL:

```bash
docker-compose up
```

## Project Structure

```
Path of Strife/
├── server/               # Express.js backend
│   ├── src/
│   │   ├── lib/         # Game constants, enemy definitions, utilities
│   │   ├── services/    # Core business logic (battles, characters, parties)
│   │   └── routes/      # API endpoints
│   ├── prisma/          # Database schema and migrations
│   └── package.json
├── client/              # React + TypeScript frontend
│   ├── src/
│   │   ├── components/  # React UI components
│   │   ├── api.ts       # Client API functions
│   │   └── types.ts     # Shared TypeScript types
│   └── package.json
└── docker-compose.yml
```

## Core Systems

### Battle System
- Turn-based combat with action priority
- Classes: Marksman, Warrior, Warlock, Cleric
- Ability costs (mana/stamina) and cooldowns
- Status effects (burn, poison, slow, blind, buffs)
- Boss phases with phase transitions and immediate actions

### Progression
- 4 areas: Forest → Mountain → Volcano → Abyss
- 3 battles per area (2 mob encounters, 1 boss + adds)
- Character leveling with XP and gold rewards
- Rest stops between areas with blessing purchases

### Difficulty
- Default: Balanced difficulty with per-area enemy scaling (1.0x - 1.7x)
- Easy Mode: Party-level toggle reduces enemy HP/damage by area (0.7x - 1.2x) and doubles player attack dice
- Once enabled for a run, easy mode cannot be toggled off

### Bug Reporting
- Comprehensive bug reports capture full battle state
- Includes participant stats, enemy details, and complete event log
- Accessible via "Report Bug" button during/after battles

## API Endpoints

### Parties
- `GET /parties/user/:userId` - List parties
- `POST /parties` - Create party
- `GET /parties/:id` - Get party details
- `PUT /parties/:id/easy-mode` - Toggle easy mode

### Characters
- `GET /characters/user/:userId` - List characters
- `POST /characters` - Create character
- `PUT /characters/:id` - Update character

### Runs
- `POST /runs` - Start new campaign run
- `GET /runs/:id` - Get run status
- `POST /runs/:id/advance` - Advance to next battle
- `POST /runs/:id/abandon` - Abandon run
- `GET /runs/:id/shop` - Get rest stop services

### Battles
- `GET /battles/:id` - Get battle state
- `POST /battles/:id/action` - Perform action (attack, ability, recovery)
- `GET /battles/:id/bug-report` - Generate bug report with full metadata

## Database Schema

Key models:
- `Character` - Player characters with stats and XP
- `Party` - Groups of characters with easyMode flag for cowards
- `Run` - Campaign progression with battle history
- `Battle` - Individual battle state and event log
- `BattleParticipant` - Character participation in battles

Enums:
- Classes: MARKSMAN, WARRIOR, WARLOCK, CLERIC

## Development

### Build Backend
```bash
cd server
npx tsc --noEmit  # Check for TypeScript errors
```

### Build Frontend
```bash
cd client
npx tsc --noEmit  # Check for TypeScript errors
npm run build     # Build for production
```

### Run Tests
Currently no automated tests. Recommended manual testing via UI.

## Recent Changes

- Implemented easy mode with per-area difficulty scaling
- Added bug report system with complete battle metadata
- Fixed UX: Continue button now visible after battle completion
- Removed temp files and cleaned up unused code
- Removed TODO comments

## Known Limitations

- No authentication system (development only)
- Limited error handling and validation
- No automatic test coverage
- Single database instance (no multi-tenancy)

## License

Internal project - not for distribution
