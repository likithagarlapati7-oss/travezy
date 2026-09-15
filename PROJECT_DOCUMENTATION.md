# Travezy — Project Technical Documentation & Final Report

**Project Title**: Travezy: Sustainable Tourism, Experience Marketplace & Direct Communication Platform  
**Architecture**: Fullstack SSR/SPA with TanStack Start, React 19, Supabase PostgreSQL, and Nitro  
**Submission Version**: Production Release 1.0.0  

---

## 1. Executive Summary & Problem Statement

### 1.1 Problem Statement
The modern travel industry is plagued by fragmented booking workflows, opaque commission structures, lack of direct communication between tourists and authentic local providers, and inconsistent verification of sustainable tourism practices. Traditional online travel agencies (OTAs) act as intermediaries that hide direct host interactions, resulting in miscommunicated itineraries, payment disputes, and unverified reviews.

### 1.2 Proposed Solution: Travezy
**Travezy** is a comprehensive, fullstack tourism marketplace engineered to bridge the gap between conscientious travellers and verified experience providers. Travezy provides:
1. **Direct Communication**: Real-time websocket chat connecting tourists directly to service hosts with read receipts.
2. **Transparent Lifecycle**: Explicit booking state machines (`Pending` ➔ `Confirmed` ➔ `Completed` / `Cancelled`) with automated multi-channel notifications.
3. **Cryptographic Financial Integrity**: Server-calculated pricing with Razorpay HMAC SHA-256 signature verification.
4. **Verified Feedback**: 100% verified traveller reviews restricted to completed journeys.
5. **Multi-Role Governance**: Role-based access controls for Tourists, Providers, and Admins backed by PostgreSQL Row Level Security (RLS).

---

## 2. System Architecture

```mermaid
graph TB
    subgraph Client Layer
        Browser["React 19 Frontend (SPA / Hydrated SSR)"]
        Router["TanStack Router (Type-Safe Routing)"]
        Query["TanStack Query (Cache & State)"]
    end

    subgraph Server Layer
        Nitro["Nitro Fullstack Server (Node.js)"]
        ServerFn["TanStack Start Server Functions"]
        AuthMiddleware["Supabase Auth & JWT Middleware"]
    end

    subgraph Database & Cloud Infrastructure
        SupaDB[("Supabase PostgreSQL (RLS)")]
        SupaRealtime["Supabase Realtime (WebSockets)"]
        CloudinaryCDN["Cloudinary Media CDN"]
        RazorpayGateway["Razorpay Payment Gateway"]
        MapboxAPI["Mapbox GL Geocoding"]
        AIModel["Google Gemini / OpenAI APIs"]
    end

    Browser --> Router
    Router --> Query
    Query --> ServerFn
    ServerFn --> AuthMiddleware
    AuthMiddleware --> SupaDB
    Browser <-->|WebSocket Realtime| SupaRealtime
    ServerFn -->|Signed Uploads| CloudinaryCDN
    ServerFn -->|HMAC Verification| RazorpayGateway
    Browser -->|Map Tiles| MapboxAPI
    ServerFn -->|Itinerary / AI Guide| AIModel
```

---

## 3. Technology Stack & Rationale

| Layer | Technology | Key Selection Rationale |
| :--- | :--- | :--- |
| **Framework** | **TanStack Start & Nitro** | Unified fullstack TypeScript architecture with type-safe server functions (`createServerFn`), zero runtime API mismatch, and high-performance SSR. |
| **Frontend** | **React 19 & TanStack Router** | Strict type safety across route parameters, search params, and loaders with React 19 concurrent features. |
| **State & Cache** | **TanStack Query v5** | Intelligent query caching (`staleTime`), automatic garbage collection, and seamless optimistic mutations. |
| **Styling & UI** | **Tailwind CSS v4 & Radix UI** | Accessible, unstyled UI primitives combined with utility-first modern glassmorphism design tokens. |
| **Database** | **Supabase PostgreSQL 15** | Relational ACID guarantees, declarative Row Level Security (RLS) policies, and foreign key constraints. |
| **Realtime** | **Supabase Realtime** | Postgres change data capture (CDC) over WebSockets for live chat messages and notification badges. |
| **Payments** | **Razorpay** | Reliable gateway with server-side order generation and cryptographic SHA-256 HMAC verification. |
| **Media CDN** | **Cloudinary** | Fast media transformations, signed uploads, and automated format optimization (WebP/AVIF). |
| **Maps** | **Mapbox GL JS** | High-performance interactive vector mapping and geographical coordinate resolution. |
| **Analytics** | **Chart.js & React-Chartjs-2** | Responsive HTML5 canvas charts for provider and admin financial analytics. |

