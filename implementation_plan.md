# Café Management System — System Design

A full-stack café POS and management platform with a React Native mobile app and a Node.js/PostgreSQL backend.

---

## Overview

The system is split into two primary surfaces:

1. **Front-of-House (FOH) App** — Cashier/order-taking app for placing orders and generating bills. Designed **tablet-first (landscape)** with a sidebar+content layout, but fully functional on portrait phones.
2. **Manager/Admin App** — Inventory management, analytics dashboards, menu configuration, shop expense tracking.

Both surfaces live inside one React Native app with role-based navigation. The app is **offline-first**: all critical data is cached locally in SQLite (via Expo SQLite + Drizzle) and synced to the Postgres backend when connectivity is restored.

---

## Tech Stack

| Layer                  | Technology                                        | Rationale                                         |
| ---------------------- | ------------------------------------------------- | ------------------------------------------------- |
| **Mobile App**         | React Native (Expo SDK 51+)                       | Cross-platform iOS/Android/iPadOS, fast iteration |
| **Navigation**         | Expo Router (file-based)                          | Deep links, tab + stack + sidebar layout          |
| **State / Cache**      | Zustand + TanStack Query                          | Local UI state + server cache                     |
| **UI Library**         | NativeWind (Tailwind for RN) + Tamagui primitives | Fast, consistent theming, responsive breakpoints  |
| **Offline DB (local)** | Expo SQLite + Drizzle ORM (SQLite dialect)        | Local-first order queue with sync                 |
| **Sync Layer**         | Custom sync queue (outbox pattern)                | Reliable offline → online sync                    |
| **API Layer**          | Node.js + Hono (lightweight, edge-ready)          | Type-safe, fast HTTP server                       |
| **ORM (server)**       | Drizzle ORM (Postgres dialect)                    | Type-safe SQL, great Postgres support             |
| **Database**           | PostgreSQL 16                                     | Reliable RDBMS, rich aggregation                  |
| **Auth**               | Better-Auth or Clerk (JWT/session)                | Role-based access (cashier / manager / admin)     |
| **Realtime**           | Server-Sent Events or Supabase Realtime           | Live order status updates                         |
| **File Storage**       | Supabase Storage or S3                            | Menu item images                                  |
| **Deployment**         | Railway / Render (backend), EAS Build (app)       | Simple, low-ops hosting                           |

---

## User Roles

| Role        | Access                                                        |
| ----------- | ------------------------------------------------------------- |
| **Cashier** | Place orders, view menu, generate bills, mark orders complete |
| **Manager** | All cashier access + inventory management, analytics view     |
| **Admin**   | All above + user management, menu CRUD, system config         |

---

## Database Schema (Drizzle ORM)

### `users`

```sql
id          uuid PK
name        text
email       text UNIQUE
password    text (hashed)
role        enum('cashier','manager','admin')
created_at  timestamp
```

### `categories`

```sql
id          uuid PK
name        text          -- e.g. "Juices", "Snacks"
icon        text          -- emoji or icon key
sort_order  int
```

### `menu_items`

```sql
id              uuid PK
category_id     uuid FK → categories
name            text
description     text
image_url       text
selling_price   numeric(10,2)
is_available    boolean DEFAULT true
is_deleted      boolean DEFAULT false
created_at      timestamp
```

### `flavours`

```sql
id              uuid PK
name            text          -- e.g. "Mango", "Strawberry"
base_flavour_id uuid FK → flavours (self-ref, NULL = it is a base)
```

> This supports your "20 flavours, 90% share the same base" requirement.
> A flavour like "Mango Twist" points to base "Mango".

### `menu_item_flavours` _(junction)_

```sql
menu_item_id    uuid FK → menu_items
flavour_id      uuid FK → flavours
extra_cost      numeric(10,2) DEFAULT 0   -- upcharge for exotic flavours
PRIMARY KEY (menu_item_id, flavour_id)
```

