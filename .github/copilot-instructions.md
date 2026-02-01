# Copilot Instructions for this repository

This file gives focused, actionable guidance for AI coding agents working on this TypeScript + Express + Mongoose project.

Project overview
- **Runtime & build:** TypeScript compiled to `./dist` (`tsc`). Dev uses `nodemon` + `ts-node` (see `nodemon.json`). Start commands: `npm run dev` (fast iteration), `npm run build` then `npm start` for production.
- **Module system:** `type: "module"` + `tsconfig.json` uses `module: NodeNext`. Source files import local modules with `.js` extensions (e.g. `import authRoutes from "./modules/auth/auth.routes.js"`). Keep that pattern in TS source files.
- **Entry points:** `src/server.ts` boots the HTTP server & MongoDB; `src/app.ts` assembles routers. Production runs `dist/server.js`.

Key conventions & patterns
- **Routes:** Each feature under `src/modules/<feature>/` exposes `*.routes.ts` exporting a default `Router`. Routes are mounted in `src/app.ts` (example: `src/modules/sales/sales.routes.ts`).
- **Controllers/logic:** Business logic often lives in controller files adjacent to routes (e.g. `src/modules/sales/receipt.controller.ts`). Use controllers for complex handlers and keep routes thin.
- **Models:** Mongoose models live alongside their feature: `*.model.ts` (e.g. `src/modules/inventory/models/batch.model.ts`). Use Mongoose `ObjectId` via `Types.ObjectId` where needed.
- **Auth & Roles:** `src/modules/middlewares/auth.middleware.ts` verifies JWT and sets `req.user` (see `src/modules/types/express.d.ts` for typing). Role gating uses `allowRoles(...)` middleware.
- **PDF receipts:** Receipts use `pdfkit` (`generateReceipt` in `src/modules/sales/receipt.controller.ts`). Keep `pdfkit` in dependencies when modifying receipt code.

Environment & runtime notes
- Required env vars: `MONGO_URI`, `JWT_SECRET`, optional `PORT`. `server.ts` expects `process.env.MONGO_URI` and `JWT_SECRET` for signing tokens.
- Type declarations: project uses `typeRoots` to include `./types` and `./node_modules/@types` (see `tsconfig.json`). Add repo-specific types under `src/modules/types`.

Coding guidelines for changes
- Keep route files small; move heavy logic into controllers/services under the same module folder.
- When adding imports of local TS modules, include the `.js` extension in the import path (NodeNext + ES modules requirement).
- Add new models under `src/modules/<feature>/` and reference them with explicit relative paths (avoid implicit index barrels unless added consistently).
- Follow existing role strings (`"ADMIN"`, `"PHARMACIST"`, `"CASHIER"`, `"ACCOUNTANT"`) when updating authorization.

Files to inspect for context (common start points)
- `package.json` (scripts & deps)
- `nodemon.json` (dev run: `ts-node src/server.ts`)
- `tsconfig.json` (rootDir=`src`, outDir=`dist`, module resolution)
- `src/server.ts`, `src/app.ts` (boot/route registration)
- `src/modules/middlewares/auth.middleware.ts` and `allowRoles.ts` (auth patterns)
- `src/modules/sales/sales.routes.ts` (example of stock reduction + ledger integration)

What not to change without coordination
- Changing `type` in `package.json` or `module`/`moduleResolution` in `tsconfig.json` will affect imports and runtime; avoid unless migrating project style.
- Don't remove the `.js` extension from local imports in source files; it is required for NodeNext resolutions after transpile.

If uncertain, run these locally
```
npm run dev     # fast iteration (nodemon + ts-node)
npm run build   # compile to dist
npm start       # run compiled server (node dist/server.js)
```

If you need more detail on a specific module or workflow, ask and include the file path you want to focus on.