---

## 4. Database Architecture & Schema Design

```mermaid
erDiagram
    PROFILES ||--o{ PROVIDERS : "owns"
    PROFILES ||--o{ BOOKINGS : "books"
    PROFILES ||--o{ REVIEWS : "writes"
    PROFILES ||--o{ MESSAGES : "sends/receives"
    PROFILES ||--o{ NOTIFICATIONS : "receives"
    PROFILES ||--o{ USER_ROLES : "has"

    PROVIDERS ||--o{ SERVICES : "publishes"
    SERVICES ||--o{ BOOKINGS : "reserved_in"
    SERVICES ||--o{ REVIEWS : "evaluated_in"
    BOOKINGS ||--o{ PAYMENTS : "paid_via"
    BOOKINGS ||--o{ REVIEWS : "reviewed_by"
    BOOKINGS ||--o{ MESSAGES : "referenced_in"

    PROFILES {
        uuid id PK
        text email
        text full_name
        text phone
        text avatar_url
        text bio
        text account_type
        timestamp created_at
    }

    PROVIDERS {
        uuid id PK
        uuid user_id FK
        text business_name
        text description
        boolean verified
        timestamp created_at
    }

    SERVICES {
        uuid id PK
        uuid provider_id FK
        text title
        text description
        text category
        text destination
        decimal price
        text currency
        text image_url
        decimal rating
        int review_count
        boolean is_active
        float latitude
        float longitude
    }

    BOOKINGS {
        uuid id PK
        uuid user_id FK
        uuid service_id FK
        uuid provider_id FK
        date travel_date
        int guests
        decimal total_price
        text status
        text notes
        timestamp created_at
    }

    PAYMENTS {
        uuid id PK
        uuid booking_id FK
        uuid user_id FK
        decimal amount
        text currency
        text status
        text razorpay_order_id
        text razorpay_payment_id
        timestamp created_at
    }

    REVIEWS {
        uuid id PK
        uuid booking_id FK
        uuid service_id FK
        uuid user_id FK
        int rating
        text comment
        text provider_response
        timestamp provider_responded_at
        timestamp created_at
    }

    MESSAGES {
        uuid id PK
        uuid sender_id FK
        uuid recipient_id FK
        uuid booking_id FK
        text content
        timestamp read_at
        timestamp created_at
    }

    NOTIFICATIONS {
        uuid id PK
        uuid user_id FK
        uuid actor_id FK
        text type
        text title
        text message
        text link_url
        boolean is_read
        jsonb metadata
        timestamp created_at
    }
```

---

## 5. Core Platform Workflows

### 5.1 Booking & Availability Sequence
```mermaid
sequenceDiagram
    autonumber
    actor Tourist
    participant Client as Frontend UI
    participant Server as TanStack Start Backend
    participant DB as Supabase PostgreSQL
    actor Provider

    Tourist->>Client: Selects Service, Travel Date & Guests
    Client->>Server: getBookingAvailability(serviceId, date, guests)
    Server->>DB: Query active bookings for date & check capacity limit
    DB-->>Server: Remaining Capacity
    Server-->>Client: { available: true, capacity: remaining }
    Tourist->>Client: Confirms Booking Request
    Client->>Server: createBooking(payload)
    Server->>DB: Verify tourist role & insert booking (status: 'pending')
    Server->>DB: Insert in-app notification for Provider
    Server-->>Client: Booking Created { id: bookingId }
    Client-->>Tourist: Navigates to Confirmation Page
    Provider->>Client: Reviews Booking in Provider Hub
    Provider->>Client: Clicks "Confirm Booking"
    Client->>Server: updateBookingStatus(id, 'confirmed')
    Server->>DB: Update booking status & notify Tourist
    DB-->>Tourist: Realtime WebSocket Alert: "Booking Confirmed! 🎉"
```

