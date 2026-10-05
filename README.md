# Istanbul Quest

**A web app to run a group trip or event as a game: mini-games, team scoring and a live awards ceremony.**

I designed and built Istanbul Quest on my own during summer 2026, for a trip with friends to Istanbul. Instead of a shared spreadsheet and a group chat, everyone joins the app, plays mini-games during the trip, earns points for their team, and the event ends with an awards ceremony run from the admin panel.

🔗 **Live demo:** https://leonies29.github.io/friends/

<!-- Add 2–3 screenshots here, for example:
![Home screen](docs/screenshots/home.png)
![Travel bingo](docs/screenshots/bingo.png)
![Awards ceremony](docs/screenshots/awards.png)
-->

---

## Features

**Mini-games**
- **Travel bingo**: a grid of challenges to complete during the trip.
- **Treasure hunt**: clues to solve and places to find.

**Teams and scoring**
- Points are tracked per player, per team and per mini-team.
- For each game, the admin chooses whether it is played **individually or as a group**.
- Points from a group game can go to the whole group or to **mini-teams**, built by hand by the admin or generated at random.

**Admin panel**
- Set up games, teams and scoring rules.
- Follow the scoreboard as the event goes on.

**Awards ceremony**
- An end-of-event ceremony that reveals award categories one by one, run by the admin.

---

## Tech stack

| Layer | Tools |
| --- | --- |
| Framework | [Next.js 15](https://nextjs.org/) (App Router), [React 19](https://react.dev/) |
| Language | TypeScript |
| Styling | [Tailwind CSS 4](https://tailwindcss.com/), next-themes (light/dark mode) |
| Animation | [Framer Motion](https://www.framer.com/motion/) |
| Backend | [Firebase](https://firebase.google.com/): Firestore (data) and Cloud Storage (files), with security rules |
| UI | lucide-react icons, Radix UI Slot, clsx, tailwind-merge |
| Quality | ESLint, Vitest unit tests, strict TypeScript |
| Hosting | GitHub Pages (static export) |

---

## Getting started

### Prerequisites
- Node.js 20 or later
- A Firebase project with **Firestore** and **Storage** enabled

### 1. Install

```bash
git clone https://github.com/Leonies29/friends.git
cd friends
npm install
```

### 2. Configure Firebase

Copy the example environment file and fill in the values from your Firebase project settings (*Project settings → Your apps → SDK setup and configuration*):

```bash
cp .env.example .env.local
```

```env
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=
```

`.env.local` is ignored by Git, so your keys stay on your machine.

Deploy the Firestore and Storage security rules (requires the [Firebase CLI](https://firebase.google.com/docs/cli)):

```bash
firebase deploy --only firestore:rules,storage
```

Optionally, load starting data:

```bash
npm run seed:firebase
```

### 3. Run locally

```bash
npm run dev
```

Then open http://localhost:3000.

---

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Starts the development server |
| `npm run build` | Builds the app for production |
| `npm run start` | Serves the production build |
| `npm run lint` | Runs ESLint |
| `npm run typecheck` | Checks types with TypeScript |
| `npm test` | Runs the Vitest unit tests |
| `npm run seed:firebase` | Seeds Firebase with starting data |

---

## Deploying to GitHub Pages

The app can be exported as a static site. With `GITHUB_PAGES=true`, Next.js builds into `out/`, serves the site under `/friends` and disables image optimization (not available on static hosting):

```bash
GITHUB_PAGES=true npm run build
```

Publish the `out/` folder to GitHub Pages. To use another path, set `NEXT_PUBLIC_BASE_PATH`.

---

## Project structure

```
.
├── src/                  # App code (pages, components, game logic, tests)
├── firebase/
│   ├── firestore.rules   # Firestore security rules
│   └── storage.rules     # Storage security rules
├── scripts/
│   └── seed-firebase.mjs # Seed script
├── next.config.ts        # Static export and base path for GitHub Pages
└── vitest.config.ts      # Unit test setup
```

---

## What I learned

- Designing a product end to end, from the game rules to the admin experience.
- Modelling flexible scoring (individual, group, mini-teams) in a NoSQL database.
- Securing a Firebase backend with Firestore and Storage rules.
- Shipping a Next.js app as a static site on GitHub Pages.

---

## Author

**Léonie Schmit**, final-year engineering student at ESME (Big Data & Digital Marketing)

[Portfolio](https://leonies29.github.io/) · [LinkedIn](https://www.linkedin.com/in/leonie-schmit) · [GitHub](https://github.com/Leonies29)
