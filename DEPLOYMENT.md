# Travezy Platform: Production Deployment & Operations Guide

This guide provides step-by-step instructions for deploying the **Travezy Tourism Platform** to **Render** with **Supabase PostgreSQL**, **Cloudinary CDN**, **Razorpay Payments**, and **Mapbox Maps**.

---

## 1. Architecture Overview

Travezy is built with **TanStack Start**, **Vite**, and **Nitro**, delivering a fullstack SSR/SPA application running on Node.js:
- **Frontend / SSR Engine**: React 19, TanStack Router, TanStack Query, Tailwind CSS, Radix UI.
- **Backend / Server Functions**: TanStack Start `createServerFn` and Nitro HTTP endpoints.
- **Database & Auth**: Supabase PostgreSQL with Row Level Security (RLS) and Supabase Realtime for chat and live notifications.
- **Media CDN**: Cloudinary for responsive image uploads and optimization.
- **Payment Gateway**: Razorpay for cryptographically verified settlements and webhooks.
- **Maps & Geolocation**: Mapbox GL JS for interactive service listings and location coordinates.

---

## 2. Prerequisites & Accounts

Before deploying, ensure you have active accounts on:
1. **[Render](https://render.com/)**: For hosting the Node.js Web Service.
2. **[Supabase](https://supabase.com/)**: For PostgreSQL database, authentication, and realtime subscriptions.
3. **[Cloudinary](https://cloudinary.com/)**: For image asset storage and CDN delivery.
4. **[Razorpay](https://razorpay.com/)**: For payment gateway integration (Test/Live mode).
5. **[Mapbox](https://mapbox.com/)**: For public map tokens.
6. *(Optional)* **[Resend](https://resend.com/)** & **[Twilio](https://twilio.com/)**: For live email and SMS alerts.

---

## 3. Step-by-Step Render Deployment

### Option A: 1-Click Blueprint Deployment (Recommended)

1. Push your repository to **GitHub** or **GitLab**.
2. Log in to the **[Render Dashboard](https://dashboard.render.com/)**.
3. Click **New +** → **Blueprint**.
4. Connect your Travezy repository. Render will automatically detect [`render.yaml`](file:///c:/Users/likit/Desktop/travezyy/supabase-hub-06-main/render.yaml).
5. Fill in the required Environment Variables prompted by Render.
6. Click **Apply**. Render will automatically provision, build, and deploy your service.

---

### Option B: Manual Web Service Deployment

1. On the Render Dashboard, click **New +** → **Web Service**.
2. Connect your Git repository.
3. Configure the service settings:
   - **Name**: `travezy-web` (or your preferred name)
   - **Region**: Select the region closest to your Supabase database (e.g., `Oregon`, `Frankfurt`, or `Singapore`).
   - **Branch**: `main`
   - **Root Directory**: Leave blank (root).
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run start` (or `node .output/server/index.mjs`)
   - **Plan**: `Free` or `Starter`
4. Add the **Environment Variables** (see Section 4 below).
5. Click **Create Web Service**.

---

## 4. Production Environment Variables Reference

Configure these environment variables in your Render Service Dashboard (**Settings** → **Environment**):

| Variable Name | Required | Description / Example |
| :--- | :---: | :--- |
| `NODE_ENV` | **Yes** | `production` |
| `PORT` | **Yes** | `3000` (Render will set this automatically, but specify `3000` as default) |
| `VITE_SUPABASE_URL` | **Yes** | `https://your-project.supabase.co` |
| `SUPABASE_URL` | **Yes** | `https://your-project.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | **Yes** | `sb_publishable_...` or public anon key |
| `SUPABASE_PUBLISHABLE_KEY` | **Yes** | Same as above |
| `SUPABASE_SERVICE_ROLE_KEY` | **Yes** | Supabase service-role key (Confidential, server-only) |
| `RAZORPAY_KEY_ID` | **Yes** | `rzp_live_...` or `rzp_test_...` |
| `VITE_RAZORPAY_KEY_ID` | **Yes** | Same as above |
| `RAZORPAY_KEY_SECRET` | **Yes** | Razorpay secret key (Confidential, server-only) |
| `VITE_MAPBOX_TOKEN` | **Yes** | `pk.eyJ1...` public Mapbox token |
| `CLOUDINARY_CLOUD_NAME` | **Yes** | Your Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | **Yes** | Cloudinary API Key |
| `CLOUDINARY_API_SECRET` | **Yes** | Cloudinary Secret (Confidential, server-only) |
| `CLOUDINARY_UPLOAD_PRESET`| **Optional** | e.g. `travezy_uploads` |
| `GEMINI_API_KEY` | **Optional** | Google Gemini API key for AI assistant & travel translation |
| `RESEND_API_KEY` | **Optional** | `re_...` Resend API key for transactional emails |
| `TWILIO_ACCOUNT_SID` | **Optional** | Twilio Account SID for transactional SMS |
| `TWILIO_AUTH_TOKEN` | **Optional** | Twilio Auth Token |
| `TWILIO_PHONE_NUMBER` | **Optional** | Twilio phone number |

---

## 5. Third-Party Service Configurations

### 5.1 Supabase Configuration
1. Navigate to **Authentication** → **URL Configuration** in your Supabase Dashboard:
   - **Site URL**: `https://your-app-name.onrender.com`
   - **Redirect URLs**:
     - `https://your-app-name.onrender.com/**`
     - `https://your-app-name.onrender.com/login`
2. Ensure database migrations from `supabase/migrations/` have been applied to your database.
3. Verify that Realtime replication is enabled for tables: `messages`, `notifications`, `bookings`.

### 5.2 Cloudinary Configuration
1. In the Cloudinary Console, navigate to **Settings** → **Upload**:
2. Scroll to **Upload presets** → Click **Add upload preset**.
3. Name the preset `travezy_uploads` (or set Signing Mode to **Signed** if using `CLOUDINARY_API_SECRET`).
4. Set folder to `travezy/services`.

### 5.3 Razorpay Configuration
1. In Razorpay Dashboard, generate **API Keys** (Test or Live mode).
2. Set `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` in Render.
3. *(Optional)* Configure Webhook URL in Razorpay:
   - **URL**: `https://your-app-name.onrender.com/api/payments/verify`
   - **Secret**: Set `RAZORPAY_WEBHOOK_SECRET`
   - **Events**: `payment.captured`, `payment.failed`, `order.paid`.

---

## 6. Verification & Health Check

After deployment completes on Render:

1. **Verify Root Health**:
   - Visit `https://your-app-name.onrender.com/` → Verify homepage loads with dynamic hero, destinations, and navbar.
2. **Verify Authentication & Session**:
   - Register a new account or log in → Confirm session persists across page refreshes.
3. **Verify Listings & Maps**:
   - Open `/services` → Confirm filters, category tags, and Mapbox map load with active pins.
4. **Verify Booking & Payments**:
   - Create a booking for a service → Confirm availability check succeeds → Test payment modal.
5. **Verify Real-Time Chat & Notifications**:
   - Send a chat message between tourist and provider → Confirm real-time message bubble appears and notification bell updates.
6. **Verify Cloudinary Media Upload**:
   - As a provider, add a service and upload an image → Verify image renders in listing cards.

---

## 7. Common Deployment Issues & Solutions

| Problem | Cause | Solution |
| :--- | :--- | :--- |
| **Blank page on SPA route refresh (404)** | Web server not routing SPA requests to index handler. | Handled automatically by Nitro SSR server entry (`.output/server/index.mjs`). |
| **Supabase 401 Unauthorized** | Missing or mismatched `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY`. | Verify environment variables in Render Dashboard and re-deploy. |
| **Razorpay Checkout Fails** | Missing `RAZORPAY_KEY_ID` or `RAZORPAY_KEY_SECRET`. | Ensure keys are configured in Render environment variables. |
| **Mapbox Blank Map** | Invalid or missing `VITE_MAPBOX_TOKEN`. | Ensure token starts with `pk.` and domain is authorized in Mapbox account settings. |
| **CORS Errors** | Requesting external resources without CORS headers. | TanStack Start SSR server handles API requests internally via server functions. |
