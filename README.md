# SnapFix — Civic Grievance Management Platform

> A real-time, role-based civic complaint management system that connects **Citizens**, **Organisations**, **NGOs**, and **Administrators** to resolve urban issues efficiently.

---

## Table of Contents

- [Overview](#overview)
- [Live Demo](#live-demo)
- [Tech Stack](#tech-stack)
- [Features by Role](#features-by-role)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Variables](#environment-variables)
  - [Running Locally](#running-locally)
- [User Guide](#user-guide)
  - [Signing Up](#signing-up)
  - [Logging In](#logging-in)
  - [Completing Your Profile (Required)](#completing-your-profile-required)
  - [Citizen — Reporting an Issue](#citizen--reporting-an-issue)
  - [Organisation — Managing Complaints](#organisation--managing-complaints)
  - [NGO — Adopting Orphan Cases](#ngo--adopting-orphan-cases)
  - [Admin — Platform Oversight](#admin--platform-oversight)
- [Complaint Lifecycle](#complaint-lifecycle)
- [Secret Codes](#secret-codes)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [FAQ & Troubleshooting](#faq--troubleshooting)

---

## Overview

**SnapFix** is a full-stack civic tech platform built for hackathons and real-world use. Citizens can report infrastructure problems (potholes, water outages, broken streetlights, etc.) with geo-tagged photos. Registered Organisations and NGOs pick up and resolve these complaints. City Admins maintain oversight, handle escalations, and track overdue cases — all in one real-time dashboard.

---

## Live Demo

> hackathon-five-mu-59.vercel.app

here are some credentials to login as 
admin:
  email:admin@gmail.com
  password: 123456
organisation:
  email:anshorg@gmail.com
  pass:123456
ngo:
  email:ngo@gmail.com
  pass:123456;

if you want to signup as admin,organisation or ngo then use secreatkey:982656

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend Framework | React 19 + Vite 8 |
| Routing | React Router DOM v7 |
| State Management | Zustand |
| Backend / Database | Firebase Firestore (NoSQL, real-time) |
| Authentication | Firebase Auth (Email/Password + Google OAuth) |
| Image Storage | Cloudinary (unsigned upload preset) |
| Maps | React Leaflet + Leaflet.heat (heatmap) |
| Geocoding | OpenStreetMap Nominatim (free, no API key) |
| Icons | Lucide React |
| Date Utilities | date-fns |

---

## Features by Role

### 👤 Citizen
- Sign up instantly with **Google OAuth** (one click, no password)
- Report civic issues with a **title, description, category, and urgency level**
- **Automatic GPS detection** — your location is resolved to a human-readable address via Nominatim
- Attach evidence using your **device camera** (live viewfinder) or by uploading from your gallery
- View all your submitted complaints and their real-time status
- Receive **in-app notifications** when your issue is accepted or resolved
- **Escalate** a resolution you're not satisfied with by submitting feedback

### 🏢 Organisation
- Register with an **official email, password, and system secret code**
- Choose a **specialty category** (Roads, Water, Electricity, Sanitation, Noise, Other) — you will only see complaints in your category
- Browse and **Accept & Assign** incoming complaints from your city
- **Mark complaints as Resolved** by uploading photographic proof (stored on Cloudinary)
- Review citizen satisfaction feedback for each resolved case

### 🤝 NGO
- Register with a secret code (same as Organisation)
- Browse **"orphan" complaints** — cases not yet picked up by any organisation
- **Adopt cases** and track them under "Active Missions"
- Submit verified photographic proof to close a case and build your impact history

### 🛡️ Admin
- Full read access to all complaints in your **city/region**
- View **High Priority Queue**, **All Complaints**, **Escalation Audit**, and **Overdue** tabs
- See a live **overdue alert banner** for any case pending more than 10 days
- **Overrule** a disputed resolution or **reject proof and re-assign** to a new handler
- Access the **Interactive Heatmap** — a geographic view of complaint density

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or later
- A [Firebase](https://console.firebase.google.com/) project with Firestore and Authentication enabled
- A [Cloudinary](https://cloudinary.com/) account with an unsigned upload preset

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/snapfix.git
cd snapfix

# Install dependencies
npm install
```

### Environment Variables

Create a `.env` file in the project root. Copy the template below and fill in your own values:

```env
# --- Firebase ---
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX

# --- Cloudinary ---
VITE_CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
VITE_CLOUDINARY_UPLOAD_PRESET=your_unsigned_upload_preset
```

> ⚠️ **Never commit your `.env` file.** It is already listed in `.gitignore`.

#### Firebase Setup Checklist

1. Go to [Firebase Console](https://console.firebase.google.com/) → Create a project
2. Enable **Firestore Database** (start in test mode for development)
3. Enable **Authentication** → Sign-in methods → turn on **Email/Password** and **Google**
4. Copy your project's Web App config into the `.env` file above
5. Set the following **Firestore Security Rules** (or tighten as needed for production):

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /Users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      allow read: if request.auth != null;
    }
    match /Complaints/{complaintId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

#### Cloudinary Setup Checklist

1. Log into [Cloudinary](https://cloudinary.com/) → Settings → Upload
2. Scroll to **Upload Presets** → Add a new preset
3. Set **Signing Mode** to `Unsigned`
4. Copy the preset name into `VITE_CLOUDINARY_UPLOAD_PRESET`

### Running Locally

```bash
npm run dev
```

The app will be available at `http://localhost:5173` by default.

---

## User Guide

### Signing Up

<img width="1913" height="854" alt="Screenshot 2026-04-01 120654" src="https://github.com/user-attachments/assets/df6bfb80-f5a5-4cf1-b6fa-985a49a10137" />


1. Navigate to the app — you will land on the **Sign Up** page.
2. Choose your **role** from the tab selector:

   | Role | Who should pick this |
   |---|---|
   | **Citizen** | Anyone who wants to report a civic issue |
   | **Organisation** | Government body or utility company (requires secret code) |
   | **NGO** | Non-profit or volunteer group (requires secret code) |
   | **Admin** | City administrator / platform monitor (requires secret code) |

3. **For Citizens:** Click **Continue with Google** — no form to fill out.
4. **For all other roles:** Fill in your Full Name, Official Email, Password, and the System Secret Code. Organisations must also pick a specialty category.

### Logging In

- Already have an account? Click **"Log in"** on the signup page (or navigate to `/login`).
- Citizens log in with Google; all other roles use email and password.

### Completing Your Profile (Required)

<img width="876" height="754" alt="Screenshot 2026-04-01 121556" src="https://github.com/user-attachments/assets/442ffe6c-e992-4192-b385-ac213a64feb6" />


> **This step is mandatory before you can use any dashboard.**

After signing up, the app will redirect you to **Settings** if your profile is incomplete. Fill in:

- **City** — used to scope all complaints to your region (case-insensitive)
- **Age** — required for Citizen profiles

Once saved, you will be redirected to your role-specific dashboard.

---

### Citizen — Reporting an Issue

<img width="622" height="811" alt="image" src="https://github.com/user-attachments/assets/4749e4e5-27fa-4c4c-a1fc-96f106258d88" />


1. Click **"Report Issue"** in the sidebar.
2. Fill in the **Issue Title** and **Description**.
3. Select a **Category** (Roads, Water, Electricity, Sanitation, Noise, Other) and **Urgency** (Low / Medium / High).
4. **Location** is detected automatically using your browser's GPS. Allow location access when prompted. If detection fails, click **Detect** to retry.
5. Attach an **Evidence Photo**:
   - Click **Upload Photo** to pick an image from your device, or
   - Click **Take Photo** to use your device's live camera (browser will ask for camera permission).
6. Click **Submit Grievance**. The complaint is instantly visible to Organisations and NGOs in your city.

**Tracking your complaint:**
- Go to the **My Complaints** tab to see all your submissions with their current status.
- Open **Notifications** to read system alerts whenever your issue is accepted or resolved.

**If you're unsatisfied with a resolution:**
- Open the complaint detail page (`View →` link).
- Submit your feedback and mark it as unsatisfied — this escalates the complaint to the Admin for review.

---

### Organisation — Managing Complaints

1. After login and profile setup, your dashboard shows **Active Work** — all open complaints in your city that match your registered category.
2. Click **Accept & Assign** on a complaint to take ownership of it.
3. Once the physical work is done, click **Mark Resolved**.
4. A modal will prompt you to upload a **resolution photo** as proof — this is mandatory.
5. The complaint is marked **Resolved** and the citizen is notified.
6. View all cases you've resolved under **Past Resolutions**, including any citizen feedback.

---

### NGO — Adopting Orphan Cases

1. The **Orphan Center** shows all complaints in your city with status `Registered` that no organisation has picked up.
2. Click **Adopt Case** to assign it to your NGO.
3. The case moves to **Active Missions** — work on the issue on the ground.
4. Click **Submit Verified Proof** and upload a photo to close the case.
5. Check your **Verified Impact** history to see all cases your NGO has resolved.

---

### Admin — Platform Oversight

Your dashboard is divided into four tabs:

| Tab | What you can do |
|---|---|
| **Regional Overview** | See KPI cards (Total, Open, Resolved, Escalated) and the high-priority queue |
| **All Complaints** | Browse every complaint in your city sorted by date; overdue cases are highlighted in orange |
| **Escalation Audit** | See complaints disputed by citizens; overrule the decision or reject proof and reassign |
| **Overdue** | Cases pending for more than 10 days — use this to manually push stuck complaints |

**Interactive Heatmap:**  
Click **Interactive Heatmap** in the sidebar (or navigate to `/map`) to see a live geographic density map of all complaints in your region. Use the layer controls to filter by status.

---

## Complaint Lifecycle

```
Citizen submits complaint
        │
        ▼
   [ Registered ] ─────────────────────────────────────────┐
        │                                                   │
        │  Organisation/NGO clicks "Accept"                 │
        ▼                                                   │
   [ Assigned ]                                            │
        │                                                   │
        │  Handler uploads resolution proof                 │
        ▼                                                   │
   [ Resolved ] ◄──── Admin overrules escalation ──────────┘
        │
        │  Citizen marks "unsatisfied" + adds feedback
        ▼
   [ Escalated ] ──► Admin reviews in Escalation Audit tab
        │
        ├── Admin: "Overrule → Mark Resolved"  →  [ Resolved ]
        └── Admin: "Reject Proof / Re-Assign"  →  [ Assigned ]
```

---

## Secret Codes

Privileged roles (Organisation, NGO, Admin) require a **System Secret Code** during sign-up to prevent unauthorized access.

> 🔐 The current secret code is: **`982656`**
>
> Share this only with vetted officials. To change it, update the validation in `src/pages/Signup.jsx` line 25.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        React SPA (Vite)                     │
│                                                             │
│  ┌──────────┐  ┌────────────┐  ┌───────────┐  ┌─────────┐  │
│  │ Citizen  │  │Organisation│  │    NGO    │  │  Admin  │  │
│  │Dashboard │  │ Dashboard  │  │ Dashboard │  │Dashboard│  │
│  └────┬─────┘  └─────┬──────┘  └─────┬─────┘  └────┬────┘  │
│       │              │               │              │        │
│       └──────────────┴───────────────┴──────────────┘        │
│                              │                               │
│                    ┌─────────▼──────────┐                   │
│                    │   Zustand AuthStore │                   │
│                    └─────────┬──────────┘                   │
└──────────────────────────────┼──────────────────────────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
     ┌────────▼────────┐  ┌───▼──────┐  ┌──────▼────────┐
     │ Firebase Auth   │  │Firestore │  │  Cloudinary   │
     │ (OAuth + Email) │  │(real-time│  │ (image storage│
     │                 │  │   DB)    │  │  & delivery)  │
     └─────────────────┘  └──────────┘  └───────────────┘
                               │
                    ┌──────────▼──────────┐
                    │  Nominatim API      │
                    │ (reverse geocoding) │
                    └─────────────────────┘
```

---

## Project Structure

```
snapfix/
├── public/                   # Static assets
├── src/
│   ├── components/
│   │   ├── layout/
│   │   │   └── Navbar.jsx    # Top navigation bar
│   │   └── ui/
│   │       ├── StatCard.jsx  # KPI metric card
│   │       └── Skeleton.jsx  # Loading skeleton components
│   ├── lib/
│   │   └── firebase.js       # Firebase + Google Auth initialization
│   ├── pages/
│   │   ├── Landing.jsx       # Public landing page
│   │   ├── Login.jsx         # Login form
│   │   ├── Signup.jsx        # Signup form with role selector
│   │   ├── Auth.css          # Auth page styles
│   │   ├── CitizenDashboard.jsx
│   │   ├── OrganisationDashboard.jsx
│   │   ├── NGODashboard.jsx
│   │   ├── AdminDashboard.jsx
│   │   ├── ComplaintDetails.jsx  # Thread view for a single complaint
│   │   ├── Feed.jsx          # Public complaints feed
│   │   ├── MapPage.jsx       # Interactive Leaflet heatmap
│   │   ├── Settings.jsx      # Profile completion page
│   │   └── Landing.css
│   ├── store/
│   │   └── authStore.js      # Zustand global auth state
│   ├── App.jsx               # Router + auth guards
│   ├── App.css
│   ├── index.css             # Global design system tokens
│   └── main.jsx              # React app entry point
├── index.html
├── vite.config.js
├── package.json
└── .env                      # ← You create this (see above)
```

---

## FAQ & Troubleshooting

**Q: I get a blank screen or "Loading…" forever after sign-up.**  
A: Make sure your Firebase project has Firestore enabled and your `.env` variables are set correctly. Check the browser console for errors.

**Q: Location detection fails or shows wrong address.**  
A: The browser requires location permission. Click **Allow** when prompted. Make sure you are on HTTPS (or `localhost`) since geolocation is blocked on plain HTTP. Click **Retry** if the initial detection times out.

**Q: Camera doesn't open or shows a black screen.**  
A: The browser requires camera permission. Click **Allow** when prompted. On some browsers you may need to use HTTPS even on localhost — run `vite --https` or use a tool like [ngrok](https://ngrok.com/).

**Q: Image upload fails on complaint submission.**  
A: Check that `VITE_CLOUDINARY_CLOUD_NAME` and `VITE_CLOUDINARY_UPLOAD_PRESET` are set correctly in your `.env`, and that the preset is set to **Unsigned** in Cloudinary.

**Q: I am redirected to Settings every time I log in.**  
A: Your profile is missing the **City** field (and **Age** for Citizens). Fill in your profile in Settings and save — you'll be redirected to your dashboard automatically.

**Q: I registered as Organisation but I see all complaint categories, not just mine.**  
A: Make sure you selected your specialty category during sign-up. If you skipped it, your `orgCategory` defaults to `Roads`. Update your profile data directly in Firestore if needed.

**Q: The secret code doesn't work.**  
A: The current code is `982656`. Contact your platform administrator if this has been changed.

**Q: How do I change the secret code?**  
A: Open `src/pages/Signup.jsx`, find line 25, and update the hardcoded string `'982656'` to your new code.

---

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the Vite development server |
| `npm run build` | Build the production bundle to `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint across the project |

---

## License

This project was built as a hackathon submission. Feel free to fork and build upon it.