### `recipes` _(ingredient cost per menu item)_

```sql
id              uuid PK
menu_item_id    uuid FK → menu_items
flavour_id      uuid FK → flavours (nullable — common cost)
ingredient_name text          -- e.g. "Base syrup", "Fresh fruit"
unit            text          -- ml, g, pcs
quantity        numeric(10,3)
cost_per_unit   numeric(10,4)
```

> `cost_per_unit × quantity` = ingredient cost.
> Sum across a recipe = total ingredient cost for one item.

### `making_costs`

```sql
id              uuid PK
menu_item_id    uuid FK → menu_items
label           text          -- e.g. "Labour", "Packaging", "Electricity"
amount          numeric(10,2)
```

### `inventory_items`

```sql
id              uuid PK
name            text          -- matches ingredient_name for cost link
unit            text
current_stock   numeric(10,3)
reorder_level   numeric(10,3)
cost_per_unit   numeric(10,4)
updated_at      timestamp
```

### `inventory_adjustments`

```sql
id              uuid PK
inventory_item_id uuid FK → inventory_items
user_id         uuid FK → users
type            enum('restock','manual_correction','waste')
quantity_delta  numeric(10,3)
note            text
created_at      timestamp
```

### `orders`

```sql
id              uuid PK
order_number    serial / text (e.g. ORD-0042)
cashier_id      uuid FK → users
table_ref       text (nullable)        -- "Table 3", "Takeaway"
status          enum('open','billed','paid','voided')
payment_method  enum('cash','upi','card','split') nullable
subtotal        numeric(10,2)
discount_amount numeric(10,2) DEFAULT 0
total_amount    numeric(10,2)
notes           text
created_at      timestamp
paid_at         timestamp
```

### `order_items`

```sql
id              uuid PK
order_id        uuid FK → orders
menu_item_id    uuid FK → menu_items
flavour_id      uuid FK → flavours (nullable)
quantity        int
unit_price      numeric(10,2)   -- snapshot at time of order
item_cost       numeric(10,2)   -- computed ingredient+making cost snapshot
line_total      numeric(10,2)
notes           text            -- "less sweet", "extra ice"
```

### `shop_expenses`

```sql
id              uuid PK
recorded_by     uuid FK → users
category        text          -- e.g. "Rent", "Electricity", "Staff Salary", "Supplies"
amount          numeric(10,2)
note            text
expense_date    date
created_at      timestamp
```

> Expenses are logged manually by the manager and included in net profit calculations.
> `category` is a free-text field (no separate table) to keep it simple.

### `bills`

```sql
id              uuid PK
order_id        uuid FK → orders UNIQUE
bill_number     text
generated_at    timestamp
printed_at      timestamp (nullable)
```

---

## API Surface (Hono + REST/tRPC)

### Auth

- `POST /auth/login`
- `POST /auth/logout`
- `GET  /auth/me`

### Menu

- `GET  /menu` — list categories + items (for FOH)
- `GET  /menu/items/:id`
- `POST /menu/items` (admin)
- `PUT  /menu/items/:id` (admin)
- `PATCH /menu/items/:id/toggle` — availability toggle

### Orders

- `POST /orders` — create new order
- `GET  /orders/:id`
- `PATCH /orders/:id` — update status, add items
- `POST /orders/:id/bill` — finalize and generate bill
- `POST /orders/:id/pay` — mark paid, record payment method

### Inventory

- `GET  /inventory`
- `PATCH /inventory/:id` — update stock / cost
- `POST /inventory/adjust` — log adjustment
- `GET  /inventory/adjustments` — audit log

### Expenses

- `GET  /expenses?from=&to=` — list shop expenses
- `POST /expenses` — log a new expense
- `PATCH /expenses/:id` — edit an expense
- `DELETE /expenses/:id` — remove an expense

### Analytics

