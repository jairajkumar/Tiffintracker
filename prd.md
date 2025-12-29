Here is a complete, developer-ready **Product Requirements Document (PRD)** tailored for an AI agent (like Cursor, Windsurf, or an LLM) to generate the exact code you need.

You can copy-paste the text below directly into your AI tool.

---

# PRD: Multi-User Tiffin & Expense Tracker (Serverless)

## 1. Project Context

**Goal:** Build a single-page web application to track daily recurring expenses (like Tiffin, Milk, etc.) with dynamic pricing.
**Target User:** Multiple users (Multi-tenant). Each user manages their own products, prices, and logs.
**Deployment:** GitHub Pages (Static hosting).
**Architecture:** Frontend-only (HTML/JS) interacting directly with Supabase (BaaS).

## 2. Technical Constraints & Stack

* **File Structure:** Single `index.html` file containing HTML, CSS, and JS (for ease of deployment).
* **Styling:** Tailwind CSS (via CDN).
* **Backend:** Supabase (PostgreSQL + Auth).
* **SDK:** `@supabase/supabase-js` (via CDN).
* **Security:** Logic must rely on Postgres Row Level Security (RLS), not frontend filtering.

---

## 3. Database Schema (Supabase SQL)

*Instruction for the AI: The solution must assume the following SQL schema has been applied to the Supabase project.*

```sql
-- 1. Tables
create table public.products (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null default auth.uid(),
  name text not null,
  current_price numeric not null, -- Default price for new logs
  active boolean default true,
  created_at timestamptz default now()
);

create table public.logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null default auth.uid(),
  product_id uuid references public.products not null,
  log_date date default current_date,
  quantity numeric not null, -- Supports decimals (e.g., 0.5 for half tiffin)
  price_snapshot numeric not null, -- CRITICAL: Price at the moment of logging
  created_at timestamptz default now()
);

-- 2. Security (RLS)
alter table public.products enable row level security;
alter table public.logs enable row level security;

-- Policies: Users can only select/insert their own data
create policy "Manage own products" on public.products
  for all using (auth.uid() = user_id);

create policy "Manage own logs" on public.logs
  for all using (auth.uid() = user_id);

```

---

## 4. Functional Requirements

### 4.1. Authentication (Supabase Auth)

* **View 1: Auth Screen** (Default if not logged in).
* Simple form: Email & Password.
* Two buttons: "Sign In" and "Sign Up".
* *Logic:* On success, store session and swap to Dashboard View.


* **View 2: Dashboard** (Visible only if valid session exists).
* Show "Logout" button in header.



### 4.2. Feature: Product Management (The "Admin" Side)

* User needs a way to define items (e.g., "Full Tiffin @ 100", "Cow Milk @ 60").
* **UI:** A "Manage Items" section or modal.
* **Action:** Form to input `Item Name` and `Price`.
* **Logic:** `insert` into `products` table.

### 4.3. Feature: Daily Logging (The "Tracker" Side)

* **UI:** A prominent form at the top of the dashboard.
* **Date Picker:** Defaults to today.
* **Dropdown:** Fetches list of active `products` for the current user.
* **Quantity Input:** Number field (step 0.5), defaults to 1.
* **Add Button:** Triggers the log entry.


* **Logic:**
1. Get the `current_price` of the selected product.
2. `insert` into `logs` with `quantity` AND `price_snapshot` (do not reference the product price dynamically later; lock it in now).



### 4.4. Feature: Reporting & Totals

* **Filter:** Simple "Month" selector (Defaults to current month).
* **Summary Card:** Big text showing **"Total Bill: ₹[Sum]"**.
* *Formula:* Sum of `(logs.quantity * logs.price_snapshot)` for selected month.


* **History Table:** List of logs showing: Date | Item Name | Qty | Price (at that time) | Total Row Cost.
* **Delete Action:** Small "Trash" icon next to each log row to delete mistakes.

---

## 5. UI/UX Guidelines

* **Theme:** Clean, minimalistic, mobile-responsive. Use standard Tailwind utility classes (e.g., `p-4`, `rounded-lg`, `shadow-md`).
* **Color Palette:** Slate/Gray background, White cards, Blue primary buttons.
* **States:**
* Show a "Loading..." spinner when fetching data.
* Show standard `alert()` or toast messages on success/error.



---

## 6. Implementation Prompt for AI Agent

*Copy this prompt below to generate the code:*

> "Generate a single-file `index.html` solution for the Tiffin Tracker PRD described above.
> 1. Include **Tailwind CSS** and **Supabase JS** via CDN in the `<head>`.
> 2. Initialize Supabase client (use placeholder keys `SUPABASE_URL` and `SUPABASE_KEY`).
> 3. Create a state management system to switch between 'Login' and 'Dashboard' views.
> 4. Implement the 'Add Product' and 'Add Log' forms.
> 5. Implement the 'Monthly Bill' calculation logic using the `price_snapshot` field.
> 6. Ensure the code handles the `fetch` of products and logs immediately after login.
> 7. Add error handling for network requests."
> 
>