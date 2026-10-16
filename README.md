# NIMS — Nexcheck Inventory Management System

**NIMS** is a web-based IT asset management platform developed for the **RCMP (Royal College of Medicine Perak)** department at **Universiti Kuala Lumpur (UniKL)**, operated by the **Jabatan Teknologi Maklumat** (IT Department).

The system manages the complete lifecycle of IT assets — from procurement registration, deployment, staff handovers, user borrowing requests, preventive maintenance, and structured disposal — with role-based access for technicians, administrators, staff borrowers, and disposal unit personnel.

> **Production URL:** https://nims.rcmp.edu.my

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [User Roles](#user-roles)
- [Features](#features)
  - [Technician Portal](#technician-portal)
  - [Admin Portal](#admin-portal)
  - [User (Staff Borrower) Portal](#user-staff-borrower-portal)
  - [Disposal Unit Portal](#disposal-unit-portal)
  - [Notification & Email System](#notification--email-system)
- [Asset Types & Statuses](#asset-types--statuses)
- [Database Schema](#database-schema)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Available Scripts](#available-scripts)

---

## Overview

NIMS serves as a single source of truth for the IT department's entire asset inventory. Rather than managing spreadsheets or disconnected records, NIMS provides:

- A **live inventory** of all IT assets with real-time status tracking across their entire lifecycle
- A **structured handover workflow** for deploying laptops to staff, complete with formal PDF documentation
- A **borrow/request system** for staff to request AV and network equipment for programs and events
- A **preventive maintenance module** for technicians to log and track the condition of assets during scheduled inspections
- A **disposal workflow** aligned with formal government/institutional disposal procedures, including batch records and photographic evidence
- **Automated email notifications** at every key lifecycle stage, including daily overdue return reminders
- **Microsoft Entra ID (Azure AD) SSO** for secure, organisation-wide single sign-on — no separate passwords required

---

## Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| TanStack Start (React 19) | SSR meta-framework with file-based routing |
| TanStack Router | File-based client/server routing |
| TanStack Query v5 | Server state management and data fetching |
| Tailwind CSS v4 | Utility-first styling |
| Radix UI / shadcn-style components | Accessible, headless UI primitives |
| React Hook Form + Zod | Form handling and schema validation |
| Recharts | Dashboard analytics charts |
| @pdfme/generator | PDF generation for handover and return forms |
| ExcelJS | Excel/CSV export of inventory data |
| @zxing/browser | In-browser QR/barcode scanner for asset lookup |
| date-fns + react-day-picker | Date utilities and date pickers |
| Sonner | Toast notifications |
| Lottie React | UI animations |
| Lucide React | Icon library |

### Backend
| Technology | Purpose |
|---|---|
| Nitro (Node.js) | Server runtime with `node-server` preset |
| Vite 7 | Build tooling |
| TypeScript 5.8 | Full-stack type safety (ESM modules) |
| MySQL 2 | Database driver for MySQL (`nimsV2` schema) |
| Nodemailer | SMTP email delivery (Microsoft 365 / Outlook) |
| Microsoft Entra ID (Azure AD) | OAuth 2.0 / SSO authentication |
| Microsoft Graph API | Fetching user profile data |
| Encrypted HttpOnly cookies | Session management |

---

## User Roles

NIMS has four distinct portals, each with a tailored interface for a specific role:

| Role | Portal Path | Description |
|---|---|---|
| **Technician** | `/technician/*` | Front-line IT staff; manages daily asset operations, deployments, handovers, maintenance, and requests |
| **Admin** | `/admin/*` | IT management; views system-wide analytics, manages users, approves requests, and configures settings |
| **User** (Staff Borrower) | `/user/*` | RCMP/UniKL staff who borrow AV/network equipment for programs and events |
| **Disposal Unit** | `/disposal-unit/*` | Specialist unit responsible for processing and documenting formal asset disposal |

---

## Features

### Technician Portal

The technician portal is the operational core of NIMS, providing tools to manage the day-to-day movement and condition of all IT assets.

**Dashboard**
- Live inventory counts by asset type (laptop, AV, network) broken down by status (store, deployed, etc.)
- Request timetable showing upcoming and active borrow requests
- Disposal statistics for the current year
- Integration with Malaysia public holidays calendar

**Asset Management**
- Register new assets (laptop/desktop, AV equipment, network equipment) with full specification details including purchase order (PO), delivery order (DO), invoice numbers and dates, cost, and warranty information
- View and search the full asset inventory per asset type
- Drill down into individual asset detail pages
- Bulk import assets via Excel/CSV upload

**Deployment & Return**
- Deploy AV or network equipment to a specific building, level, and zone
- Record returns from deployment, noting the condition and date
- Full history of all deployments and returns per asset

**Staff Handover**
- Formally hand over laptops to RCMP/UniKL staff members
- Search the staff directory (by name or department) to find the recipient
- Automatically generate a formal **Handover PDF** with asset details, recipient information, location, and handler signature fields
- Send an automated email notification to the recipient upon handover
- Record and document the return of a handed-over laptop, generating a **Return PDF**

**Borrow Requests**
- View all borrow requests submitted by staff users
- Assign specific assets from inventory to fulfill a request
- Track the status of each request through its lifecycle: assigned → checked out → returned
- View a detailed log of all historical requests

**Preventive Maintenance (PM)**
- Log maintenance visits for specific rooms or zones (building/level/zone)
- Record the condition of each asset inspected during the visit (good / faulty)
- Track faulty assets for follow-up and mark them as resolved
- View an archive of historical maintenance records

**Disposal**
- Move assets into a **pre-disposal queue** with photographic evidence
- Process queued assets through formal disposal, generating batch disposal records (batch number format: `DP-YY-NN`)
- View fully disposed assets and their history

**Reporting & History**
- Full asset activity log for audit trail
- Asset reports for management or compliance purposes

---

### Admin Portal

The admin portal provides system-wide visibility and control for IT management.

- **Dashboard** — high-level analytics including laptop inventory insights, request trends, and system-wide asset summaries with Recharts visualisations
- **Asset Inventory Views** — searchable and filterable tables for all laptop, AV, and network assets with full admin actions
- **User Management** — view and manage system user accounts, assign roles
- **Request Management** — view and approve or reject borrow requests submitted by staff
- **Data Export** — export inventory data as CSV or Excel files for reporting
- **Disposed Assets** — historical view of all disposed assets
- **System Settings** — toggle login maintenance mode (restricts access during maintenance windows), manage Microsoft Entra ID profile integration

---

### User (Staff Borrower) Portal

The user portal is designed for RCMP/UniKL staff who need to borrow IT equipment for events and programs.

- **Submit a Request** — specify the asset type, category, quantity required, borrow date, return date, program type, usage location, and accept terms and conditions
- **Request History** — view all past and active requests with their current status
- **Edit Profile** — update contact information (phone number); profile data (name, email, department) is pulled directly from Microsoft Entra ID / Microsoft Graph

---

### Disposal Unit Portal

The disposal unit portal is tailored for the specialist team responsible for formal asset disposal procedures.

- **Dashboard** — overview of the disposal queue and pending items
- **Disposal Processing** — view and work through assets in the disposal queue
- **Disposal Form** — fill in all required formal disposal form fields, including:
  - No. Rujukan Pelupusan (Disposal Reference Number)
  - Latar Belakang (Background / Justification)
  - Rekod Fizikal (Physical Records)
  - Supporting photographs
- **Disposal History** — complete historical log of all processed disposals

---

### Notification & Email System

NIMS sends automated emails at every key point in an asset's lifecycle to keep all parties informed:

| Trigger | Recipients |
|---|---|
| Asset handed over to staff | Staff recipient |
| Handed-over asset returned | Staff recipient |
| Borrow request submitted | Confirmation to requester |
| Assets assigned and ready for pickup | Requester |
| Borrow request rejected | Requester (with rejection reason) |
| Request asset checked out | Requester |
| Borrowed assets returned | Requester |
| Overdue return (daily reminder) | Requester with overdue items |

**Overdue Return Reminders:** A scheduled job runs daily at 09:00 (Asia/Kuala_Lumpur) to send reminder emails to requesters who have not returned assets past their due date. Long-overdue requests are also eligible for automatic rejection, logged in the system for audit purposes.

---

## Asset Types & Statuses

### Asset Types

| Type | Key Fields |
|---|---|
| **Laptop / Desktop** | Processor, RAM, OS, storage, GPU, serial number, asset tag |
| **AV Equipment** | Model, brand, serial number, asset tag (speakers, microphones, projectors, screens, etc.) |
| **Network Equipment** | MAC address, IP address, model, brand (switches, routers, access points, etc.) |

All asset types share common procurement fields: PO number/date, DO number/date, Invoice number/date/cost, purchase price, and warranty information.

### Asset Statuses

| Status | Description |
|---|---|
| `new` | Newly registered asset, held in store |
| `return` | Returned from a deployment or handover |
| `deploy` | Currently deployed to a building/zone location |
| `pre-disposed` | Queued in the pre-disposal list, awaiting formal disposal |
| `disposed` | Fully and formally disposed |
| `assign (request)` | Assigned by a technician to fulfill a borrow request |
| `booked (request)` | Booked against a pending borrow request |
| `checkout` | Physically checked out to the requester |
| `deploy (facility)` | Deployed to a permanent facility location |

---

## Database Schema

The system uses a MySQL database named `nimsV2`. Key tables:

| Table | Purpose |
|---|---|
| `users` | System users (Azure AD OID, email, role, phone) |
| `role` | Role definitions (technician, admin, user) |
| `staff` | RCMP/UniKL staff directory for handover recipients |
| `status` | Asset status lookup values |
| `laptop` | Laptop/desktop asset records with hardware specs |
| `av` | Audio-visual equipment records |
| `network` | Network equipment records with MAC/IP |
| `it_deploy` | Deployment records (AV/network → location) |
| `it_return` | Return records from IT deployments |
| `handover` | Laptop handover records (to staff) |
| `handover_staff` | Per-recipient rows on a handover |
| `handover_return` | Return records for handed-over laptops |
| `warranty` | Warranty periods per asset |
| `request` | Staff borrow request records |
| `request_item` | Line items per request (asset type + quantity) |
| `request_assignment` | Specific assets assigned to a request item |
| `request_overdue_email_log` | Tracks daily overdue reminder emails sent |
| `request_overdue_auto_reject_log` | Log of auto-rejected overdue requests |
| `pre_disposal` | Pre-disposal queue with unique queue keys |
| `disposal` | Formal disposal batch records with photos |
| `pm_log` | Preventive maintenance visit logs |
| `pm_log_asset` | Per-asset condition during a maintenance visit |
| `pm_log_archive` | Read-only archive of legacy maintenance records |
| `system_settings` | Key-value system configuration (e.g., maintenance mode) |

---

## Project Structure

```
nims-web/
├── src/
│   ├── routes/               # TanStack Router file-based routes
│   │   ├── __root.tsx        # Root HTML layout
│   │   ├── index.tsx         # Public landing page
│   │   ├── login.tsx         # Login page
│   │   ├── admin/            # Admin portal pages
│   │   ├── technician/       # Technician portal pages
│   │   ├── user/             # Staff borrower portal pages
│   │   ├── disposal-unit/    # Disposal unit portal pages
│   │   └── api/              # API routes (auth, session, cron)
│   ├── admin/                # Admin page components
│   ├── technician/           # Technician page components
│   ├── user/                 # User page components
│   ├── disposal-unit/        # Disposal unit components
│   ├── components/           # Shared UI components
│   ├── hooks/                # Custom React hooks
│   ├── lib/                  # Client-side utilities
│   └── assets/               # Static assets (logos, images)
├── backend/
│   ├── server/
│   │   ├── admin/            # Admin server functions
│   │   ├── assets/           # Asset CRUD server functions
│   │   ├── auth/             # Microsoft OAuth and session logic
│   │   ├── core/             # DB connection, env config, auth middleware
│   │   ├── email/            # Email sending functions
│   │   ├── jobs/             # Scheduled jobs (overdue emails, auto-reject)
│   │   ├── operations/       # Dashboard, PM, staff, settings, holidays
│   │   ├── pdf/              # PDF generation (handover/return forms)
│   │   └── requests/         # Borrow request lifecycle logic
│   ├── lib/                  # Backend shared utilities
│   ├── plugins/              # Nitro plugins (scheduler)
│   └── scripts/              # CLI scripts (migrations, manual job runs)
├── shared/
│   └── lib/                  # Shared TypeScript types and Zod schemas
├── database/
│   ├── schema.sql            # Full DB schema with idempotent migrations
│   └── migration/            # Individual migration SQL files
├── upload/                   # Uploaded files (disposal photos)
├── public/                   # Static public files
├── vite.config.ts
├── tsconfig.json
└── .env.example              # Environment variable template
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- MySQL 8.0+
- A Microsoft Entra ID (Azure AD) tenant with an app registration configured for OAuth 2.0

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd nims-web
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy the environment template and fill in your values:
   ```bash
   cp .env.example .env
   ```

4. Create the database and apply the schema:
   ```bash
   mysql -u root -p -e "CREATE DATABASE nimsV2;"
   npm run db:migrate
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```
   The app will be available at `http://localhost:8080`.

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `MYSQL_HOST` | Yes | MySQL host (default: `127.0.0.1`) |
| `MYSQL_PORT` | Yes | MySQL port (default: `3306`) |
| `MYSQL_USER` | Yes | MySQL username |
| `MYSQL_PASSWORD` | Yes | MySQL password |
| `MYSQL_DATABASE` | Yes | MySQL database name (e.g., `nimsV2`) |
| `DATABASE_URL` | Alt | Full MySQL connection URL (alternative to individual vars) |
| `AZURE_TENANT_ID` | Yes | Microsoft Entra ID tenant ID |
| `AZURE_CLIENT_ID` | Yes | Azure app registration client ID |
| `AZURE_CLIENT_SECRET` | Yes | Azure app registration client secret |
| `AZURE_REDIRECT_URI` | Yes | OAuth callback URL (`https://yourdomain/api/auth/microsoft/callback`) |
| `AZURE_ALLOWED_EMAIL_DOMAINS` | Yes | Comma-separated list of permitted email domains for login |
| `SESSION_SECRET` | Yes | Secret key for session cookie signing/encryption (min 32 chars) |
| `SESSION_IDLE_TIMEOUT_MINUTES` | No | Session idle timeout in minutes (default: `15`) |
| `SESSION_ABSOLUTE_TIMEOUT_HOURS` | No | Session absolute maximum in hours (default: `8`) |
| `SMTP_HOST` | Yes | SMTP server hostname |
| `SMTP_PORT` | Yes | SMTP server port |
| `SMTP_USER` | Yes | SMTP username / email address |
| `SMTP_PASSWORD` | Yes | SMTP password |
| `SMTP_FROM` | Yes | Sender email address |
| `SMTP_FROM_NAME` | Yes | Sender display name |
| `OVERDUE_EMAIL_SCHEDULER` | No | Set to `true` to enable the in-process daily overdue email scheduler |
| `CRON_SECRET` | No | Bearer token for the external cron endpoint (`POST /api/cron/overdue-return-emails`) |
| `ENABLE_DEV_LOGIN` | No | Set to `true` to enable developer "Login as..." shortcuts (non-production only) |

---

## Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start the Vite development server on port 8080 |
| `npm run build` | Build for production (allocates 8GB Node heap) |
| `npm start` | Start the built production server |
| `npm run db:migrate` | Apply pending SQL migrations from `database/migration/` |
| `npm run overdue-emails` | Manually trigger the overdue return reminder email job |
| `npm run lint` | Run ESLint |

---

## Security

- **Authentication** is exclusively through Microsoft Entra ID SSO — no local passwords are stored
- **Sessions** use encrypted, signed HttpOnly cookies with configurable idle and absolute timeouts
- **Security headers** are applied globally: `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, and `Strict-Transport-Security`
- **Camera access** is explicitly allowed only for the self-origin (used by the in-browser barcode scanner for asset lookup)
- **Email domain allowlisting** restricts login to authorised organisational email domains

---

## License

This project is proprietary software developed for internal use by the Jabatan Teknologi Maklumat, RCMP, Universiti Kuala Lumpur. All rights reserved.