- `GET  /analytics/sales?from=&to=` — revenue, order count
- `GET  /analytics/top-items?from=&to=`
- `GET  /analytics/profit?from=&to=` — revenue minus COGS minus shop expenses = net profit
- `GET  /analytics/expenses-breakdown?from=&to=` — expenses grouped by category
- `GET  /analytics/inventory-usage?from=&to=`

### Sync (Offline Support)

- `POST /sync/orders` — bulk upsert orders + order_items from offline queue
- `GET  /sync/menu` — pull latest menu snapshot for local cache

---

## UI Design System

> [!NOTE]
> All UI specs are derived from the reference design provided. The app name/logo will be replaced with the actual café brand.

### Color Palette

| Token                   | Hex       | Usage                                            |
| ----------------------- | --------- | ------------------------------------------------ |
| `--color-primary`       | `#1B4332` | Active category card, CTA buttons, tab highlight |
| `--color-primary-light` | `#2D6A4F` | Hover states, icon accents                       |
| `--color-surface`       | `#F5F1E8` | App background (warm cream)                      |
| `--color-card`          | `#FFFFFF` | Menu item cards, cart panel                      |
| `--color-border`        | `#E8E2D9` | Card borders, dividers                           |
| `--color-text-primary`  | `#1A1A1A` | Item names, prices, headings                     |
| `--color-text-muted`    | `#8A8A8A` | Subtitles, placeholder text                      |
| `--color-success-bg`    | `#E8F5EE` | "Available" badge background                     |
| `--color-success-text`  | `#1B4332` | "Available" badge text                           |
| `--color-warning`       | `#F97316` | "Need to re-stock" badge                         |
| `--color-add-btn`       | `#FFFFFF` | + button background (bordered circle)            |

### Typography

| Element             | Font  | Weight  | Size        |
| ------------------- | ----- | ------- | ----------- |
| App header / Logo   | Inter | 700     | 14px        |
| Date / breadcrumb   | Inter | 400     | 14px        |
| Category card title | Inter | 700     | 20px        |
| Category item count | Inter | 400     | 13px        |
| Menu item name      | Inter | 600     | 13px        |
| Menu item price     | Inter | 500     | 12px, muted |
| Receipt heading     | Inter | 700     | 16px        |
| Order-type tab      | Inter | 600     | 13px        |
| Order item name     | Inter | 600     | 14px        |
| Payment label/value | Inter | 400/600 | 13px        |
| CTA button          | Inter | 700     | 16px        |

### Component Specs — FOH Screen

#### 1. Top Header Bar

- Full-width bar with `--color-card` background, bottom border
- **Left**: Café logo + name (2-line stacked, bold green) + current date
- **Center-right**: "Total: N Orders" label + **Report** button (outlined, icon + label)
- **Right**: Notification bell with red badge dot + User avatar chip (avatar image + name + role label)

#### 2. Search Bar

- Full-width input with rounded pill shape, light border
- Left: search icon; Right: keyboard shortcut badge (⌘K style)
- Background: white, placeholder text muted

#### 3. Category Pill Cards (horizontal scroll row)

- **Active card**: Dark green (`--color-primary`) background, white text, decorative item illustration (right-aligned, ghosted)
- **Inactive card**: White background, dark text, item count below name
- **Warning card**: White background, orange "Need to re-stock ⚠" badge top-left
- Height ~90px, rounded-xl corners, slight shadow
- Availability badge: pill-shaped, top-left of card

#### 4. Menu Item Grid Cards

- **4 columns** in landscape tablet layout
- Each card: white background, rounded-xl, subtle shadow
- Product photo centered (transparent background PNG preferred)
- Item name (bold, dark) + price (muted, below name)
- **`+` button**: bottom-right, circular, white background with dark green border, dark green `+` icon
- Tap card → opens bottom sheet for flavour selection + qty + notes

#### 5. Right Panel — Receipt / Cart

