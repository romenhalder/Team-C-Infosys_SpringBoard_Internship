# ℞ PharmaTrack Pro

<div align="center">

![Java](https://img.shields.io/badge/Java-17-ED8B00?style=for-the-badge&logo=openjdk&logoColor=white)
![Spring Boot](https://img.shields.io/badge/Spring_Boot-3.1.6-6DB33F?style=for-the-badge&logo=spring-boot&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![PostgreSQL](https://img.shields.io/badge/Supabase_PostgreSQL-4479A1?style=for-the-badge&logo=postgresql&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Redux](https://img.shields.io/badge/Redux_Toolkit-latest-764ABC?style=for-the-badge&logo=redux&logoColor=white)

**A premium, full-stack pharmaceutical inventory management platform.**  
Track medications, manage stock levels, handle regulated dispensing via a clinical POS, monitor expiry dates, manage suppliers, generate GXP-compliant reports, and get real-time alerts — all from a single sleek dark terminal.

[Features](#-features) • [Tech Stack](#️-tech-stack) • [Setup](#-installation--setup) • [Architecture](#-project-structure) • [API Docs](#-api-endpoints) • [Workflow](#-application-workflow)

</div>

---

## ✨ Features

### 💊 Pharmaceutical POS Terminal
- Terminal-style dark UI for rapid medication dispensing
- Real-time product search with stock, expiry, and schedule indicators
- **Prescription validation** for Schedule H, H1, and X drugs (doctor name & registration required)
- Shopping cart with quantity controls and live subtotal
- Patient name & mobile tracking
- Payment method selection (Cash, UPI, Card, Insurance)
- Animated payment success with confetti effect
- Downloadable **GXP-compliant Tax Invoice PDF** (via jsPDF + autoTable)
- Auto-generated order numbers; raw materials excluded from billing
- Keyboard shortcut `Ctrl+K` to focus the search bar

### 📦 Medication Management
- **Finished Goods** (branded drugs) & **Raw Materials** (APIs/generics)
- 4-step **Compliance Wizard** for full medication entry:
  - Step 1: Basic details (name, brand, category, type)
  - Step 2: Medical details (schedule, therapeutic class, dosage form, strength)
  - Step 3: Pricing, stock, and supplier info
  - Step 4: Review and submit
- Alternatively, a quick **Single-Step Entry** mode for fast additions
- 20+ Indian pharma brands, 80+ dosage forms and classifications
- Schedule categories: H, H1, X, OTC, G
- Therapeutic class tagging (Antibiotic, Antidiabetic, Antihypertensive, etc.)
- Expiry date, HSN code, GST slab, chemical name, storage conditions
- Image upload via multipart (JPG/PNG/GIF)
- Custom stock thresholds (min, max, reorder point)

### 📊 Inventory Tracking
- Real-time stock levels (current, reserved, available)
- Transaction types: **Stock In**, **Stock Out**, **Adjustment**, **Return**, **Wastage**
- Price verification on Stock In (confirm or update cost price per batch)
- Batch number tracking and full audit trail
- Shimmer skeleton loading states for smooth UX

### 🚚 Supplier Management
- Pharmaceutical partner directory with glassmorphism card UI
- Contact details, license/drug license number, FSSAI
- Active/Inactive status toggle with GXP compliance badge
- Search and sort functionality

### 🔔 Smart Alert System
- **Out of Stock**, **Low Stock**, and **Reorder Point** alerts
- **Expiring Soon** and **Expired** product warnings
- Real-time auto-generation during sales and stock adjustments
- Background scheduled scanner ensures no missed alerts
- Unread count badge in Navbar with one-click resolution

### 👥 Role-Based Access Control

| Feature                       | Admin | Manager | Pharmacist |
|-------------------------------|:-----:|:-------:|:----------:|
| Dashboard (Bento Grid)        |  ✅   |   ✅    |    ✅      |
| POS / Dispense Medications    |  ✅   |   ✅    |    ✅      |
| View Medications & Inventory  |  ✅   |   ✅    |    ✅      |
| Add / Edit Medications        |  ✅   |   ✅    |    ❌      |
| Manage Categories             |  ✅   |   ✅    |    ❌      |
| Stock Updates                 |  ✅   |   ✅    |    ✅      |
| Manage Suppliers              |  ✅   |   ✅    |    ❌      |
| View / Download Reports       |  ✅   |   ✅    |    ❌      |
| Transaction History           |  ✅   |   ✅    |    ❌      |
| Manage Alerts                 |  ✅   |   ✅    |    ✅      |
| Manage Employees              |  ✅   |   ❌    |    ❌      |
| Password Reset Approvals      |  ✅   |   ❌    |    ❌      |

### 📈 Analytics & Reports

- **Business Insights**: Sales KPIs — Today, This Week, This Month
- **Stock Health Donut**: CSS-animated ring chart for In Stock / Low / Out of Stock
- **Top Selling Products**: Ranked bar chart with revenue breakdowns
- **Category Breakdown**: Revenue split by category
- **Detailed Reports**: Stock, Sales, and Usage reports with custom date ranges
- **PDF Export**: Professional clinical-branded PDFs (slate/cyan color scheme)
- **CSV Export**: One-click export for all report types

---

## 🛠️ Tech Stack

### Backend
| Technology            | Version | Purpose                            |
|-----------------------|---------|------------------------------------|
| Java                  | 17      | Primary language                   |
| Spring Boot           | 3.1.6   | Application framework              |
| Spring Security       | 6.x     | Authentication & authorization     |
| JWT (JJWT)            | 0.12.x  | Token-based auth                   |
| Supabase PostgreSQL   | 15      | Cloud-hosted relational database   |
| Hibernate / JPA       | 6.x     | ORM                                |
| Maven                 | 3.6+    | Build tool                         |
| Lombok                | latest  | Boilerplate reduction              |
| JavaMail (Gmail SMTP) | latest  | Email notifications & password reset |
| Jakarta Validation    | 3.x     | Input validation                   |

### Frontend
| Technology       | Version | Purpose                        |
|------------------|---------|--------------------------------|
| React            | 19      | UI framework                   |
| Vite             | latest  | Build tool & dev server        |
| Redux Toolkit    | latest  | Global state management        |
| React Router DOM | 7       | Client-side routing            |
| Tailwind CSS     | 4       | Utility-first dark theme       |
| Axios            | latest  | HTTP client                    |
| Heroicons        | 2       | SVG icon library               |
| jsPDF            | latest  | PDF invoice generation         |
| jspdf-autotable  | latest  | Automated table layouts in PDF |

---

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Java Development Kit (JDK) 17+**
- **Node.js 18+** and **npm**
- **Maven 3.6+**
- **Git**
- A **Supabase** project (or any PostgreSQL 14+ database)

---

## 🚀 Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/pharmatrack-pro.git
cd pharmatrack-pro
```

---

### 2. Backend Setup

#### 2a. Configure Database (Supabase)

1. Go to your **Supabase Dashboard → Settings → Database**
2. Copy the **Session Mode** connection string (port `5432`)
3. Open `backend/src/main/resources/application.properties` and update:

```properties
# Database Configuration (Supabase PostgreSQL)
spring.datasource.url=jdbc:postgresql://<host>:<port>/postgres?sslmode=require
spring.datasource.username=postgres.<project-ref>
spring.datasource.password=<your-database-password>
spring.datasource.driver-class-name=org.postgresql.Driver

# Connection Pool (keep low for Supabase free tier)
spring.datasource.hikari.maximum-pool-size=5
spring.datasource.hikari.minimum-idle=2
```

#### 2b. Configure Email (Gmail SMTP)

```properties
spring.mail.host=smtp.gmail.com
spring.mail.port=587
spring.mail.username=your-email@gmail.com
spring.mail.password=your-gmail-app-password   # Use App Password, not main password
```

> 💡 Generate a Google **App Password**: [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)

#### 2c. Run the Backend

```bash
cd backend
mvn clean install
mvn spring-boot:run
```

> ✅ Backend starts on `http://localhost:8080`  
> Spring JPA will auto-create all tables on first run (`ddl-auto=update`)

---

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

> ✅ Frontend starts on `http://localhost:5173`

---

### 4. First-Time Admin Account

After the backend starts, create the first Admin user using the `/setup` endpoint or directly via the `create-first-admin.sql` file included in the root:

```bash
# Using psql or Supabase SQL editor
# Run create-first-admin.sql to insert the admin user with hashed password
```

Or via the API:

```json
POST http://localhost:8080/setup/admin
{
  "fullName": "Admin User",
  "email": "admin@pharma.com",
  "phone": "9999999999",
  "password": "YourSecurePassword@123",
  "role": "ADMIN"
}
```

---

## 📁 Project Structure

```
PharmaTrack Pro/
│
├── backend/                                  # Spring Boot application
│   └── src/main/
│       ├── java/com/romen/inventory/
│       │   ├── controller/                   # REST API layer
│       │   │   ├── AuthController            # Login, register, password reset
│       │   │   ├── MedicationController      # CRUD medications, search, filter
│       │   │   ├── CategoryController        # Category management
│       │   │   ├── InventoryController       # Stock updates & transactions
│       │   │   ├── SalesController           # Dispensing / POS sales
│       │   │   ├── AlertController           # Alert CRUD, mark read/resolve
│       │   │   ├── ReportController          # Analytics, stock, sales, usage
│       │   │   ├── SupplierController        # Pharmaceutical supplier management
│       │   │   └── PasswordResetController   # Token-based password reset
│       │   ├── service/                      # Business logic layer
│       │   ├── repository/                   # Spring Data JPA repositories
│       │   ├── entity/                       # JPA database entities
│       │   │   ├── Medication, Category, Inventory
│       │   │   ├── StockTransaction, Sale, SaleItem
│       │   │   ├── User, Supplier, Alert
│       │   │   └── PasswordResetRequest
│       │   ├── dto/                          # Request/Response data objects
│       │   ├── security/                     # JWT filter, Spring Security config
│       │   ├── config/                       # CORS, web MVC config
│       │   └── exception/                    # Global exception handler
│       │
│       └── resources/
│           └── application.properties        # All runtime configuration
│
├── frontend/                                 # React + Vite application
│   └── src/
│       ├── app/store.js                      # Redux store configuration
│       ├── index.css                         # Dark clinical design system
│       ├── components/
│       │   ├── Navbar.jsx                    # Glassmorphism nav, scroll progress, alerts
│       │   ├── Sidebar.jsx                   # Collapsible dark sidebar, role-gated links
│       │   └── ProtectedRoute.jsx            # Auth guard component
│       ├── features/
│       │   ├── auth/
│       │   │   ├── Login.jsx                 # Mesh-gradient login, inline validation
│       │   │   ├── Register.jsx              # Pharmaceutical registration form
│       │   │   ├── ForgotPassword.jsx        # Email-based reset request
│       │   │   ├── ResetPassword.jsx         # Token-based password reset
│       │   │   ├── EmployeeManagement.jsx    # Admin employee CRUD
│       │   │   └── authSlice.js              # Auth Redux state
│       │   ├── products/
│       │   │   ├── ProductList.jsx           # Medication list, filters, badges
│       │   │   ├── AddProduct.jsx            # Wizard + Quick entry for medications
│       │   │   ├── RawMaterialList.jsx       # Generic drug / API list
│       │   │   └── productSlice.js
│       │   ├── inventory/
│       │   │   ├── InventoryList.jsx         # Stock level dashboard
│       │   │   ├── StockUpdate.jsx           # Stock adjustment form
│       │   │   └── inventorySlice.js
│       │   ├── sales/
│       │   │   ├── SellProduct.jsx           # Dark POS terminal
│       │   │   └── salesSlice.js
│       │   ├── alerts/
│       │   │   ├── AlertList.jsx             # Alert center with semantic badges
│       │   │   └── alertSlice.js
│       │   └── reports/
│       │       ├── Reports.jsx               # Analytics, stock, sales, usage tabs
│       │       └── reportSlice.js
│       ├── pages/
│       │   ├── AdminDashboard.jsx            # Bento grid admin/manager dashboard
│       │   ├── EmployeeDashboard.jsx         # Pharmacist quick-view dashboard
│       │   ├── TransactionHistory.jsx        # Full audit log
│       │   ├── SupplierList.jsx              # Pharmaceutical partner registry
│       │   ├── CategoryList.jsx              # Drug category management
│       │   ├── PasswordResetRequests.jsx     # Admin approval queue
│       │   ├── Setup.jsx                     # Initial system configuration
│       │   └── NotFound.jsx                  # 404 page
│       └── routes/AppRoutes.jsx             # Route definitions & guards
│
├── create-first-admin.sql                    # SQL script to bootstrap admin
├── SETUP_GUIDE.md                            # Quick-start guide
└── README.md                                 # This file
```

---

## 🔗 API Endpoints

**Base URL:** `http://localhost:8080`  
**Auth:** All protected routes require `Authorization: Bearer <JWT_TOKEN>` header.

### 🔐 Authentication

| Method | Endpoint                          | Description                    | Access       |
|--------|-----------------------------------|--------------------------------|--------------|
| POST   | `/auth/login`                     | Login & receive JWT token      | Public       |
| POST   | `/auth/register`                  | Register new employee          | Admin        |
| GET    | `/auth/employees`                 | List all employees             | Admin        |
| PUT    | `/auth/employees/{id}/status`     | Activate/deactivate employee   | Admin        |
| DELETE | `/auth/employees/{id}`            | Delete employee                | Admin        |
| POST   | `/password-reset/forgot`          | Request password reset email   | Public       |
| GET    | `/password-reset/validate-token`  | Validate reset token           | Public       |
| POST   | `/password-reset/reset`           | Submit new password            | Public       |
| GET    | `/password-reset/requests`        | View pending reset requests    | Admin        |
| POST   | `/password-reset/approve/{id}`    | Approve employee reset request | Admin        |
| POST   | `/setup/admin`                    | Create initial admin (one-time)| Public       |

### 💊 Medications (Products)

| Method | Endpoint                                   | Description                           | Access            |
|--------|--------------------------------------------|---------------------------------------|-------------------|
| GET    | `/medications`                             | List all medications                  | Authenticated     |
| GET    | `/medications/{id}`                        | Get medication by ID                  | Authenticated     |
| POST   | `/medications`                             | Create medication (multipart)         | Admin, Manager    |
| POST   | `/medications/{id}`                        | Update medication (multipart)         | Admin, Manager    |
| DELETE | `/medications/{id}`                        | Delete medication                     | Admin             |
| GET    | `/medications/search?keyword=`            | Fuzzy search                          | Authenticated     |
| GET    | `/medications/filter`                      | Advanced filter (schedule, class, type)| Authenticated    |
| GET    | `/medications/category/{categoryId}`       | Filter by category                    | Authenticated     |
| GET    | `/categories`                              | List all categories                   | Authenticated     |
| POST   | `/categories`                              | Create category                       | Admin, Manager    |
| PUT    | `/categories/{id}`                         | Update category                       | Admin, Manager    |
| DELETE | `/categories/{id}`                         | Delete category                       | Admin             |

### 📦 Inventory

| Method | Endpoint                             | Description                     | Access          |
|--------|--------------------------------------|---------------------------------|-----------------|
| GET    | `/inventory`                         | All inventory records           | Admin, Manager  |
| GET    | `/inventory/product/{id}`            | Inventory for a medication      | Admin, Manager  |
| GET    | `/inventory/low-stock`               | Items below threshold           | Admin, Manager  |
| GET    | `/inventory/out-of-stock`            | Zero-stock items                | Admin, Manager  |
| POST   | `/inventory/update`                  | Perform stock transaction       | Authenticated   |
| GET    | `/inventory/transactions`            | All stock transactions          | Admin, Manager  |

### 🏷️ Sales (POS / Dispensing)

| Method | Endpoint                      | Description                    | Access        |
|--------|-------------------------------|--------------------------------|---------------|
| POST   | `/sales`                      | Create a sale / dispense       | Authenticated |
| GET    | `/sales/recent?limit=`        | Recent dispensing records      | Authenticated |
| GET    | `/sales/order/{orderNumber}`  | Lookup by order number         | Authenticated |
| GET    | `/sales/summary/today`        | Today's sales summary          | Authenticated |
| GET    | `/sales/user/summary`         | Current user's sales summary   | Authenticated |

### 🚨 Alerts

| Method | Endpoint                  | Description           | Access          |
|--------|---------------------------|-----------------------|-----------------|
| GET    | `/alerts`                 | All alerts            | Authenticated   |
| GET    | `/alerts/unread`          | Unread alerts         | Authenticated   |
| PATCH  | `/alerts/{id}/read`       | Mark one as read      | Authenticated   |
| PATCH  | `/alerts/read-all`        | Mark all as read      | Authenticated   |
| PATCH  | `/alerts/{id}/resolve`    | Mark as resolved      | Admin, Manager  |
| DELETE | `/alerts/{id}`            | Delete alert          | Admin, Manager  |

### 🚚 Suppliers

| Method | Endpoint               | Description             | Access         |
|--------|------------------------|-------------------------|----------------|
| GET    | `/suppliers`           | All suppliers           | Admin, Manager |
| POST   | `/suppliers`           | Register supplier       | Admin, Manager |
| PUT    | `/suppliers/{id}`      | Update supplier         | Admin, Manager |
| DELETE | `/suppliers/{id}`      | Delete supplier         | Admin          |

### 📊 Reports & Analytics

| Method | Endpoint                                            | Description                    | Access         |
|--------|-----------------------------------------------------|--------------------------------|----------------|
| GET    | `/reports/analytics`                                | Live business analytics        | Admin, Manager |
| GET    | `/reports/stock?startDate=&endDate=`                | Stock report for date range    | Admin, Manager |
| GET    | `/reports/sales?startDate=&endDate=`                | Sales report for date range    | Admin, Manager |
| GET    | `/reports/usage?startDate=&endDate=`                | Usage/transaction report       | Admin, Manager |

---

## 🔄 Application Workflow

### 1. Authentication Flow

```
User visits /login
    ↓
Enters credentials → POST /auth/login
    ↓
JWT token received → stored in localStorage
    ↓
Role determined (ADMIN / MANAGER / EMPLOYEE)
    ↓
Redirected to respective Dashboard
```

### 2. Medication Dispensing (POS) Flow

```
Pharmacist opens POS Terminal (/sell)
    ↓
Searches medication → real-time search API call
    ↓
Selects product → checks Schedule category
    ↓
Schedule H / H1 / X? → Prescription form shown (Doctor name + Reg. No.)
    ↓
Confirms patient name, quantity, payment method
    ↓
POST /sales → stock auto-decremented
    ↓
Alerts auto-generated if stock falls below threshold
    ↓
Success animation + confetti + PDF Invoice download
```

### 3. Stock Management Flow

```
Manager navigates to Inventory / Stock Update
    ↓
Selects product + transaction type (STOCK_IN / WASTAGE / ADJUSTMENT)
    ↓
Enters quantity, batch no., reason
    ↓
POST /inventory/update → stock level updated
    ↓
Transaction logged in audit trail
    ↓
Alerts auto-resolved or newly generated based on new stock level
```

### 4. Password Reset Flow

**For Admins:**
```
Admin requests reset → POST /password-reset/forgot
    ↓
Gmail SMTP sends tokenized reset link to email
    ↓
Admin clicks link → GET /password-reset/validate-token
    ↓
Submits new password → POST /password-reset/reset
```

**For Employees/Managers:**
```
Employee requests reset → POST /password-reset/forgot
    ↓
Admin sees pending request in Dashboard & /admin/password-reset-requests
    ↓
Admin approves → Employee receives email with reset link
    ↓
Employee resets via token link
```

---

## ⚙️ Configuration Reference

### `application.properties` (Backend)

```properties
# ── Server ──────────────────────────────────────────────────────────────────
server.port=8080
spring.application.name=pharmatrack-pro

# ── Database (Supabase PostgreSQL) ──────────────────────────────────────────
spring.datasource.url=jdbc:postgresql://<host>:5432/postgres?sslmode=require
spring.datasource.username=postgres.<project-ref>
spring.datasource.password=<database-password>
spring.datasource.driver-class-name=org.postgresql.Driver
spring.datasource.hikari.maximum-pool-size=5
spring.datasource.hikari.minimum-idle=2
spring.datasource.hikari.idle-timeout=300000
spring.datasource.hikari.connection-timeout=60000

# ── JPA / Hibernate ──────────────────────────────────────────────────────────
spring.jpa.hibernate.ddl-auto=update          # auto-creates tables on startup
spring.jpa.database-platform=org.hibernate.dialect.PostgreSQLDialect
spring.jpa.show-sql=true

# ── JWT ──────────────────────────────────────────────────────────────────────
jwt.secret=<your-256-bit-hex-secret>
jwt.expiration=86400000          # 24 hours (ms)
jwt.refresh-expiration=604800000 # 7 days (ms)

# ── File Upload ──────────────────────────────────────────────────────────────
spring.servlet.multipart.max-file-size=5MB
spring.servlet.multipart.max-request-size=10MB
app.upload-dir=./uploads/

# ── Gmail SMTP ───────────────────────────────────────────────────────────────
spring.mail.host=smtp.gmail.com
spring.mail.port=587
spring.mail.username=your-email@gmail.com
spring.mail.password=your-app-password     # Use Google App Password

# ── Admin Email (receives password reset notifications) ──────────────────────
admin.email=admin@pharma.com
```

### `.env` (Frontend — create as needed)

The frontend currently uses `http://localhost:8080` hardcoded in slice files. To externalize:

```bash
# frontend/.env
VITE_API_URL=http://localhost:8080
```

Then update slice files to use `import.meta.env.VITE_API_URL`.

---

## 🏗️ Design System

PharmaTrack Pro uses a **custom dark clinical design system** defined in `index.css`:

| Token / Class         | Purpose                                              |
|-----------------------|------------------------------------------------------|
| `bg-mesh-dark`        | Full-screen animated mesh gradient background        |
| `card-glass`          | Glassmorphism card (backdrop-blur + border/15 alpha) |
| `btn-primary`         | Cyan gradient action button with glow shadow         |
| `input-field`         | Dark-themed form input with focus ring               |
| `badge`               | Base badge class                                     |
| `badge-schedule-H`    | Red badge for Schedule H drugs                       |
| `badge-schedule-H1`   | Amber badge for Schedule H1 drugs                    |
| `badge-schedule-X`    | Rose badge for Schedule X (narcotic) drugs           |
| `badge-schedule-OTC`  | Emerald badge for OTC medications                    |
| `animate-fade-slide-up`| Entrance animation (opacity 0→1, translateY 20→0)  |
| `text-gradient-cyan`  | Cyan-to-teal gradient text                           |
| `shadow-glow-cyan`    | Cyan glow box shadow for emphasis                    |

---

## 🧪 Running & Building

### Development
```bash
# Terminal 1 — Backend
cd backend && mvn spring-boot:run

# Terminal 2 — Frontend
cd frontend && npm run dev
```

### Production Build
```bash
# Backend JAR
cd backend
mvn clean package -DskipTests
java -jar target/pharmatrack-pro-*.jar

# Frontend Static Bundle
cd frontend
npm run build
# Serve the /dist folder with nginx, Vercel, or any static host
```

---

## 🤝 Team & Contributing

**Infosys Group Project** — developed as a full-stack capstone application.

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit changes: `git commit -m 'feat: add your feature'`
4. Push: `git push origin feature/your-feature`
5. Open a Pull Request against `main`

**Commit conventions:** Use [Conventional Commits](https://www.conventionalcommits.org/) — `feat:`, `fix:`, `style:`, `docs:`, `refactor:`, `chore:`

---

## 📄 License

This project is licensed under the **MIT License**.

---

<div align="center">

**Built with ☕ Java, ⚛️ React, and 💊 pharmaceutical precision**

*PharmaTrack Pro — GXP Compliant | Secure | Premium*

</div>