### 5.2 Razorpay Payment Verification Workflow
```mermaid
sequenceDiagram
    autonumber
    actor Tourist
    participant Client as Checkout UI
    participant Server as Backend (payments.server.ts)
    participant Razorpay as Razorpay API
    participant DB as Supabase PostgreSQL

    Tourist->>Client: Clicks "Pay Now"
    Client->>Server: createPaymentOrder(bookingId)
    Server->>DB: Fetch booking record (ownership verified)
    Server->>Server: Compute amount strictly from DB (price * guests)
    Server->>Razorpay: orders.create({ amount, currency, receipt })
    Razorpay-->>Server: Order Details { id: order_id }
    Server->>DB: Insert/Update payment record (status: 'PENDING')
    Server-->>Client: { orderId, amount, currency, keyId }
    Client->>Razorpay: Opens Razorpay Modal & Tourist enters payment info
    Razorpay-->>Client: Returns { razorpay_payment_id, razorpay_signature }
    Client->>Server: verifyPayment({ bookingId, orderId, paymentId, signature })
    Server->>Server: HMAC SHA-256 Signature Verification (timingSafeEqual)
    Server->>DB: Update payment status to 'SUCCESS'
    Server->>DB: Notify Tourist with Payment Receipt
    Server-->>Client: { verified: true }
    Client-->>Tourist: Displays Payment Success Receipt Modal
```

---

## 6. Security & Row Level Security (RLS) Architecture

### 6.1 Backend Role-Based Access Control (RBAC)
- **Role Invariants**: Handled at the backend layer through `getBackendUserRole` and `requireRole`.
  - **Tourists**: Restricted to creating bookings, managing own trips, executing own payments, and submitting verified reviews.
  - **Providers**: Restricted to managing own listings, viewing bookings associated with their services, and accessing their own revenue ledger.
  - **Admins**: Elevated governance with safeguard protections (Last-Admin Demotion Protection, foreign key deletion guards).
- **Client Role Spoofing Immunity**: All mutations are executed via authenticated server functions using `requireSupabaseAuth` that extract user claims directly from the cryptographically signed JWT.

### 6.2 PostgreSQL Row Level Security (RLS) Policies
- `profiles`: Users can read all public profiles; can only update their own row.
- `services`: Public read for active listings; Providers can only insert/update/delete services where `provider_id` matches their verified provider account.
- `bookings`: Tourists can only view/insert bookings where `user_id = auth.uid()`; Providers can view bookings where `provider_id` matches their provider account.
- `payments`: Users can only read payments associated with their own bookings; Admins have read access for audit compliance.
- `messages`: Access strictly restricted to rows where `sender_id = auth.uid() OR recipient_id = auth.uid()`.
- `notifications`: Access strictly restricted to rows where `user_id = auth.uid()`.

---

## 7. Performance Optimizations

1. **Intelligent Query Caching**: Configured `staleTime: 5000` to `30000` across TanStack Query hooks, preventing redundant network requests.
2. **Optimized Database Queries**: Replaced separate iterative lookups with composite foreign key queries and profile maps, eliminating N+1 query patterns.
3. **Cloudinary Asset Optimization**: Cloudinary CDN automatically delivers WebP/AVIF formats with responsive dimensions, reducing page payload by up to 65%.
4. **Nitro Server Bundling**: Full SSR code-splitting with sub-second page rendering and pre-warmed database connections.

---

## 8. Limitations & Future Roadmap

### 8.1 Limitations
- Multi-currency conversions currently rely on platform base rates.
- SMS notifications in development simulate delivery via structured log output until Twilio live credentials are configured.

### 8.2 Future Roadmap
- **Mobile Native Apps**: React Native / Expo companion app sharing the existing TanStack Start backend.
- **Automated Payouts**: Integration with Razorpay Route for automated provider escrow payouts upon booking completion.
- **AI Vision Search**: Image-based destination and activity discovery.
