# Corporate Travel Management System

Role-based corporate travel request, multi-stage approval, itinerary tracking, expense reimbursement, and spend reporting system.

## Tech Stack

- **Backend**: Java 21+, Spring Boot 4.1.2, Spring Data JPA, Jakarta Bean Validation, PostgreSQL (with automatic embedded H2 fallback for local/offline runs)
- **Frontend**: Angular 22, TypeScript 6, Bootstrap 5, Bootstrap Icons, Vitest

## Repository Structure

- `travel-management-backend/travel-management-backend/` — Spring Boot REST API (`com.corporate.travel`)
- `travel-management-frontend/` — Angular standalone SPA
- `.env.example` — Template for backend runtime and database environment variables

## Environment Configuration

1. Copy `.env.example` to `.env` in the repository root:
   - Windows PowerShell: `Copy-Item .env.example .env`
   - macOS/Linux: `cp .env.example .env`
2. Update `.env` values for your database:
   - `SERVER_PORT` — Backend HTTP port (default `8080`)
   - `DB_URL` — PostgreSQL JDBC URL (e.g. `jdbc:postgresql://localhost:5432/travel_management_db`)
   - `DB_USERNAME` — PostgreSQL username
   - `DB_PASSWORD` — PostgreSQL password
   - `DB_DDL_AUTO` — Hibernate schema mode (`validate` for production, `update` for local development)
   - `DB_SHOW_SQL` — Set `false` unless debugging SQL queries
   - `H2_CONSOLE_ENABLED` — Set `false` in shared/production environments
   - `CORS_ALLOWED_ORIGINS` — Comma-separated frontend origins allowed by CORS (default `http://localhost:4200`)
   - `APP_SEED_DEMO_DATA` — Set `true` only when initializing an empty local database with sample users/policies
   - `APP_DEFAULT_USER_PASSWORD` — Password assigned to seeded accounts when `APP_SEED_DEMO_DATA=true`

## Running Locally

### 1. Backend

```powershell
cd travel-management-backend\travel-management-backend
.\mvnw.cmd test
.\mvnw.cmd spring-boot:run
```

If PostgreSQL at `DB_URL` is unreachable, `DatabaseConfig` logs a warning and falls back to an embedded in-memory H2 database so the API remains runnable.

### 2. Frontend

```powershell
cd travel-management-frontend
npm install
npx ng test --watch=false
npm start
```

Open `http://localhost:4200`. Update `travel-management-frontend/src/environments/environment.ts` if the backend runs on a non-default host or port.

## Core Workflows

- **Travel Requests & Policy Checks**: Employees submit requests or save drafts with start/end date validation, optional Priority flag, and automated budget limit checks per travel class (`ECONOMY`, `PREMIUM_ECONOMY`, `BUSINESS`).
- **Two-Stage Approval Pipeline**: Assigned Manager reviews `PENDING_MANAGER` requests (`PENDING_FINANCE` or `REJECTED`), then Assigned Finance reviews `PENDING_FINANCE` requests (`APPROVED` or `REJECTED`). Approvals are blocked once a trip's starting date is reached or crossed.
- **Itinerary & Expense Reimbursement**: Travelers add itinerary segments after Manager approval and upload PDF expense claims after Finance approval; Finance approves and marks claims reimbursed.
- **Directory, Analytics & Notifications**: Persistent notifications track submissions, approvals, and rejections across stakeholders. Finance and Admin users access directory/bank account details and spend summaries.
