# Kings Building Materials Business Management System (Version 2.0)
**Location:** Lokoja, Kogi State, Nigeria  
**Platform:** Responsive Web Application (Mobile-First)  
**Architecture:** React + Vite + TypeScript + Tailwind CSS + Firebase Auth & Cloud Firestore  
**Hosting:** Vercel  

---

## 🏗️ Product Overview & Guiding Principle
**"Simple to use. Powerful behind the scenes."**

Designed for retail building material stores to operate friction-free without notebooks or confusing accounting software. Every screen uses everyday terminology in plain language, large touch-friendly buttons, and sensible automated calculations.

---

## 🌟 Key Application Features

### 1. Dual-Sided Platform
- **Public Business Website:**
  - Modern homepage with headline: *"Everything You Need to Build. All in One Place."*
  - Available building materials catalogue with category filters and instant search.
  - Direct WhatsApp enquiry button with automated quote formatting.
  - Interactive customer inquiry form sending messages straight into the owner's dashboard.
  - Physical depot location in Lokoja, Kogi State, opening hours, and contact numbers.
- **Private Management System:**
  - Fast 1-click switch between public website and management portal.
  - Strict role-based permissions (Business Owner, Salesperson, Storekeeper, Manager, Accountant).

### 2. Main 6-Section Navigation (PRD Section 3.3)
1. **Home (Business Overview):**
   - 4 large summary cards: *Today's Sales*, *Money Spent Today*, *Materials Available*, and *Customers Owing*.
   - Prominent quick actions: *Sell Materials*, *Add Material*, *Add Stock*, *Record Money Spent*.
   - Low stock warnings and today's estimated operating profit.
2. **Sell (Sell Materials):**
   - Category → product → variation selection flow, so the correct brand and size is recorded.
   - Rapid search by name, brand, size, or keyword (e.g., "Dangote", "12mm", "ceiling", "INGCO").
   - Multi-item cart with automatic subtotals and stock availability validation.
   - Payment methods: Cash, Bank Transfer, POS, Part payment, Credit sale.
   - Instant receipt generation on completion.
3. **Materials (Manage Materials & Catalogue):**
   - Pre-loaded catalogue of **42 researched Nigerian building material products** across six categories: Building Materials & Adhesives, Roofing & Ceiling, Nails & Hardware, Painting Materials, Ropes & Measuring, and Tools & Equipment.
   - Configurable **Product → Variation → Stock/Pricing** model: each product defines dropdown attributes (brand, size, grade, type, packaging) and each saved combination becomes a sellable variation.
   - **Opening Stock Setup** walks the owner through the products they actually stock and captures quantities, buying price, selling price, unit and low-stock threshold.
   - **Catalogue Setup** tab shows review status (Verified, Market estimate, Needs confirmation), suggested brands, supported units, and lets the owner edit options or confirm uncertain products.
   - Real-time stock status badges: Green (Available), Orange (Running Low), Red (Out of Stock).
   - "Add Stock" modal for recording newly arrived trailer/truck deliveries.
   - "Report Damaged Material" workflow for rain/water damage or breakages.
4. **People (Customers & Suppliers):**
   - Separate records for customer debts and supplier payables.
   - Dedicated "Customers Owing" filter with 1-click debt payment recording and balance deduction.
   - Supplier ledger with materials supplied, total supplied amount, amount paid, and balance owed.
5. **Money (Money Management):**
   - Total Sales vs. Cost of Materials Sold (COGS calculated from historical sale costs).
   - Business expenses categorized: Transportation, Fuel, Staff payment, Rent, Repairs, Loading/Offloading, Electricity, Maintenance.
   - Clear Net Operating Profit breakdown.
6. **Records (History & Audit Trail):**
   - Complete sales history with 1-click receipt reprint and WhatsApp sharing.
   - Supplier purchase records and delivery receipts.
   - Site deliveries dispatch tracker (Waiting, Ready, On the Way, Delivered).
   - Immutable stock audit movement log.

### 3. First-Time Guided Walkthrough (PRD Section 4)
- Interactive 4-step walkthrough modal for new staff and storekeepers.
- Quick "How To" FAQ drawer answering common questions (e.g. *How to sell cement*, *How to add stock*, *How to check rod inventory*).
- Accessible anytime via the **Help Guide** button in the header.

### 4. Catalogue Data Model
Products are never hardcoded into the selling screen. The researched catalogue seeds:

- **Product** — name, category, description, suggested brands, supported units, keywords, review status.
- **Attribute definitions** — configurable dropdowns such as Brand, Diameter, Grade, Packaging, Size or Type.
- **Variation** — a saved combination of attributes with its own product code, unit, buying price, selling price, stock quantity and low-stock warning.

New dropdown options can be typed in during opening stock setup, so the shop can add a brand or size without a code change. Requirement notes (for example the unclear "Pattern Wood", "Feet / Feest" or ceiling board brand names) stay visible in Catalogue Setup until the owner confirms them.

---

## 👥 User Roles (PRD Section 2)
The top navigation features a live **Employee Role Switcher** to test and verify role perspectives:
- **Business Owner:** Full access to all modules, selling prices, cost prices, operating profit, employee accounts, and settings.
- **Salesperson:** Dedicated Sell screen, checking materials, previous sales, and printing receipts.
- **Storekeeper:** Materials management, adding arrived stock deliveries, low-stock warnings, and reporting damaged materials.
- **Manager / Accountant:** Operations, customer debts, and financial reports.

---

## 🛠️ Technology Stack
- **Frontend:** React 19, TypeScript, Vite 8, Tailwind CSS v4, Lucide React
- **Backend & Database:** Firebase Authentication, Cloud Firestore (Spark plan; no Cloud Functions or Storage required)
- **Security:** `firestore.rules`, role-based field verification
- **Deployment:** Vercel for the web frontend; Firebase for Auth, Firestore and rules. Firebase Hosting remains configured as a secondary target.