- White card background, rounded-2xl, slight shadow
- **Header row**: Back chevron icon (dark green filled circle) + "Purchase Receipt #XXXXX" text + list icon button
- **Order-type tab bar**: 3 tabs — Dine In / Take Away / Order Online; active tab = dark green filled pill, inactive = plain text
- **Customer Name field**: text input, rounded, light border, label above
- **Table selector**: dropdown with chevron, label above, rounded border — shows e.g. "B12 - Indoor"
- **Order List**: scrollable; each item row has:
  - Thumbnail (small, rounded)
  - Item name + size + price (right-aligned)
  - Notes line (icon + muted text, e.g. "Less Sugar")
  - Quantity stepper: `−` `[count]` `+` controls
- **Payment Details section**:
  - Label "Payment Details" (bold)
  - Rows: Subtotal, Tax (if any), **Total** (bold)
  - Right-aligned values
- **Place Order CTA**:
  - Full-width, dark green, rounded-full pill button
  - Left: white arrow-in-circle icon
  - Center: "Place Order"
  - Right: price amount + `»` chevrons
  - Height ~52px

#### 6. Offline Banner

- Thin banner below header, amber/yellow background
- Icon + "Offline Mode — orders will sync when connection is restored"

### Responsive — Portrait Phone

- Left panel takes full screen
- Cart is a **floating bottom drawer** (drag up to expand)
- Category row scrolls horizontally
- Menu grid collapses to **2 columns**

### Manager Screens Design Language

- Same cream background (`--color-surface`)
- Cards use `--color-card` white with border
- Charts: use the primary green palette with cream fills
- Stat cards on dashboard: white card, large bold number, muted label, green trend indicator
- Table rows: alternating subtle cream/white, no heavy borders

---

### Tablet Layout (Primary)

The FOH screen uses a **two-column split layout** in landscape:

- **Left panel (~65%)** — Top bar + search + category pills + 4-column menu item grid
- **Right panel (~35%)** — Receipt header + order-type tabs + customer/table fields + order list + payment summary + CTA

On portrait phones, these collapse into a single stack with a bottom cart drawer.

### Cashier Flow (FOH)

```
Home / New Order
  ├── [LEFT]  Menu Browser (category tabs → item grid)
  │             └── Item Detail sheet (pick flavour, qty, notes)
  └── [RIGHT] Live Cart
                └── Checkout Sheet (discount, payment method)
                      └── Bill / Receipt View (on-screen, share PDF)

Orders History tab
  └── Order Detail → Mark Paid / Void

[Offline banner shown when no network — orders queue locally]
```

### Manager Flow

```
Dashboard (today's snapshot: revenue, orders, top item, net profit)
  ├── Sales Analytics
  │     ├── Revenue & order count over time
  │     ├── Top selling items
  │     └── Gross profit margin breakdown
  ├── Expenses
  │     ├── Expense list (filterable by date / category)
  │     ├── Log Expense (category, amount, date, note)
  │     └── Expense summary by category (chart)
  ├── Net Profit View (Sales profit − Shop expenses)
  ├── Inventory
  │     ├── Stock list (current levels, reorder alerts)
  │     ├── Adjust Stock (restock / waste)
  │     └── Ingredient cost editor
  └── Menu Management
        ├── Item list (enable/disable, edit price)
        └── Add/Edit Item (name, flavours, recipe costs)
```

---

## Key User Flows

### 1. Taking an Order (Cashier)

1. Tap **New Order** → enter table or "Takeaway"
2. Browse categories → select item → pick flavour → set qty → tap **Add to Cart**
3. Repeat for all items
4. Tap **Checkout** → review cart → apply discount (if any)
5. Tap **Generate Bill** → bill displayed on screen
6. Customer pays → select payment method → tap **Mark Paid**
7. Order moves to **Completed**; stock auto-decremented

### 2. Inventory Restocking (Manager)

1. Open **Inventory** tab → see items below reorder level highlighted
2. Tap item → tap **Restock** → enter quantity + cost per unit
3. Confirm → stock updated, adjustment logged with timestamp + user

