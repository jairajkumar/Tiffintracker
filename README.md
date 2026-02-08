# 📊 Daily Tracker - Multi-User Tiffin & Expense Tracker

A modern, serverless web application for tracking daily recurring expenses like Tiffin, Milk, and other consumables with dynamic pricing and multi-user support.

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Platform](https://img.shields.io/badge/platform-web-lightgrey.svg)

---

## 📖 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Local Development](#local-development)
  - [Supabase Setup](#supabase-setup)
- [Database Schema](#-database-schema)
- [Application Architecture](#-application-architecture)
- [Usage Guide](#-usage-guide)
- [Configuration](#-configuration)
- [Deployment](#-deployment)
- [API Reference](#-api-reference)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🎯 Overview

Daily Tracker is a single-page web application designed to help users track and manage their daily recurring expenses. It features a beautiful calendar-based interface, real-time bill calculations, and secure multi-tenant architecture where each user manages their own data privately.

### Key Highlights

- **📅 Calendar View**: Visual representation of daily expenses with interactive day modals
- **💰 Price Snapshots**: Captures prices at the time of logging for accurate historical tracking
- **👥 Multi-User**: Secure authentication with isolated data per user
- **📱 Responsive**: Works seamlessly on desktop, tablet, and mobile devices
- **⚡ Serverless**: No backend server required - runs directly with Supabase

---

## ✨ Features

### Authentication
- Email/Password sign-up and sign-in
- Secure session management via Supabase Auth
- Automatic session persistence

### Product Management
- Add custom items with prices (e.g., "Full Tiffin @ ₹100")
- Edit or deactivate products
- Products are user-specific (multi-tenant)

### Daily Logging
- Quick entry form with date picker
- Product dropdown with current prices
- Quantity input with decimal support (e.g., 0.5 for half portion)
- Price snapshot feature - locks price at time of entry

### Reporting & Analytics
- **Calendar View**: Interactive monthly calendar showing daily entries
- **Date Range Filter**: Custom date range for bill calculations
- **Total Bill**: Automatic calculation of expenses for selected period
- **Day Details Modal**: Click any day to view/delete individual entries

### UI/UX
- Modern, clean design with Tailwind CSS
- Smooth animations and transitions
- Dark/light contrast for readability
- Mobile-responsive layout

---

## 🛠 Tech Stack

| Component | Technology |
|-----------|------------|
| **Frontend** | HTML5, JavaScript (ES6+) |
| **Styling** | Tailwind CSS (via CDN) |
| **Backend** | Supabase (PostgreSQL + Auth) |
| **Hosting** | GitHub Pages (Static) |
| **Security** | Postgres Row Level Security (RLS) |

---

## 📁 Project Structure

```
Daily Tracker/
├── index.html      # Main HTML file with UI structure
├── app.js          # Application logic and Supabase integration
├── style.css       # Custom styles (calendar, modals, animations)
├── prd.md          # Product Requirements Document
├── querry.sql      # Database schema and RLS policies
├── CNAME           # Custom domain configuration
└── README.md       # This documentation file
```

### File Descriptions

| File | Description |
|------|-------------|
| `index.html` | Main entry point containing the HTML structure for auth and dashboard views |
| `app.js` | Core application logic including authentication, CRUD operations, and UI rendering |
| `style.css` | Custom CSS for calendar cells, modals, animations, and scrollbar styling |
| `prd.md` | Original Product Requirements Document used to build this application |
| `querry.sql` | SQL schema for creating tables and security policies in Supabase |
| `CNAME` | Custom domain configuration for GitHub Pages |

---

## 🚀 Getting Started

### Prerequisites

- Modern web browser (Chrome, Firefox, Safari, Edge)
- Python 3.x (for local development server)
- Supabase account (free tier works fine)

### Local Development

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd "Daily Tracker"
   ```

2. **Start the local development server**
   ```bash
   python3 -m http.server
   ```

3. **Open in browser**
   ```
   http://localhost:8000
   ```

   > **Note**: The default port is 8000. You can specify a different port:
   > ```bash
   > python3 -m http.server 3000
   > ```

### Supabase Setup

1. **Create a Supabase Project**
   - Go to [supabase.com](https://supabase.com) and create a new project
   - Note your **Project URL** and **anon/public API key**

2. **Run the Database Schema**
   - Navigate to SQL Editor in your Supabase dashboard
   - Copy and paste the contents of `querry.sql`
   - Execute the SQL to create tables and RLS policies

3. **Configure the Application**
   - Open `app.js`
   - Update the configuration constants:
   ```javascript
   const SUPABASE_URL = 'your-project-url';
   const SUPABASE_KEY = 'your-anon-key';
   ```

4. **Enable Authentication**
   - In Supabase dashboard, go to Authentication → Providers
   - Ensure Email provider is enabled

---

## 🗄 Database Schema

### Tables

#### `products`
Stores user-defined items that can be logged.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key (auto-generated) |
| `user_id` | UUID | Foreign key to auth.users |
| `name` | TEXT | Product name (e.g., "Full Tiffin") |
| `current_price` | NUMERIC | Current price for new logs |
| `active` | BOOLEAN | Soft delete flag (default: true) |
| `created_at` | TIMESTAMPTZ | Creation timestamp |

#### `logs`
Stores daily expense entries.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key (auto-generated) |
| `user_id` | UUID | Foreign key to auth.users |
| `product_id` | UUID | Foreign key to products |
| `log_date` | DATE | Date of the log entry |
| `quantity` | NUMERIC | Quantity (supports decimals) |
| `price_snapshot` | NUMERIC | Price at time of logging |
| `created_at` | TIMESTAMPTZ | Creation timestamp |

### Row Level Security (RLS)

All tables have RLS enabled with policies ensuring users can only access their own data:

```sql
-- Products Policy
create policy "Manage own products" on public.products
  for all using (auth.uid() = user_id);

-- Logs Policy
create policy "Manage own logs" on public.logs
  for all using (auth.uid() = user_id);
```

---

## 🏗 Application Architecture

### State Management

The application uses a simple global state object:

```javascript
const state = {
    user: null,          // Current authenticated user
    products: [],        // User's product list
    logs: [],            // Expense logs for current period
    calendarDate: new Date(),  // Current calendar month
    currentModalDate: null     // Date of open modal
};
```

### Component Flow

```
App Initialization
        │
        ▼
┌───────────────┐
│ Check Session │
└───────┬───────┘
        │
   ┌────┴────┐
   ▼         ▼
Auth View   Dashboard View
   │              │
   └──────────────┤
                  ▼
         ┌───────────────┐
         │ Load Products │
         │ & Fetch Logs  │
         └───────┬───────┘
                 │
                 ▼
         ┌───────────────┐
         │ Render UI     │
         │ (Calendar,    │
         │  Forms, etc.) │
         └───────────────┘
```

### Key Functions

| Function | Purpose |
|----------|---------|
| `handleSignIn()` | Authenticate user with email/password |
| `handleSignUp()` | Create new user account |
| `fetchProducts()` | Load user's product list from Supabase |
| `fetchLogs()` | Fetch expense logs for date range |
| `handleAddLog()` | Create new expense entry |
| `handleAddProduct()` | Add new product to catalog |
| `renderCalendar()` | Generate calendar grid with expense data |
| `calculateTotal()` | Compute total bill for current period |
| `openDayModal()` | Display day details modal |

---

## 📱 Usage Guide

### First Time Setup

1. Open the application and click **Sign Up**
2. Enter your email and password
3. Check your email for confirmation (if email verification is enabled)
4. Sign in with your credentials

### Adding Products

1. Scroll to the **Manage Items** section
2. Enter the item name (e.g., "Full Tiffin")
3. Enter the price (e.g., 100)
4. Click **Add Item**

### Logging Daily Expenses

1. In the **Add Daily Log** section:
   - Select the date (defaults to today)
   - Choose a product from the dropdown
   - Enter quantity (supports decimals like 0.5)
2. Click **Add Entry**

### Viewing Reports

1. Use the calendar to navigate months
2. Click on any day to see detailed entries
3. Adjust the date range filters to customize the billing period
4. The **Total Bill** card shows the sum for the selected period

### Deleting Entries

- Click on a day in the calendar to open the modal
- Click the **×** button next to any entry to delete it
- Products can be removed via the **×** on their tag in Manage Items

---

## ⚙️ Configuration

### Environment Variables

The application uses hardcoded configuration in `app.js`:

```javascript
const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_KEY = 'your-anon-public-key';
```

> **Security Note**: The anon key is safe to expose in frontend code because Supabase uses Row Level Security (RLS) to protect data. Never expose service role keys.

### Customization Options

| Setting | Location | Description |
|---------|----------|-------------|
| Default quantity | `index.html:76` | Change `value="1"` to desired default |
| Calendar max items | `app.js:450` | Modify `maxVisible` for items shown per cell |
| Date format | `app.js:45-50` | Customize the `formatDate` function |

---

## 🌐 Deployment

### GitHub Pages

1. Push your code to a GitHub repository
2. Go to Settings → Pages
3. Select the branch to deploy (usually `main`)
4. Your app will be available at `https://username.github.io/repo-name`

### Custom Domain

1. Add a `CNAME` file with your domain name
2. Configure DNS with your domain provider:
   - A record pointing to GitHub Pages IPs
   - Or CNAME record to `username.github.io`

---

## 📚 API Reference

### Supabase Queries

#### Fetch Products
```javascript
supabaseClient
  .from('products')
  .select('*')
  .eq('active', true)
  .order('name')
```

#### Fetch Logs with Product Names
```javascript
supabaseClient
  .from('logs')
  .select(`*, products (name)`)
  .gte('log_date', startDate)
  .lte('log_date', endDate)
  .order('log_date', { ascending: false })
```

#### Insert Log Entry
```javascript
supabaseClient
  .from('logs')
  .insert([{
    log_date: date,
    product_id: productId,
    quantity: qty,
    price_snapshot: priceSnapshot
  }])
```

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

## 🙏 Acknowledgments

- [Supabase](https://supabase.com) - Backend as a Service
- [Tailwind CSS](https://tailwindcss.com) - Utility-first CSS framework
- [GitHub Pages](https://pages.github.com) - Free static hosting

---

<p align="center">
  Made with ❤️ for expense tracking
</p>
