# Vizzle

Vizzle is a responsive bill-splitting web app built with Next.js. Users can scan a receipt or enter items manually, add participants, assign items, and calculate each person's share of tax and tip.

## Features

- Receipt image upload and AI-assisted item extraction
- Manual item entry and correction
- Participant management
- Per-item assignment, including shared items
- Tax and tip controls
- Per-person itemized totals
- Automatic unfinished-bill recovery and recent bill history in browser storage
- Installable PWA with direct phone-camera capture and basic offline startup
- Server-side image validation, receipt-scan rate limiting, and privacy notice
- Responsive light and dark themes

## Tech stack

- Next.js 14 and React 18
- TypeScript
- Tailwind CSS and Radix UI
- OpenAI vision for receipt extraction
- Vitest for calculation tests

## Local development

Requirements:

- Node.js 20 or newer
- npm
- An OpenAI API key for receipt scanning

Install dependencies:

```sh
npm install
```

Create `.env.local`:

```env
OPENAI_API_KEY=your_openai_api_key
```

Start the development server:

```sh
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Manual entry works without an OpenAI key. Receipt scanning uses this server-only key; it is never sent to browser code. Restart the development server after changing `.env.local`.

On iPhone or Android, use **Take Photo** to open the rear camera. Production deployments should use HTTPS so installation and service-worker features are available consistently.

## Quality checks

```sh
npm run typecheck
npm run lint
npm test
npm run build
```

## Production

Set the server-only environment variable in your hosting provider:

```env
OPENAI_API_KEY=your_openai_api_key
```

Never create a `NEXT_PUBLIC_OPENAI_API_KEY`; variables with `NEXT_PUBLIC_` are bundled into browser code.

```sh
npm run build
npm start
```

Production deployments must use HTTPS for camera, PWA installation, and service-worker support. Review the built-in `/privacy` page before launch. Receipt images are forwarded to OpenAI for extraction with API response storage disabled and are not written to Vizzle storage.

## Current scope

Vizzle stores unfinished bills and a small bill history in the current browser. This data does not sync across devices. Authentication, database-backed history, collaborative editing, and payment collection are not implemented yet.

## License

MIT
