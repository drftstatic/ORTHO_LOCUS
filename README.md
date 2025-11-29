# ORTHO_LOCUS

**A Location-Intelligence Art Installation**

ORTHO_LOCUS is an experimental kiosk that transforms real-time satellite imagery into high-fidelity architectural schematics. This project explores the intersection of location intelligence, generative AI, and architectural visualization.

---

## Project Context

**Art Project for:** [Rick Dailey](https://rickfdailey.com)  
**Built by:** [Fladry Creative](https://fladrycreative.com)

**Note:** This is a private art installation. While the codebase is open and shareable for educational and reference purposes, ORTHO_LOCUS is not a public-facing product or service. It exists as a commissioned artwork and technical exploration.

---

## Overview

ORTHO_LOCUS leverages:
- **Google Maps Platform** for satellite imagery and location data
- **Gemini 3.0 Pro Vision** for multimodal AI analysis and schematic generation
- **React + TypeScript** for the interactive kiosk interface
- **Industrial design aesthetics** inspired by technical instrumentation

The kiosk allows users to select coordinates on a map and generates precise, geometrically accurate planar drawings including blueprints, elevations, and axonometric views.

---

## Technical Stack

- **Frontend:** React 19, TypeScript, Vite
- **AI:** Google Generative AI (Gemini 3.0 Pro)
- **Maps:** Google Maps JavaScript API
- **Styling:** Custom CSS with industrial/technical design system

---

## Setup

### Prerequisites
- Node.js (v18 or higher recommended)
- Google Maps API key
- Google Gemini API key

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd ORTHO_LOCUS
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory:
```env
VITE_GOOGLE_MAPS_API_KEY=your_maps_api_key_here
VITE_GEMINI_API_KEY=your_gemini_api_key_here
```

4. Start the development server:
```bash
npm run dev
```

5. Build for production:
```bash
npm run build
```

---

## Project Structure

```
ORTHO_LOCUS/
├── src/
│   ├── components/       # React components (MapTerminal, etc.)
│   ├── services/         # API integrations (Gemini, Maps)
│   ├── styles/          # CSS modules and design system
│   └── App.tsx          # Main application component
├── public/              # Static assets
└── index.html           # Entry point
```

---

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build

### Environment Variables

- `VITE_GOOGLE_MAPS_API_KEY` - Google Maps JavaScript API key
- `VITE_GEMINI_API_KEY` - Google Gemini API key

---

## License

This code is provided as-is for reference and educational purposes. As a commissioned art project, please respect the creative intent and context of this work.

For inquiries about the artwork: [rickfdailey.com](https://rickfdailey.com)  
For technical inquiries: [fladrycreative.com](https://fladrycreative.com)
