# Path of Strife - Client

React + TypeScript + Vite frontend for the Path of Strife RPG game.

## Setup

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Project Structure

- `src/components/` - React components for game UI
  - `HomePage.tsx` - Party and character management
  - `BattleScreen.tsx` - Battle display and action interface
  - `RunScreen.tsx` - Campaign run interface
  - `RunProgress.tsx` - Run progression and rest stops
  - `ActionBar.tsx` - Player action selection UI
  - `BattleLog.tsx` - Battle event log display
  - `EnemyPanel.tsx` - Enemy status display
  - `PartyPanel.tsx` - Party member status display
- `src/types.ts` - TypeScript interfaces for game data
- `src/api.ts` - API client for server communication
- `src/index.css` - Global styles with CSS variables
- `src/main.tsx` - Application entry point

## Features

- Party management with character slots
- Turn-based battle system with ability selection
- Campaign progression across 4 areas with 3 battles per area
- Rest stop between area transitions with blessing purchases
- Bug reporting system with full battle metadata capture
- Easy mode difficulty scaling per party
- Real-time status effect tracking
