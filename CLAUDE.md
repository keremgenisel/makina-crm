# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

"Altunmak CRM" (`Altunmak CRM` / package name `makina-crm`) — a Windows desktop CRM for Altuntaş Makina, built with React (Vite) for the UI and Electron as the desktop shell. It tracks customers/machines, dealers, service requests, machine resale history, stock, spare parts, notes, and finance, and persists everything to a single JSON file on disk (no backend, no database).

## Commands

```bash
npm install          # install deps
npm run dev           # vite dev server + electron, hot reload (concurrently + wait-on)
npm run build         # vite build only (outputs to dist/)
npm run build:win     # vite build + electron-builder --win → release/*.exe (NSIS installer)
npm run preview       # vite preview of the built renderer (no electron shell)
npm run release       # build:win + electron-builder --publish always (pushes to GitHub Releases, needs GH_TOKEN env var)
```

There is no test suite, no lint script, and no TypeScript config in this repo — don't assume `npm test` or `npm run lint` exist.

To cut a new auto-update release: bump `"version"` in `package.json`, then run `set GH_TOKEN=ghp_...` (Windows) and `npm run release`. Auto-update (electron-updater) only works in the installed/packaged app, never in `npm run dev` or an unpacked build — `electron/main.cjs` explicitly checks `app.isPackaged` before touching the updater.

## Architecture

### Process split (Electron)
- `electron/main.cjs` — main process. Owns the data file at `app.getPath("userData")/data.json`, all `ipcMain.handle` channels (`crm:load/save/backup/restore/chooseFolder/writeBackup`, `updater:*`, `app:uninstall`, `app:printHtml`), window creation (splash + main window), single-instance lock, and security hardening (`contextIsolation: true`, `nodeIntegration: false`, blocks `will-navigate`/new windows to anything non-local).
- `electron/preload.cjs` — the only bridge between renderer and main, via `contextBridge.exposeInMainWorld`. Exposes three globals to the renderer: `window.crmStorage` (data persistence), `window.appPrint` (print-to-preview-window), `window.appUpdater` (update lifecycle events), `window.appControl` (uninstall).
- `src/main.jsx` — trivial React root, mounts `<App />`.
- `src/App.jsx` — **the entire application UI**, ~4600 lines, single file. There is intentionally no router; navigation is a `tab` state string with conditional rendering against a `TABS` array near the bottom of the file.

### `src/App.jsx` internal structure
Everything — utility functions, icons, UI primitives, and all feature sections — lives in this one file, in this order:
1. **Constants/data**: embedded base64 logo, `ALTUNMAK_MODELS`, `COUNTRIES`/`COUNTRY_EN`/`COUNTRY_ALT`, `CITIES_TR`, seed arrays (`INIT_*`).
2. **Utility functions**: date/currency formatting (`fmtTR`, `fmt`, `fmtCur`, `parseMoney`), Turkish-aware lowercasing (`trLower`), KDV/VAT math (`calcKDV`, `extractKDV`, `DEFAULT_KDV_RATE`), a module-level mutable ID counter (`nextId`/`uid()`/`bumpId()` — not React state, used for generating new record IDs across the whole app).
3. **UI primitives**: `Icon`, `Field`, `Input`, `Select`, `MoneyInput`, `Btn`, `StatCard`, `Modal`, `ConfirmDialog`, `Pagination`, `CountryCityFields`. All styling is inline `style={{...}}` objects — there is no CSS framework, CSS module, or styled-components.
4. **Feature components**, each a default-exported-from-file function component used directly by `App`: `Dashboard`, `Customers` (shared by both the "Müşteriler" and "Bayiler" tabs via props like `isCustomer`/`entity`/`title`), `SimpleDealers`, `MachineHistory` (resale chain + service timeline + printable report), `Services`, `ModelsManager`/`KalipManager`/`PartManager` (near-identical CRUD-list sub-components used inside Settings), `Parts`, `Notes`, `Settings` (backup/restore, CSV/XLSX export, update UI, KDV rate, model/mold/part definitions), `Stock`, `Finance`.
5. **`App`** (default export, last in the file): owns all top-level state (`customers`, `dealers`, `services`, `stock`, `notes`, `parts`, `partSales`, `kalipDefs`, `standardModels`/`customModels`, `factory`, `appSettings`, geo data, toast, current `tab`) and renders the sidebar + the active tab's component, passing data/setters down as props (no Context, no Redux/Zustand — plain prop drilling).

### Data persistence pattern
- On mount, `App` calls `window.crmStorage.load()` to read `data.json`; if Electron APIs are absent (e.g. running in a plain browser via `npm run preview`), storage silently no-ops and data only lives in memory for that session.
- Any change to the tracked state arrays triggers a `useRef`-backed 500ms debounced `window.crmStorage.save(...)` writing the *entire* state blob at once.
- `main.cjs` writes saves atomically (write to `.tmp`, then `fs.renameSync`) so a crash mid-write can't corrupt `data.json`.
- Manual backup/restore and scheduled auto-backup (configurable frequency, target folder chosen via native dialog) go through separate IPC channels (`crm:backup`, `crm:restore`, `crm:chooseFolder`, `crm:writeBackup`) and write timestamped JSON files, independent of the live `data.json`.
- New records get IDs from the global `uid()` counter, not from `crypto.randomUUID()` or DB-assigned IDs — when loading saved data, `bumpId(...)` scans existing records to advance the counter past any existing max ID.

### Printing and export
- Printable documents (machine history report, service form) are built as raw HTML strings via template literals (not JSX) inside the relevant component, then sent through `window.appPrint.printHtml(html)`, which opens a visible Electron `BrowserWindow` preview with a Print/Close toolbar injected into the page (see `app:printHtml` handler in `main.cjs`). There's a browser-mode fallback (open as blob / download `.html`) when `window.appPrint` isn't available.
- CSV export is done manually (BOM + `;`-delimited rows) via `downloadCSV()`-style helpers in `Settings`.
- XLSX export/import uses the `xlsx` (SheetJS) package directly in `Settings` for full-data import/export templates.

### Conventions to preserve when editing
- All user-facing strings and form labels are in Turkish — keep new UI text consistent with this.
- Money fields are stored as raw numbers in state and only formatted for display (`fmtCur`/`fmt`); free-text money inputs go through `parseMoney()` to normalize Turkish thousands/decimal separators (`.`/`,`).
- `normalizeSaleType()` exists to map legacy "Faturalı"/"Faturasız" values to the current three-way `SALE_TYPES` ("Faturalı Yurt İçi" / "Faturalı İhracat" / "Faturasız") — don't assume sale type fields are always already normalized when reading old/imported data.
- When adding a new persisted state array in `App`, remember to (1) seed it in the initial load fallback, (2) include it in the debounced save effect's dependency array and payload, and (3) include it in backup export/import and the XLSX template in `Settings` if it should be portable.
