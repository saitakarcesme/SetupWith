# SetupWith

SetupWith is an open catalog of product-specific Codex setup prompts. It currently covers 424 apps plus 50 additional popular and useful open-source repositories across developer tools, AI, professional IDEs, cloud platforms, office suites, creative production, science, security, enterprise software, entertainment, hardware, and self-hosting.

Each app has its own `/{slug}` route with:

- the project’s official repository, website, logo, and recognizable brand color;
- platform-aware preflight and installation guidance;
- an optional, fully previewed non-secret environment profile appended locally before copy;
- opaque `secret://provider/key` references instead of credential values;
- explicit permission checkpoints, verification, and rollback instructions.

## Local development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

SetupWith itself is also available at `/setupwith` as a first-party Codex setup recipe. Its prompt clones the official repository, verifies the lockfile and checks, binds the development server to `127.0.0.1`, and preserves existing repository and browser data.

## Accounts and saved packages

The catalog and multi-app package prompt builder work without an account. To enable sign-up, sign-in, and each user's private named package library, configure Clerk:

```bash
cp .env.example .env.local
```

Then provide `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY`, or connect the free Clerk Marketplace integration to the Vercel project. Only package names, descriptions, shared instructions, and catalog slugs are stored in Clerk private metadata. Local environment profiles and Vault secrets remain browser-local and are never synchronized to the account.

## Quality checks

```bash
npm run check
```

This runs ESLint, strict TypeScript, catalog/prompt validation, and a production Next.js build that statically renders every app page.

## Security model

The context profile is local-first. Non-secret preferences stay in browser storage until the user chooses to include the visible profile in a copied prompt. Credentials are protected by a browser-only vault using PBKDF2-HMAC-SHA256 and AES-256-GCM. The passphrase is not stored. Generated prompts only receive aliases such as `secret://github/token`; secret values are never written into prompt text.

SetupWith does not transmit the prompt preview. Once a user pastes copied text into Codex, that text is governed by the destination Codex service's data controls.

SetupWith does not silently install software or content. Its prompts require Codex to inspect the machine first and stop before account creation, sign-in, MFA, CAPTCHA, purchases, subscriptions, large downloads, elevated access, overwriting files, anti-cheat or driver installation, services, firewall changes, and restarts.

## Main routes

- `/` — product landing page
- `/apps` — searchable catalog with Software, AI Lab, Gaming, Entertainment, Work, Creative, Social, Browsers, and Hardware experiences
- `/{slug}` — app-specific setup page
- `/setupwith` — install SetupWith locally from its official source
- `/open-source` — 50 additional researched GitHub repositories with search and category filters
- `/open-source/{slug}` — review, clone, setup, test, and rollback prompt for one repository
- `/profile` — local environment profile and encrypted vault
- `/packages/new` — multi-app package builder and one coordinated prompt
- `/account` — signed-in user's private saved package library
- `/sign-up` and `/sign-in` — Clerk-managed account flow
- `/security` — security and storage model
- `/how-it-works` — end-to-end setup workflow

## Stack

Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, Web Crypto, and Vercel.
