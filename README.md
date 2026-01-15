# Drill Pilot - Web Version

A 2D drilling game where you follow the planned drill trace with constant forward motion.

## Controls

### Horizontal Mode
- **↑ / ↓** : Pitch up/down (changes heading)

### Vertical Mode
- **← / →** : Steer left/right (changes heading)

### General
- **T** : Toggle between horizontal and vertical drilling modes
- **R** : Restart the game
- **ESC** : Quit (close tab)

## Scoring

- Stay within the **tight corridor** (green): +25 points/sec
- Stay within the **OK corridor** (yellow): +10 points/sec
- Outside tolerance: -30 points/sec
- If outside tolerance for too long (3.5 sec): **FAIL**

## Development

### Prerequisites
- Node.js 18+
- npm

### Setup

```bash
cd web
npm install
```

### Run Development Server

```bash
npm run dev
```

Opens at http://localhost:3000

### Build for Production

```bash
npm run build
```

Output in `dist/` directory.

### Preview Production Build

```bash
npm run preview
```

## Deployment

The `dist/` folder can be deployed to any static hosting:

- **GitHub Pages**: Push `dist/` contents to `gh-pages` branch
- **Netlify**: Connect repo and set build command to `npm run build`, publish directory to `web/dist`
- **Vercel**: Similar to Netlify, auto-detects Vite projects

## Tech Stack

- TypeScript
- HTML5 Canvas
- Vite (build tool)