---

## 🚀 Running the Project Locally

```bash
# Install dependencies
npm install

# Start local development server
npm run dev
```

Build for production:
```bash
npm run build
```

The build runs Vite and then `scripts/generate-sitemap.mjs`. The sitemap script reads the public products and categories from Firestore using the same `VITE_FIREBASE_*` environment variables, and falls back to the static routes in `public/sitemap.xml` when Firebase is unavailable or the variables are missing. The result is written to `dist/sitemap.xml`.

---

## 🔎 SEO and Discoverability

The public website is configured for the production custom domain `https://www.blessedkingsenterprises.com.ng/`.

- **Canonical URL and metadata:** `src/config/business.ts` defines the public website URL, which `src/config/site.ts` exposes as `SITE_URL` along with the default title, description and social image. Update the `website` value in `business.ts` if the domain ever changes; the build-time sitemap script reads the same value.
- **Per-route metadata:** `src/components/seo/SeoManager.tsx` updates the title, description, canonical link, Open Graph and Twitter tags as visitors navigate. Product and category pages refine the metadata after Firestore data loads.
- **Structured data:** `index.html` contains JSON-LD for the `HardwareStore` business, website and home page, including opening hours, service area and product categories. Product pages add `Product` and `Offer` JSON-LD at runtime.
- **Sitemap:** `scripts/generate-sitemap.mjs` writes `dist/sitemap.xml` at build time with the static pages plus active products and categories from Firestore. `public/sitemap.xml` is a static fallback.
- **Crawler files:** `public/robots.txt`, `public/llms.txt` and `public/llms-full.txt` describe the public business and catalogue for search engines and AI assistants.
- **Private pages:** `/app`, `/login`, `/forgot-password`, `/unauthorized` and `/not-found` are marked `noindex` in the app and through `X-Robots-Tag` headers in `vercel.json`.
- **Analytics and verification:** Google Analytics 4 (`G-KE3VLSLQN0`) is loaded from `public/analytics.js`; the Google Search Console verification tag is in `index.html`.
- **Social preview:** `public/images/og/kings-building-materials.jpg` is a 1200x630 branded image used for Open Graph and Twitter cards.
- **Contact details:** the public phone and WhatsApp number are defined in `src/config/business.ts`. The email field is intentionally empty, so email links are hidden across the website and receipts until a public address is configured.

### After deploying

1. Add `blessedkingsenterprises.com.ng` and `www.blessedkingsenterprises.com.ng` to the Vercel project and make the `www` hostname the primary domain.
2. Create or claim the Google Business Profile for Kings Building Materials in Lokoja, set the category to building materials supplier, and add the phone number, opening hours, photos and website.
3. Open Google Search Console, verify the domain (the verification meta tag is already in `index.html`), and submit `https://www.blessedkingsenterprises.com.ng/sitemap.xml`.
4. Request indexing for the home page and `/products` after the first production deployment, then re-check the Pages report after a few days.
5. Confirm `/robots.txt`, `/sitemap.xml`, `/llms.txt` and `/llms-full.txt` load on the production domain.

---

## ☁️ Deploying the Frontend to Vercel

Vercel hosts the static React frontend only. Firebase Authentication and Cloud Firestore remain the backend. The Cloud Functions in `functions/` are not deployed to Vercel, and the web client does not call them.

### 1. Import the repository

1. Push this repository to GitHub.
2. In Vercel, choose **Add New → Project** and import the repository.
3. Use these settings:
   - **Framework preset:** Vite
   - **Root directory:** `./`
   - **Build command:** `npm run build`
   - **Output directory:** `dist`
   - **Install command:** `npm install`
4. Deploy.

Node.js 22 is pinned through the `engines` field in `package.json`. `vercel.json` configures the SPA rewrite, so deep links such as `/products/dangote-cement` and `/app/dashboard` load correctly.

### 2. Add environment variables

Add every variable from `.env.example` under **Vercel → Project → Settings → Environment Variables**, for both Production and Preview. `.env` is gitignored and is not uploaded to Vercel.

| Variable | Value |
| --- | --- |
| `VITE_FIREBASE_API_KEY` | Firebase web API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | `blessed-kings-enterprises.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | `blessed-kings-enterprises` |
| `VITE_FIREBASE_STORAGE_BUCKET` | `blessed-kings-enterprises.firebasestorage.app` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase sender ID from the console |
| `VITE_FIREBASE_APP_ID` | Firebase web app ID |
| `VITE_FIREBASE_MEASUREMENT_ID` | Analytics measurement ID (optional) |

`VITE_USE_FIREBASE_EMULATOR` must be unset or `false` on Vercel. All `VITE_*` values are compiled into the browser bundle at build time; the Firebase web API key is a public identifier and access control is enforced by `firestore.rules`.

The sitemap build step also reads `VITE_FIREBASE_API_KEY` and `VITE_FIREBASE_PROJECT_ID` from the Vercel build environment. If they are unavailable, the build still succeeds and deploys the static sitemap fallback.

### 3. Allow the Vercel domain in Firebase

In the Firebase Console, open **Authentication → Settings → Authorized domains** and add the production Vercel domain (for example `kings-enterprise.vercel.app`), plus any custom domain added later. If the Google Cloud API key has HTTP referrer restrictions, add the Vercel domains there as well.

### 4. Deploy Firebase rules separately

Vercel does not deploy Firebase configuration. Whenever `firestore.rules` changes, run:

```bash
firebase deploy --only firestore:rules
```

The existing GitHub Actions workflows continue to deploy `main` to Firebase Hosting as a secondary target.