### 3. Offline Order (Cashier — no internet)

1. App detects no connectivity → shows **"Offline Mode"** banner
2. Cashier takes order normally — order written to local SQLite queue
3. Internet restored → sync queue automatically flushes to server via `POST /sync/orders`
4. Synced orders appear in analytics and history as normal

### 4. Profit Analysis (Manager)

1. Open **Analytics** → **Profit** tab
2. Pick date range
3. See: Revenue vs. COGS (ingredient + making costs) = **Gross Profit**
4. See: Gross Profit − Shop Expenses = **Net Profit**
5. Drill into individual item margins or expense categories

---

## Cost & Profit Tracking Logic

For each `order_item` at the time of ordering:

```
ingredient_cost  = SUM(recipe.quantity × recipe.cost_per_unit)   for that item+flavour
making_cost      = SUM(making_costs.amount)                      for that item
item_cost        = ingredient_cost + making_cost                 (stored as snapshot)

gross_profit_per_item = unit_price − item_cost
```

Snapshots are stored so historical profit reports remain accurate even after costs change.

For the **Net Profit** view over a date range:

```
total_revenue    = SUM(order_items.line_total)       where order.status = 'paid'
total_COGS       = SUM(order_items.item_cost × qty)
gross_profit     = total_revenue − total_COGS

shop_expenses    = SUM(shop_expenses.amount)         for the same date range
net_profit       = gross_profit − shop_expenses
```

---

## Juice Flavour System (Specific Design)

Given ~20 flavours where 90% share a common base:

- One **base flavour** row (e.g., `id: base-juice, name: "Standard Juice Base"`)
- 18 common variants point to `base_flavour_id = base-juice`
- 2 exotic variants with their own recipe and `extra_cost` in `menu_item_flavours`
- Recipe has **shared rows** (linked to `flavour_id = NULL`) for common ingredients
- **Flavour-specific rows** (with `flavour_id` set) for fruit pulp / syrup differences

This avoids duplicating 18 near-identical recipes and makes bulk cost updates simple.

---

## Phased Rollout

### Phase 1 — MVP (5–7 weeks)

- [ ] Server DB schema + Drizzle migrations (Postgres)
- [ ] Auth (cashier + admin roles, JWT)
- [ ] Menu CRUD (backend + admin screen)
- [ ] Tablet-first FOH layout (landscape split + phone fallback)
- [ ] Order creation + billing flow (FOH screens)
- [ ] **Offline-first SQLite local DB** (Drizzle SQLite dialect in Expo)
- [ ] **Outbox sync queue** — auto-flush on reconnect via `POST /sync/orders`
- [ ] Basic inventory list + manual stock adjustment
- [ ] Bill generation (on-screen + share as PDF)
- [ ] Shop expenses — log and list (manager screen)

### Phase 2 — Analytics & Cost Tracking (2–3 weeks)

- [ ] Recipe + making cost entry UI
- [ ] Gross profit analytics (revenue vs COGS)
- [ ] Net profit view (gross profit − shop expenses)
- [ ] Expense breakdown chart (by category)
- [ ] Sales charts (daily/weekly/monthly)
- [ ] Top items report

### Phase 3 — Polish & Scale (ongoing)

- [ ] Reorder alerts / push notifications
- [ ] Discount and promo codes
- [ ] Bluetooth thermal printer integration (ESC/POS)
- [ ] Multi-branch support
- [ ] Conflict resolution UI for sync edge cases

---

## Resolved Decisions

| Question        | Decision                                                                  |
| --------------- | ------------------------------------------------------------------------- |
| Device target   | **Tablet-first** (landscape), responsive to portrait phone                |
| Offline support | **Yes** — SQLite outbox pattern, Phase 1                                  |
| Thermal printer | **Later** — Phase 3                                                       |
| Tax / GST       | **None** — no tax fields                                                  |
| Shop overhead   | **`shop_expenses` table** — manual log by manager, included in net profit |
