# Corporate Travel Management System (TMS)

Enterprise Corporate Travel Management Desk application built with **Spring Boot** (Java 21/25) and **Angular** (v22).

---

## 🚀 Quick Start (Actionable Steps)

### 1. Start the Backend
Navigate to the backend project directory:
```powershell
cd "travel-management-backend\travel-management-backend"
```

**Running with Zero-Configuration Database (Self-Healing Dual-Mode)**
```powershell
mvn spring-boot:run
```
> **Self-Healing Connectivity**: The system automatically tests connectivity to your local PostgreSQL database (`jdbc:postgresql://localhost:5432/travel_management_db`).
> - If PostgreSQL is running and available, it connects directly to PostgreSQL.
> - If PostgreSQL is not currently running or the database is not yet created, it automatically and gracefully switches to embedded in-memory H2 with full schema generation and comprehensive seed data (Departments, Users, Travel Policies, Sample Trips with Itinerary Segments & Expenses).
> 
> You can also force explicit H2 mode at any time:
> ```powershell
> mvn spring-boot:run "-Dspring-boot.run.profiles=h2"
> ```

---

### 2. Start the Frontend
In a new terminal, navigate to the frontend directory:
```powershell
cd travel-management-frontend
npm start
```
Open your browser at: **`http://localhost:4200/`**

To run the unit test suite (120 tests across 12 suites):
```powershell
npm test
```

To create a clean production build:
```powershell
npm run build
```

---

## 🧭 Core Workflow & Feature Matrix

### 1. Travel Request Creation (Draft & Submit)
- **Inputs**: Destination, Travel Dates (Start/End validation), Purpose of Work, Estimated Budget, Travel Class (Economy, Premium Economy, Business, First Class).
- **Draft Capability**: Save incomplete requests as Drafts and edit or load them into the form at any time.
- **Role Isolation**: Employees only view their own requests; Managers and Finance officers have dedicated views.

### 2. Multi-Level Approval State Machine
- **Hierarchy Auto-Routing**:
  - Employee submits request $\rightarrow$ Status: `PENDING_MANAGER`
  - Assigned Manager approves $\rightarrow$ Status: `PENDING_FINANCE`
  - Assigned Finance Officer approves $\rightarrow$ Status: `APPROVED`
  - Rejection at any stage records mandatory reviewer feedback and moves status to `REJECTED`.
- **Complete Audit Trail**: Every status transition records timestamp, reviewer name, role, previous status, and comments.

### 3. Policy Enforcement
- Automatically validates requests against department policies:
  - Engineering limit: **$2,000.00** | Allowed Class: **Economy**
  - Sales limit: **$5,000.00** | Allowed Class: **Business**
- Violations are visibly flagged on cards and reports with specific reasons.

### 4. Itinerary Management Connected to Purpose of Work
- **Manual Segment Entry**: Flights, Hotels/Stays, Trains, Cabs, Buses with departure/arrival datetimes and locations.
- **Purpose of Work Connection**: Each itinerary segment links directly to the business objective/work goal (e.g. client workshops, technical sessions, deployment).
- **Timeline & Schedule Visualization**: Comprehensive itinerary listing showing schedule, transport provider, and purpose of work.

### 5. Expense Management & Simulated Storage Proof
- **Expense Entries**: Category (Food, Stay, Transport, Other), Amount ($), and Purpose of Work / Payment Reason.
- **PDF Upload Proof**: Upload bill receipts, tax invoices, and transaction slips (simulated storage with in-app preview).
- **Reimbursement Workflow**:
  - Only approved trips can file claims.
  - Traveler submits claims for payout.
  - Assigned Finance Officer audits proof and executes `APPROVE` or `REIMBURSE`.

### 6. Analytics & Real-Time Reporting
- **Company Spend**: Total estimated budget vs. total actual reimbursed spend.
- **Department-Wise Spend**: Aggregated breakdown across Engineering, Sales, and Finance.
- **Employee Travel History**: Track complete trip journeys and cumulative expenditure.
