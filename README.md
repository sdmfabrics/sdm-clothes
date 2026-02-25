# SDM Cloth House — Offline-First POS & Inventory

Tech stack: Next.js 14 (App Router), TypeScript, Tailwind CSS, MongoDB Atlas (Mongoose) + local JSON files via Node.js `fs` for offline-first operation.

## Features

- Dashboard: daily/monthly sales, pieces sold, inventory totals, low stock, top fabric, recent sales
- POS billing: fast search by fabric/colour, cart, live total, stock-safe sale completion
- Inventory: add/edit/restock/delete with Fabric+Colour uniqueness
- Low stock alerts
- Receipt printing (80mm thermal layout) with auto-print
- Offline-first:
  - Inventory is served from `local-data/inventory_cache.json` when MongoDB is unreachable
  - Sales are saved to `local-data/pending_sales.json` while offline
  - When internet returns, pending sales auto-sync to MongoDB (and inventory cache refreshes)

## Run locally

1. Install:

```bash
npm install
```

2. Create `.env.local`:

```bash
MONGODB_URI="your mongodb atlas uri here"
NEXTAUTH_SECRET="a-long-random-string-for-jwt-signing"
NEXTAUTH_URL="http://localhost:3000"
```

3. First-time setup: open `http://localhost:3000/setup` and create the owner account (only when no users exist).

4. Build and start:

```bash
npm run build
npm start
```

Open: `http://localhost:3000` and sign in. Owner goes to Dashboard; cashiers go to POS.

## Roles

- **owner**: Dashboard, POS, Inventory, Alerts, Sales History, Users (full access, can delete products and manage users).
- **cashier_pos**: POS and Receipt only.
- **cashier_inventory**: POS and Inventory (restock & edit; cannot delete products or access Dashboard/Users).

## Offline data files

These files are created automatically:

- `local-data/inventory_cache.json`
- `local-data/pending_sales.json`
- `local-data/restock_history.json`

