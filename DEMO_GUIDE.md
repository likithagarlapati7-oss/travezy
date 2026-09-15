# Travezy — Final Presentation & Demonstration Script

This step-by-step guide is designed for **project evaluations, viva presentations, and live platform demonstrations**.

---

## 🎭 Demo Personas & Test Accounts

| Persona | Role | Typical Credentials (for demo) | Primary Capabilities |
| :--- | :--- | :--- | :--- |
| **Alice Explorer** | `tourist` | `tourist@travezy.test` / `password123` | Search, book, pay, view trips, chat with host, leave reviews, AI guide. |
| **Green Treks Kerala** | `provider` | `provider@travezy.test` / `password123` | Manage listings, upload photos, confirm bookings, chat with guests, review revenue. |
| **Platform Administrator** | `admin` | `admin@travezy.test` / `password123` | Platform telemetry, user management, provider verification, moderation, payments audit. |

---

## 🎬 15-Step Demonstration Walkthrough

### Step 1: Landing Page & Modern UI Presentation
- **URL**: `/`
- **Action**: Open homepage.
- **Key Talking Points**:
  - Point out responsive glassmorphism navbar, hero search bar, curated categories, and featured eco-tourism experiences.
  - Explain the mission: connecting conscientious travellers with sustainable, authentic local hosts.

### Step 2: Tourist Registration & Login
- **URL**: `/login` (or `/register`)
- **Action**: Log in with Tourist credentials.
- **Key Talking Points**:
  - Seamless authentication powered by Supabase Auth with JWT session persistence.
  - Note the dynamic role-based navbar badge and clean user dropdown menu.

### Step 3: Search & Discovery Marketplace
- **URL**: `/services` (or `/hotels`, `/tours`, `/destinations`)
- **Action**:
  - Filter by category (e.g. *Tour*, *Hotel*, *Experience*).
  - Search by destination (e.g. *"Kerala"* or *"Goa"*).
- **Key Talking Points**:
  - Live filtering using TanStack Query caching without lag or full-page reloads.

### Step 4: Service Details & Interactive Geolocation
- **URL**: `/services/[id]`
- **Action**: Click on any service card (e.g. *Kerala Backwaters Houseboat*).
- **Key Talking Points**:
  - Comprehensive listing details, verified host card, and Mapbox GL map showing the location pin.
  - Highlight the "Contact Host" button and verified traveller review distribution bar.

### Step 5: Real-Time Availability & Booking Creation
- **URL**: `/services/[id]/book`
- **Action**:
  - Select an upcoming travel date and guest count (e.g., 2 guests).
  - Note the real-time capacity badge.
  - Click **Confirm Booking**.
- **Key Talking Points**:
  - Backend validation prevents booking past dates or exceeding capacity limits.
  - Total price is calculated strictly by the server to prevent client-side price tampering.

### Step 6: Razorpay Payment Simulation & Printable Receipt
- **URL**: `/tourist/bookings/[id]`
- **Action**:
  - Click **Pay Now** on the pending/confirmed booking.
  - Complete the simulated Razorpay checkout.
  - Click **View Receipt** to inspect the printable modal.
- **Key Talking Points**:
  - Cryptographically secured with HMAC SHA-256 signature verification.
  - Zero private credentials or PANs exposed to the client.

### Step 7: Tourist "My Trips" Dashboard
- **URL**: `/tourist/bookings`
- **Action**: Navigate to **My Trips**.
- **Key Talking Points**:
  - Clean separation into *Upcoming Trips* and *Past Completed Journeys*.
  - Live status badges: `Pending`, `Confirmed`, `Completed`, `Paid`.

### Step 8: Real-Time Tourist ↔ Provider Chat
- **URL**: `/tourist/messages` (or click "Message Host" in booking details)
- **Action**: Send a message to the provider (e.g., *"Hi! Is pickup available from the railway station?"*).
- **Key Talking Points**:
  - Instant WebSocket delivery via Supabase Realtime without polling.
  - Read receipts (`✓` sent / `✓✓` read) and message timestamps.

### Step 9: Live In-App Notification Bell
- **Action**: Observe the Notification Bell in the top right navbar.
- **Key Talking Points**:
  - Unread badge counter increments in real-time.
  - Clicking the bell opens a dropdown preview with relative time stamps and one-click navigation to relevant bookings.

### Step 10: Verified Review Submission & Rating Sync
- **URL**: `/tourist/bookings/[id]`
- **Action**: On a completed booking, click **Write a Review**, select 5 stars, write a comment, and submit.
- **Key Talking Points**:
  - Only tourists with completed bookings are eligible to review (prevents fake reviews).
  - Automatically recalculates the service's average star rating and review count.

### Step 11: Provider Portal & Revenue Analytics
- **Action**: Log out and log in as **Provider** (`/provider/dashboard`).
- **Key Talking Points**:
  - Provider Hub dashboard showing active listings, total reservations, and average host rating.
  - Interactive **Chart.js** revenue visualization showing gross earnings over time.

### Step 12: Provider Listing Management & Cloudinary Upload
- **URL**: `/provider/services`
- **Action**:
  - Click **Add new service**.
  - Use **Cloudinary drag-and-drop** to upload an image.
  - Pick coordinates using the interactive **Mapbox Location Picker**.
- **Key Talking Points**:
  - Server-side image validation (type & size limits) with Cloudinary CDN delivery.
  - Geocoding automatically resolves city, state, and country.

### Step 13: Provider Booking Management
- **URL**: `/provider/bookings`
- **Action**: Inspect incoming reservation and click **Confirm Booking** or **Mark Completed**.
- **Key Talking Points**:
  - Validated state machine transitions.
  - In-modal "Chat with Guest" trigger for direct host assistance.

### Step 14: Admin Console & Platform Governance
- **URL**: `/admin/dashboard`
- **Action**: Log in as **Admin** and navigate through the Admin Console tabs:
  - **Overview**: Real-time Gross Booking Value (GBV) and platform metrics.
  - **Users**: Search users and demonstrate the **Last-Admin Safeguard** preventing accidental demotion of the sole admin.
  - **Providers**: Toggle provider verification badge.
  - **Services & Reviews**: Moderate content with data preservation safeguards.
  - **Payments**: Audit transaction ledger.

### Step 15: AI Travel Assistant, Translator & Emergency Support
- **URL**: `/ai-guide`, `/translator`, `/emergency`
- **Action**:
  - Generate an itinerary in the **AI Travel Guide**.
  - Translate travel phrases in the **Translator**.
  - View emergency SOS numbers in **Emergency Support**.
- **Key Talking Points**:
  - Seamless integration of AI assistance for holistic traveller convenience.

---

## 🏆 Presentation Conclusion
Travezy represents a production-ready, fully tested, secure, and responsive tourism platform ready for live deployment.
