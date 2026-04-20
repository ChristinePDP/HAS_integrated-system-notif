# 🏥 Notification System Microservice

A production-ready microservice responsible for sending alerts and updates to users in the Hospital Management System. This system handles email notifications, prevents duplicates, enforces JWT authentication, implements Role-Based Access Control (RBAC), logs all activities, and integrates seamlessly with other microservices.

> **Project Type:** Hospital Management System - Microservice (Group 9)  
> **Version:** 1.0.0  
> **Last Updated:** April 16, 2026  
> **Status:** ✅ Production-Ready for External Integration

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Microservices Architecture](#-microservices-architecture)
- [Integration Breakdown](#-integration-breakdown)
- [API Documentation](#-api-documentation)
- [Role-Based Access Control (RBAC)](#-role-based-access-control-rbac)
- [Functional Requirements](#-functional-requirements)
- [Project Structure](#-project-structure)
- [Installation & Setup](#-installation--setup)
- [File-by-File Implementation](#-file-by-file-implementation)
- [Testing & Examples](#-testing--examples)
- [Troubleshooting](#-troubleshooting)

---

## 🎯 Overview

The Notification System is an independent, production-ready microservice that:
- ✅ Accepts notification requests from other microservices via **POST /api/notify**
- ✅ Sends email notifications via SMTP (Nodemailer)
- ✅ Maintains comprehensive audit logs in MongoDB
- ✅ Prevents duplicate notifications within 5-minute windows
- ✅ Enforces JWT-based authorization with **dual-mode validation** (local JWT + external Auth Group API)
- ✅ Implements **strict Role-Based Access Control (RBAC)** for GET requests
- ✅ Prevents unauthorized access to sensitive patient emails
- ✅ Handles failures gracefully with standardized error responses

---

## 🏗️ Microservices Architecture

The Hospital Management System consists of **11 independent microservices**:

| Group | Service | Role |
|-------|---------|------|
| **Group 1** | Online Appointment System | Triggers appointments and confirmations |
| **Group 2** | Adapter Layer | Legacy system integration |
| **Group 3** | Authentication System | Issues JWT tokens & verifies users |
| **Group 4** | Analytics Dashboard System | Data visualization & reporting |
| **Group 5** | Patient Portal | Patient-facing UI |
| **Group 6** | Doctor Portal | Doctor-facing UI |
| **Group 7** | Queue Management System | Manages patient queues |
| **Group 8** | Laboratory Information System | Lab test management |
| **Group 9** | **Notification System (Us)** | 📧 Sends emails & logs notifications |
| **Group 10** | Pharmacy Management System | Medicine & prescription management |
| **Group 11** | Medical Record Management | EHR storage & retrieval |

---

## 📡 Integration Breakdown

### **GROUP 9 - Notification System Integration Roles**

The Notification System serves two distinct roles in the architecture:

#### **1️⃣ THE TRIGGERERS (POST /api/notify)**
Systems that call our API to send emails to users.

| Caller System | Use Case | Example | Frequency |
|---------------|----------|---------|-----------|
| **Group 1** - Appointment System | Appointment confirmations, reminders | "Your appointment is confirmed for 2:30 PM on April 20" | Per appointment |
| **Group 7** - Queue Management | Queue position updates, turn notifications | "You are 3rd in queue. Expected wait: 45 minutes" | Per queue update |
| **Group 8** - Lab System | Lab results availability | "Your blood test results are ready" | Per test completion |
| **Group 10** - Pharmacy System | Medicine pickup reminders | "Your prescription is ready at counter 2" | Per order ready |
| **Group 11** - Medical Records | Record updates, access notifications | "Your medical record has been updated" | Per update |

**⚙️ For Triggerer Groups:**
- **No code changes needed** - We provide you with our live endpoint
- **Endpoint:** `POST /api/notify`
- **You provide:** JWT token (from Group 3) + JSON body with your notification data
- **We handle:** Email sending, logging, duplicate prevention, error handling

#### **2️⃣ THE READERS (GET /api/notification-logs)**
Systems that fetch notification logs to display in their user interfaces with automatic role-based filtering.

| Reader System | Access Level | What They See |
|---------------|--------------|---------------|
| **Group 5** - Patient Portal | 🔒 **Restricted** | ONLY notifications sent to their own email address |
| **Group 6** - Doctor Portal | 🔒 **Restricted** | ONLY notifications originating from Doctor Portal system |
| **Group 4** - Analytics Dashboard | ⚠️ **Excluded** | NOT included (per their requirements) |

**⚙️ For Reader Groups:**
- **Authentication:** Required - Provide JWT token from Group 3
- **Endpoint:** `GET /api/notification-logs`
- **We enforce:** Automatic RBAC filtering based on your token's role
- **We handle:** Data filtering, pagination, error responses

---

## 📡 API Documentation

**Para makuha yung ilalagay sa bearer token sa thunder clinet/Postman, itype niyo sa  hiwalay na terminal "node generate-tokens.js"**

### **Endpoint 1: POST /api/notify** (For Triggerers)

**Purpose:** Accept notification requests from other microservices and send emails.

**🔒 Authentication:** ✅ **Required** - Valid JWT token in `Authorization: Bearer <token>` header

**Request Headers:**
```http
POST /api/notify HTTP/1.1
Host: notification-service:3000
Authorization: Bearer <jwt_token_from_group_3>
Content-Type: application/json
```

**Request Body:**
```json
{
  "recipientEmail": "patient@example.com",
  "subject": "Queue Update Notification",
  "message": "You are 3rd in queue. Expected wait: 45 minutes. Token: 003"
}
```

**Note:** The senderSystem is no longer required in the payload. The Notification System automatically detects the sender's origin based on the role provided in the JWT Auth token.

**Field Validation:**
| Field | Type | Requirements | Example |
|-------|------|--------------|---------|
| `recipientEmail` | String | Required, valid email | "user@hospital.com" |
| `subject` | String | Required | "Your appointment reminder" |
| `message` | String | Required | "Appointment at 2:00 PM with Dr. Smith" |

**✅ Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Notification processed successfully",
  "code": "NOTIFICATION_SENT",
  "data": {
    "logId": "507f1f77bcf86cd799439011",
    "recipientEmail": "patient@example.com",
    "sentAt": "2026-04-16T14:30:00.000Z",
    "senderSystem": "Queue Management System"
  }
}
```

**⚠️ Duplicate Detected Response (409 Conflict):**
```json
{
  "success": false,
  "message": "Duplicate notification. This exact message was sent to this recipient within the last 5 minutes.",
  "code": "DUPLICATE_NOTIFICATION",
  "originalNotificationTime": "2026-04-16T14:25:00.000Z",
  "recipientEmail": "patient@example.com"
}
```

**❌ Error Responses:**

| HTTP | Code | Scenario | Cause |
|------|------|----------|-------|
| **400** | `MISSING_FIELDS` | Missing required field(s) | Empty `recipientEmail`, `subject`, or `message` |
| **400** | `INVALID_EMAIL` | Invalid email format | `recipientEmail` doesn't match email pattern |
| **401** | `MISSING_AUTH_HEADER` | No Authorization header | Missing `Authorization` header entirely |
| **401** | `INVALID_AUTH_FORMAT` | Wrong header format | Header not in `Bearer <token>` format |
| **401** | `INVALID_TOKEN` | Invalid/expired token | Token signature invalid or expired |
| **500** | `EMAIL_SEND_FAILED` | SMTP failure | Email server unreachable |
| **500** | `INTERNAL_ERROR` | Server error | Unexpected server exception |

---

### **Endpoint 2: GET /api/notification-logs** (For Readers)

**Purpose:** Retrieve notification logs with automatic role-based filtering.

**🔒 Authentication:** ✅ **Required** - Valid JWT token in `Authorization: Bearer <token>` header

**Request Headers:**
```http
GET /api/notification-logs?page=1&limit=20&status=Sent HTTP/1.1
Host: notification-service:3000
Authorization: Bearer <jwt_token_from_group_3>
```

**Query Parameters (All optional):**
| Parameter | Type | Default | Description | Example |
|-----------|------|---------|-------------|---------|
| `page` | integer | 1 | Page number for pagination | `?page=2` |
| `limit` | integer | 20 | Records per page (max 100) | `?limit=50` |
| `status` | string | - | Filter by status | `?status=Sent` or `?status=Failed` |
| `recipientEmail` | string | - | **Admin only** - Search by recipient | `?recipientEmail=user@example.com` |

**✅ Success Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "senderSystem": "Queue Management System",
      "recipientEmail": "patient@example.com",
      "subject": "Queue Position Update",
      "message": "You are 3rd in queue. Expected wait: 45 minutes.",
      "status": "Sent",
      "errorDetails": null,
      "createdAt": "2026-04-16T14:30:00.000Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalCount": 95
  }
}
```

---

## 🔐 Role-Based Access Control (RBAC)

### ⚙️ How RBAC Works

The `GET /api/notification-logs` endpoint **automatically filters data based on the user's role** extracted from their JWT token payload.

### 📋 Required JWT Token Payload Structure

```json
{
  "role": "Patient|Doctor|Admin",
  "email": "user@example.com",
  "userId": "12345"
}
```

### 🎭 Role Filtering Rules

#### **👤 Patient Role (Group 5 - Patient Portal)**
- **Access Level:** 🔒 Restricted
- **Can See:** Notifications sent to **their own email address ONLY**
- **Filtering Logic:** `recipientEmail === user.email` (case-insensitive)
- **Example:** A patient with email "john@hospital.com" can only see logs where `recipientEmail = "john@hospital.com"`
- **Query Parameter Behavior:** 
  - ❌ Cannot use `?recipientEmail=other@email.com` (ignored for security)
  - ✅ Can use `?page`, `?limit`, `?status` for pagination/filtering

#### **👨‍⚕️ Doctor Role (Group 6 - Doctor Portal)**
- **Access Level:** 🔒 Restricted
- **Can See:** Notifications that they personally sent (filtered by their specific email address)
- **Filtering Logic:** `senderEmail === user.email`
- **Example:** All notifications that originated from (were sent by) this specific doctor
- **Security:** Each doctor can ONLY see notifications they themselves created, preventing cross-doctor data leakage
- **Query Parameter Behavior:**
  - ❌ Cannot use `?recipientEmail` (ignored for security)
  - ✅ Can use `?page`, `?limit`, `?status` for pagination/filtering

#### **🔧 Admin Role**
- **Access Level:** 🔓 Unrestricted
- **Can See:** ALL notification logs (no filtering)
- **Query Parameter Behavior:**
  - ✅ CAN use `?recipientEmail=specific@email.com` to search for specific user
  - ✅ Can use any combination of filters

#### **⚠️ Unknown/Missing Role**
- **Access Level:** 🚫 DENIED
- **Result:** Returns empty dataset (security fallback)

### Why This Design?

✅ **Security First:** Prevents unauthorized access to sensitive patient emails  
✅ **Role-Specific:** Each portal only sees what's relevant to their role  
✅ **At-Scale Authentication:** Works with Group 3 (Auth System) to verify tokens  
✅ **Audit Trail:** All access is logged via MongoDB  
✅ **Scalable:** Easy to add new roles in the future  
✅ **Privacy Compliant:** Frontend cannot bypass backend filtering

---

## 📌 Functional Requirements

### ✅ 1. Accept Notification Requests from Other Systems

**Implementation:** `POST /api/notify` endpoint with request validation

**Files:** `routers/notificationRoutes.js` + `controllers/notificationController.js`

**How it works:**
1. Other microservices send POST requests to `/api/notify`
2. All required fields are validated: `recipientEmail`, `subject`, `message`
3. The `senderSystem` is automatically detected from the JWT token's role
4. Email format validation ensures valid recipient addresses
5. JWT token is verified before processing

---

### ✅ 2. Send Email Notifications via SMTP

**Implementation:** Nodemailer integration with fallback error handling

**Files:** `config/mailer.js` + `controllers/notificationController.js` + `.env`

**Email sending:**
1. Nodemailer creates SMTP transporter
2. Uses settings from `.env`
3. Sends email to recipient
4. Logs success/failure

---

### ✅ 3. Prevent Duplicate Notifications

**Implementation:** 5-minute duplicate detection window

**How it works:**
1. Before sending email, query MongoDB for identical notification
2. Check: **Same recipient email + same message + sent within last 5 minutes**
3. If duplicate found: Return HTTP 409
4. If not duplicate: Send email

---

### ✅ 4. Maintain Comprehensive Audit Logs

**Implementation:** MongoDB logging with Mongoose

**Files:** `models/NotificationLog.js`

**Logged for each request:**
- All successful sends (`status: 'Sent'`)
- All failed sends (`status: 'Failed'`)
- All duplicate detections (`status: 'Duplicate'`)
- Automatic timestamp (`createdAt`)

---

### ✅ 5. Enforce JWT Authentication (Dual-Mode)

**Implementation:** JWT validation with fallback support for Auth Group

**Files:** `middleware/authMiddleware.js`

**Modes:**
- **Mode 1 (External API):** If `AUTH_SERVICE_URL` is set, calls external Auth Group API
- **Mode 2 (Local JWT):** If `AUTH_SERVICE_URL` is missing, uses local JWT validation
- Both modes attach verified user data to `req.user` with role and email

---

### ✅ 6. Implement Role-Based Access Control (RBAC)

**Implementation:** Dynamic query filtering in `getNotificationLogs`

**Files:** `controllers/notificationController.js`

**How it works:**
1. Extract `user.role` and `user.email` from JWT token
2. Automatically construct MongoDB query based on role
3. **Patient:** Filter by own email
4. **Doctor:** Filter by "Doctor Portal" sender
5. **Admin:** No filtering (full access)

---

## 📁 Project Structure

```
D:\Has-Integrated-System\
│
├── 📋 config/
│   ├── db.js                 # MongoDB connection
│   └── mailer.js             # Nodemailer SMTP configuration
│
├── 🎮 controllers/
│   └── notificationController.js  # Business logic for notification processing
│
├── 🔐 middleware/
│   └── authMiddleware.js     # JWT authentication middleware
│
├── 📊 models/
│   └── NotificationLog.js    # Mongoose schema for audit logs
│
├── 🛣️ routers/
│   └── notificationRoutes.js # Express route definitions
│
├── 📄 app.js                 # Main Express application
├── 📦 package.json           # Dependencies & scripts
├── 🔑 .env                   # Environment variables (NOT in Git)
├── 🙈 .gitignore            # Git ignore rules
└── 📚 README.md              # This file
```

---

## ⚙️ Installation & Setup

### Prerequisites
- **Node.js v16+** installed
- **MongoDB** running (local or Atlas cloud)
- **Mailtrap account** (or Gmail/other SMTP provider)
- **JWT_SECRET** for token validation

### Step 1: Install Dependencies

```bash
npm install
```

### Step 2: Configure Environment Variables

Create/edit `.env` file:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# MongoDB Configuration
MONGO_URI=mongodb://localhost:27017/hospital-management-db

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_123

# Nodemailer Configuration
NODEMAILER_HOST=sandbox.smtp.mailtrap.io
NODEMAILER_PORT=2525
NODEMAILER_USER=your_mailtrap_username
NODEMAILER_PASS=your_mailtrap_password

# Optional: Auth Group API endpoint (for production)
# AUTH_SERVICE_URL=https://auth-group.hospital.com/verify
```

### Step 3: Ensure MongoDB is Running

**Local MongoDB:**
```bash
mongod
```

**MongoDB Atlas (Cloud):**
Update `MONGO_URI` in `.env` to your Atlas connection string.

### Step 4: Start the Server

**Production:**
```bash
npm start
```

**Development (with auto-reload):**
```bash
npm run dev
```

---

## 🧪 File-by-File Implementation

### 1. **app.js** - Express Server Setup
- Initializes Express application
- Connects to MongoDB
- Sets up middleware (CORS, JSON)
- Registers routes with authentication
- Includes global error handler
- Starts server on configured PORT

### 2. **config/db.js** - Database Connection
- Connects to MongoDB using `MONGO_URI` from `.env`
- Handles connection errors
- Logs connection status

### 3. **config/mailer.js** - Email Configuration
- Creates Nodemailer transporter with SMTP settings
- Exports `sendEmail()` helper function
- Handles SMTP errors and logs message IDs

### 4. **middleware/authMiddleware.js** - JWT Validation
- Validates `Authorization: Bearer <token>` header format
- **Dual-mode execution:**
  - If `AUTH_SERVICE_URL` exists: Calls external Auth Group API
  - Otherwise: Uses local JWT validation
- Attaches verified user data to `req.user` with role and email
- Returns 401 for invalid/missing tokens

### 5. **models/NotificationLog.js** - MongoDB Schema
- Defines notification audit log structure
- Fields: `senderSystem`, `recipientEmail`, `subject`, `message`, `status`, `errorDetails`, `createdAt`
- Indexes on `recipientEmail` and `createdAt`

### 6. **controllers/notificationController.js** - Business Logic

**A. `processNotification` (POST /api/notify)**
- Validates all required fields
- Checks email format
- Performs 5-minute duplicate detection
- Sends email via Nodemailer
- Logs result to MongoDB
- Returns appropriate HTTP response

**B. `getNotificationLogs` (GET /api/notification-logs)**
- Implements RBAC filtering based on user role
- Constructs MongoDB query based on role
- Handles pagination with `page` and `limit`
- Filters by `status` if provided
- Admin can search by `recipientEmail`
- Returns filtered logs with pagination

### 7. **routers/notificationRoutes.js** - Route Definitions
- `POST /api/notify` - Protected with `authMiddleware`
- `GET /api/notification-logs` - Protected with `authMiddleware`
- `GET /api/health` - Public endpoint (no auth)

### 8. **package.json** - Project Metadata
- Enables ES Modules: `"type": "module"`
- Lists all dependencies with versions
- Defines scripts: `npm start` and `npm run dev`

---

## 🧪 Testing & Examples

### **URLs for Testing**

| Environment | Base URL | Status |
|-------------|----------|--------|
| **Local Development** | `http://localhost:3000` | ✅ Use for testing recent changes |
| **Production (Render)** | `https://notification-system-api-oaiu.onrender.com` | ⚠️ May not have latest changes |

**Note:** Use **local URL** for testing recent modifications. Use **production URL** only for stable testing.

---

### **Step 1: Generate Test JWT Tokens**

Before testing, generate JWT tokens for different roles. Use this Node.js script:

```javascript
const jwt = require('jsonwebtoken');

const JWT_SECRET = 'your_jwt_secret_key_123'; // From your .env file

// Generate tokens for different roles
const patientToken = jwt.sign(
  { role: 'Patient', email: 'john@hospital.com', userId: 'P-12345' },
  JWT_SECRET,
  { expiresIn: '1h' }
);

const doctorToken = jwt.sign(
  { role: 'Doctor', email: 'drsmith@hospital.com', userId: 'D-67890' },
  JWT_SECRET,
  { expiresIn: '1h' }
);

const adminToken = jwt.sign(
  { role: 'Admin', email: 'admin@hospital.com', userId: 'A-00001' },
  JWT_SECRET,
  { expiresIn: '1h' }
);

console.log('Patient Token:', patientToken);
console.log('Doctor Token:', doctorToken);
console.log('Admin Token:', adminToken);
```

**Save these tokens** - you'll need them for all authenticated requests.

---

### **Test 1: Health Check** (No Authentication Required)

**Local:**
```bash
curl http://localhost:3000/api/health
```

**Online:**
```bash
curl https://notification-system-api-oaiu.onrender.com/api/health
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Notification service is running",
  "timestamp": "2026-04-16T14:30:00.000Z"
}
```

---

### **Test 2: Send Notification** (POST /api/notify)

**Local:**
```bash
curl -X POST http://localhost:3000/api/notify \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "recipientEmail": "john@hospital.com",
    "subject": "Appointment Reminder",
    "message": "Your appointment is confirmed for tomorrow at 2:00 PM with Dr. Smith."
  }'
```

**Online:**
```bash
curl -X POST https://notification-system-api-oaiu.onrender.com/api/notify \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "recipientEmail": "john@hospital.com",
    "subject": "Appointment Reminder",
    "message": "Your appointment is confirmed for tomorrow at 2:00 PM with Dr. Smith."
  }'
```

**Expected Success Response (200):**
```json
{
  "success": true,
  "message": "Notification processed successfully",
  "code": "NOTIFICATION_SENT",
  "data": {
    "logId": "507f1f77bcf86cd799439011",
    "recipientEmail": "john@hospital.com",
    "sentAt": "2026-04-16T14:30:00.000Z",
    "senderSystem": "Appointment System"
  }
}
```

**Test Duplicate Prevention:**
Run the same request again within 5 minutes - should get:

```json
{
  "success": false,
  "message": "Duplicate notification. This exact message was sent to this recipient within the last 5 minutes.",
  "code": "DUPLICATE_NOTIFICATION",
  "originalNotificationTime": "2026-04-16T14:30:00.000Z",
  "recipientEmail": "john@hospital.com"
}
```

---

### **Test 3: Get Notification Logs** (GET /api/notification-logs)

#### **As a Patient** (Can only see own notifications)

**Local:**
```bash
curl "http://localhost:3000/api/notification-logs?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_PATIENT_TOKEN_HERE"
```

**Online:**
```bash
curl "https://notification-system-api-oaiu.onrender.com/api/notification-logs?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_PATIENT_TOKEN_HERE"
```

**Expected Response (filtered to patient's email):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "recipientEmail": "john@hospital.com",  // ✅ Only sees own emails
      "senderSystem": "Appointment System",
      "subject": "Appointment Reminder",
      "message": "Your appointment is confirmed...",
      "status": "Sent",
      "errorDetails": null,
      "createdAt": "2026-04-16T14:30:00.000Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 1,
    "totalCount": 1
  }
}
```

#### **As a Doctor** (Can only see Doctor Portal notifications)

**Local:**
```bash
curl "http://localhost:3000/api/notification-logs?status=Sent" \
  -H "Authorization: Bearer YOUR_DOCTOR_TOKEN_HERE"
```

**Online:**
```bash
curl "https://notification-system-api-oaiu.onrender.com/api/notification-logs?status=Sent" \
  -H "Authorization: Bearer YOUR_DOCTOR_TOKEN_HERE"
```

**Expected Response (filtered to Doctor Portal only):**
```json
{
  "success": true,
  "data": [
    {
      "recipientEmail": "patient1@hospital.com",
      "senderSystem": "Doctor Portal",  // ✅ Only from Doctor Portal
      "subject": "Test Results Available",
      "message": "Your test results are ready...",
      "status": "Sent",
      "createdAt": "2026-04-16T14:30:00.000Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 1,
    "totalCount": 1
  }
}
```

#### **As an Admin** (Can see all notifications and search by email)

**Local - View All:**
```bash
curl "http://localhost:3000/api/notification-logs?page=1&limit=20" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN_HERE"
```

**Local - Search by specific email:**
```bash
curl "http://localhost:3000/api/notification-logs?recipientEmail=john@hospital.com" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN_HERE"
```

**Online - View All:**
```bash
curl "https://notification-system-api-oaiu.onrender.com/api/notification-logs?page=1&limit=20" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN_HERE"
```

**Online - Search by specific email:**
```bash
curl "https://notification-system-api-oaiu.onrender.com/api/notification-logs?recipientEmail=john@hospital.com" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN_HERE"
```

**Expected Response (Admin - no filtering):**
```json
{
  "success": true,
  "data": [
    {
      "recipientEmail": "john@hospital.com",
      "senderSystem": "Appointment System",  // ✅ ALL senders visible
      "subject": "Appointment Reminder",
      "status": "Sent"
    },
    {
      "recipientEmail": "jane@hospital.com",
      "senderSystem": "Lab System",  // ✅ ALL senders visible
      "subject": "Lab Results Ready",
      "status": "Sent"
    },
    {
      "recipientEmail": "patient1@hospital.com",
      "senderSystem": "Doctor Portal",  // ✅ ALL senders visible
      "subject": "Test Results",
      "status": "Sent"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 2,
    "totalCount": 35
  }
}
```

---

### **Test 4: Error Scenarios**

#### **Missing Authentication**
```bash
curl -X POST http://localhost:3000/api/notify \
  -H "Content-Type: application/json" \
  -d '{"senderSystem": "Test", "recipientEmail": "test@example.com", "subject": "Test", "message": "Test"}'
```

**Response:**
```json
{
  "success": false,
  "message": "Authorization header is missing",
  "code": "MISSING_AUTH_HEADER"
}
```

#### **Invalid Email Format**
```bash
curl -X POST http://localhost:3000/api/notify \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "senderSystem": "Test",
    "recipientEmail": "invalid-email",
    "subject": "Test",
    "message": "Test message"
  }'
```

**Response:**
```json
{
  "success": false,
  "message": "Invalid email format",
  "code": "INVALID_EMAIL"
}
```

#### **Missing Required Fields**
```bash
curl -X POST http://localhost:3000/api/notify \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "senderSystem": "Test",
    "recipientEmail": "test@example.com"
  }'
```

**Response:**
```json
{
  "success": false,
  "message": "Missing required fields",
  "code": "MISSING_FIELDS",
  "required": ["senderSystem", "recipientEmail", "subject", "message"],
  "received": {
    "senderSystem": "Test",
    "recipientEmail": "test@example.com",
    "subject": null,
    "message": null
  }
}
```

---

### **Test 5: Integration Testing Script**

Create a file `test-integration.js` in your project root:

```javascript
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000'; // Change to production URL for online testing
const JWT_SECRET = 'your_jwt_secret_key_123';

const jwt = require('jsonwebtoken');

// Generate test tokens
const adminToken = jwt.sign(
  { role: 'Admin', email: 'admin@test.com' },
  JWT_SECRET
);

const patientToken = jwt.sign(
  { role: 'Patient', email: 'john@hospital.com' },
  JWT_SECRET
);

// Test functions
async function testHealth() {
  console.log('🩺 Testing Health Check...');
  const response = await fetch(`${BASE_URL}/api/health`);
  const data = await response.json();
  console.log('✅ Health:', data.success);
}

async function testSendNotification() {
  console.log('📧 Testing Send Notification...');
  const response = await fetch(`${BASE_URL}/api/notify`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      senderSystem: 'Integration Test',
      recipientEmail: 'test@example.com',
      subject: 'Integration Test',
      message: 'This is a test notification from integration script.'
    })
  });
  const data = await response.json();
  console.log('✅ Send Notification:', data.success, data.code);
}

async function testGetLogsAsPatient() {
  console.log('👤 Testing Get Logs as Patient...');
  const response = await fetch(`${BASE_URL}/api/notification-logs`, {
    headers: {
      'Authorization': `Bearer ${patientToken}`
    }
  });
  const data = await response.json();
  console.log('✅ Patient Logs:', data.data.length, 'records');
}

async function testGetLogsAsAdmin() {
  console.log('🔧 Testing Get Logs as Admin...');
  const response = await fetch(`${BASE_URL}/api/notification-logs`, {
    headers: {
      'Authorization': `Bearer ${adminToken}`
    }
  });
  const data = await response.json();
  console.log('✅ Admin Logs:', data.data.length, 'records');
}

// Run all tests
async function runTests() {
  try {
    await testHealth();
    await testSendNotification();
    await testGetLogsAsPatient();
    await testGetLogsAsAdmin();
    console.log('🎉 All tests completed!');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

runTests();
```

**Run the integration test:**
```bash
node test-integration.js
```

---

### **Test 6: Postman Collection**

Import this JSON into Postman for easy testing:

```json
{
  "info": {
    "name": "Notification System API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Health Check",
      "request": {
        "method": "GET",
        "header": [],
        "url": {
          "raw": "{{base_url}}/api/health",
          "host": ["{{base_url}}"],
          "path": ["api", "health"]
        }
      }
    },
    {
      "name": "Send Notification",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{admin_token}}"
          },
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"senderSystem\": \"Appointment System\",\n  \"recipientEmail\": \"john@hospital.com\",\n  \"subject\": \"Appointment Reminder\",\n  \"message\": \"Your appointment is confirmed for tomorrow at 2:00 PM with Dr. Smith.\"\n}"
        },
        "url": {
          "raw": "{{base_url}}/api/notify",
          "host": ["{{base_url}}"],
          "path": ["api", "notify"]
        }
      }
    },
    {
      "name": "Get Logs as Patient",
      "request": {
        "method": "GET",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{patient_token}}"
          }
        ],
        "url": {
          "raw": "{{base_url}}/api/notification-logs?page=1&limit=10",
          "host": ["{{base_url}}"],
          "path": ["api", "notification-logs"],
          "query": [
            {
              "key": "page",
              "value": "1"
            },
            {
              "key": "limit",
              "value": "10"
            }
          ]
        }
      }
    },
    {
      "name": "Get Logs as Admin",
      "request": {
        "method": "GET",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{admin_token}}"
          }
        ],
        "url": {
          "raw": "{{base_url}}/api/notification-logs?page=1&limit=20",
          "host": ["{{base_url}}"],
          "path": ["api", "notification-logs"],
          "query": [
            {
              "key": "page",
              "value": "1"
            },
            {
              "key": "limit",
              "value": "20"
            }
          ]
        }
      }
    }
  ],
  "variable": [
    {
      "key": "base_url",
      "value": "http://localhost:3000",
      "type": "string"
    },
    {
      "key": "admin_token",
      "value": "your_admin_jwt_token_here",
      "type": "string"
    },
    {
      "key": "patient_token",
      "value": "your_patient_jwt_token_here",
      "type": "string"
    }
  ]
}
```

**Postman Setup:**
1. Import the collection
2. Set variables:
   - `base_url`: `http://localhost:3000` (local) or `https://notification-system-api-oaiu.onrender.com` (online)
   - `admin_token`: Your generated admin JWT token
   - `patient_token`: Your generated patient JWT token
3. Run the requests!

---

## 🧪 Testing with Thunder Client / Postman

### **Setup Instructions**

1. **Open Thunder Client or Postman**
2. **Create a new collection** called "Notification System API"
3. **Set up environment variables** for easy switching between local and online:

### **Environment Variables Setup**

**Create two environments:**

#### **Local Environment:**
```
base_url: http://localhost:3000
admin_token: [your_generated_admin_token]
patient_token: [your_generated_patient_token]
doctor_token: [your_generated_doctor_token]
```

#### **Online Environment:**
```
base_url: https://notification-system-api-oaiu.onrender.com
admin_token: [your_generated_admin_token]
patient_token: [your_generated_patient_token]
doctor_token: [your_generated_doctor_token]
```

---

### **Request 1: Health Check** (No Auth Required)

**Method:** `GET`  
**URL:** `{{base_url}}/api/health`  
**Headers:** None required

**Expected Response:**
```json
{
  "success": true,
  "message": "Notification service is running",
  "timestamp": "2026-04-16T14:30:00.000Z"
}
```

---

### **Request 2: Send Notification** (POST /api/notify)

**Method:** `POST`  
**URL:** `{{base_url}}/api/notify`  
**Headers:**
```
Authorization: Bearer {{admin_token}}
Content-Type: application/json
```

**Request Body (JSON):**
```json
{
  "senderSystem": "Appointment System",
  "recipientEmail": "john@hospital.com",
  "subject": "Appointment Reminder",
  "message": "Your appointment is confirmed for tomorrow at 2:00 PM with Dr. Smith."
}
```

**Expected Success Response (200):**
```json
{
  "success": true,
  "message": "Notification processed successfully",
  "code": "NOTIFICATION_SENT",
  "data": {
    "logId": "507f1f77bcf86cd799439011",
    "recipientEmail": "john@hospital.com",
    "sentAt": "2026-04-16T14:30:00.000Z",
    "senderSystem": "Appointment System"
  }
}
```

**Test Duplicate Prevention:** Send the same request again within 5 minutes - expect:
```json
{
  "success": false,
  "message": "Duplicate notification. This exact message was sent to this recipient within the last 5 minutes.",
  "code": "DUPLICATE_NOTIFICATION",
  "originalNotificationTime": "2026-04-16T14:30:00.000Z",
  "recipientEmail": "john@hospital.com"
}
```

---

### **Request 3: Get Logs as Patient** (Can only see own notifications)

**Method:** `GET`  
**URL:** `{{base_url}}/api/notification-logs?page=1&limit=10`  
**Headers:**
```
Authorization: Bearer {{patient_token}}
```

**Expected Response (filtered to patient's email):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "recipientEmail": "john@hospital.com",  // ✅ Only sees own emails
      "senderSystem": "Appointment System",
      "subject": "Appointment Reminder",
      "message": "Your appointment is confirmed...",
      "status": "Sent",
      "errorDetails": null,
      "createdAt": "2026-04-16T14:30:00.000Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 1,
    "totalCount": 1
  }
}
```

---

### **Request 4: Get Logs as Doctor** (Can only see Doctor Portal notifications)

**Method:** `GET`  
**URL:** `{{base_url}}/api/notification-logs?status=Sent`  
**Headers:**
```
Authorization: Bearer {{doctor_token}}
```

**Expected Response (filtered to Doctor Portal only):**
```json
{
  "success": true,
  "data": [
    {
      "recipientEmail": "patient1@hospital.com",
      "senderSystem": "Doctor Portal",  // ✅ Only from Doctor Portal
      "subject": "Test Results Available",
      "message": "Your test results are ready...",
      "status": "Sent",
      "createdAt": "2026-04-16T14:30:00.000Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 1,
    "totalCount": 1
  }
}
```

---

### **Request 5: Get Logs as Admin** (Can see all notifications)

**Method:** `GET`  
**URL:** `{{base_url}}/api/notification-logs?page=1&limit=20`  
**Headers:**
```
Authorization: Bearer {{admin_token}}
```

**Expected Response (no filtering applied):**
```json
{
  "success": true,
  "data": [
    {
      "recipientEmail": "john@hospital.com",
      "senderSystem": "Appointment System",  // ✅ ALL senders visible
      "subject": "Appointment Reminder",
      "status": "Sent"
    },
    {
      "recipientEmail": "jane@hospital.com",
      "senderSystem": "Lab System",  // ✅ ALL senders visible
      "subject": "Lab Results Ready",
      "status": "Sent"
    },
    {
      "recipientEmail": "patient1@hospital.com",
      "senderSystem": "Doctor Portal",  // ✅ ALL senders visible
      "subject": "Test Results",
      "status": "Sent"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 2,
    "totalCount": 35
  }
}
```

---

### **Request 6: Admin Search by Specific Email**

**Method:** `GET`  
**URL:** `{{base_url}}/api/notification-logs?recipientEmail=john@hospital.com`  
**Headers:**
```
Authorization: Bearer {{admin_token}}
```

---

### **Error Testing Requests**

#### **Missing Authentication**
**Method:** `POST`  
**URL:** `{{base_url}}/api/notify`  
**Headers:** Only `Content-Type: application/json` (no Authorization)  
**Body:**
```json
{
  "senderSystem": "Test",
  "recipientEmail": "test@example.com",
  "subject": "Test",
  "message": "Test message"
}
```

**Expected Response:**
```json
{
  "success": false,
  "message": "Authorization header is missing",
  "code": "MISSING_AUTH_HEADER"
}
```

#### **Invalid Email Format**
**Method:** `POST`  
**URL:** `{{base_url}}/api/notify`  
**Headers:**
```
Authorization: Bearer {{admin_token}}
Content-Type: application/json
```
**Body:**
```json
{
  "senderSystem": "Test",
  "recipientEmail": "invalid-email",
  "subject": "Test",
  "message": "Test message"
}
```

**Expected Response:**
```json
{
  "success": false,
  "message": "Invalid email format",
  "code": "INVALID_EMAIL"
}
```

#### **Missing Required Fields**
**Method:** `POST`  
**URL:** `{{base_url}}/api/notify`  
**Headers:**
```
Authorization: Bearer {{admin_token}}
Content-Type: application/json
```
**Body:**
```json
{
  "senderSystem": "Test",
  "recipientEmail": "test@example.com"
}
```

**Expected Response:**
```json
{
  "success": false,
  "message": "Missing required fields",
  "code": "MISSING_FIELDS",
  "required": ["senderSystem", "recipientEmail", "subject", "message"],
  "received": {
    "senderSystem": "Test",
    "recipientEmail": "test@example.com",
    "subject": null,
    "message": null
  }
}
```

---

### **Thunder Client / Postman Setup Steps**

1. **Create Collection:** "Notification System API"
2. **Create Environments:**
   - Local: `http://localhost:3000`
   - Online: `https://notification-system-api-oaiu.onrender.com`
3. **Generate JWT Tokens** using the script in the Testing section
4. **Set Environment Variables** for tokens
5. **Create Requests** as shown above
6. **Test Each Request** and verify responses match expectations

### **Quick Test Workflow**

1. ✅ **Health Check** - Should work without auth
2. ✅ **Send Notification** - Use admin token, should succeed
3. ✅ **Send Same Notification Again** - Should get duplicate error (409)
4. ✅ **Get Logs as Patient** - Should only see notifications sent to patient's email
5. ✅ **Get Logs as Doctor** - Should only see notifications from "Doctor Portal"
6. ✅ **Get Logs as Admin** - Should see all notifications
7. ✅ **Test Error Cases** - Missing auth, invalid email, missing fields

### **Switching Between Environments**

- **For Local Testing:** Select "Local" environment in Thunder Client/Postman
- **For Online Testing:** Select "Online" environment in Thunder Client/Postman

**Remember:** Use **Local** for testing your recent RBAC changes, **Online** for the deployed version!

---

## 🐛 Troubleshooting

### Issue: "connect ECONNREFUSED 127.0.0.1:27017"

**Cause:** MongoDB is not running

**Solution:** Start MongoDB or use MongoDB Atlas cloud connection

### Issue: "JWT_SECRET is not defined"

**Cause:** Missing `JWT_SECRET` in `.env`

**Solution:** Add to `.env`:
```env
JWT_SECRET=your_secret_key
```

### Issue: "Email sending failed: SMTP Connection timeout"

**Cause:** Mailtrap credentials invalid or SMTP unreachable

**Solution:** Verify Mailtrap credentials or use alternative SMTP provider

---

## ✅ Code Verification Summary

**All code is production-ready and fully aligned with requirements:**

✅ `authMiddleware.js` - Dual-mode authentication (local + external API)  
✅ `notificationController.js` - RBAC implementation is correct and secure  
✅ `POST /api/notify` - Accepts requests from all triggerers with auth  
✅ `GET /api/notification-logs` - Enforces strict role-based filtering  
✅ Patient access - Can only see their own notifications  
✅ Doctor access - Can only see Doctor Portal notifications  
✅ Duplicate prevention - 5-minute window implemented  
✅ Audit logging - All requests logged to MongoDB  
✅ Error handling - Comprehensive error responses  

**Ready for external integration with Groups 1, 5, 6, 7, 8, 10, 11** ✨
# 🏥 Notification System Microservice

A microservice responsible for sending alerts and updates to users in the Hospital Management System. This system handles email notifications, prevents duplicates, logs all activities, and integrates with other microservices through JWT authentication with Role-Based Access Control (RBAC).

> **Project Type:** Hospital Management System - Microservice (Group 9)
> **Version:** 1.0.0  
> **Last Updated:** April 16, 2026  
> **Status:** ✅ Production-Ready for External Integration

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Microservices Architecture](#-microservices-architecture)
- [Integration Breakdown](#-integration-breakdown)
- [API Documentation](#-api-documentation)
- [Functional Requirements](#-functional-requirements)
- [Project Structure](#-project-structure)
- [Installation & Setup](#-installation--setup)
- [Role-Based Access Control (RBAC)](#-role-based-access-control-rbac)
- [File-by-File Implementation](#-file-by-file-implementation)
- [Testing](#-testing)
- [Troubleshooting](#-troubleshooting)

---

## 🎯 Overview

The Notification System is an independent microservice that:
- ✅ Accepts notification requests from other systems via POST /api/notify
- ✅ Sends email notifications via SMTP (Nodemailer)
- ✅ Maintains comprehensive audit logs in MongoDB
- ✅ Prevents duplicate notifications within 5-minute windows
- ✅ Enforces JWT-based authorization with dual-mode validation
- ✅ Implements strict Role-Based Access Control (RBAC) for GET requests
- ✅ Handles failures gracefully with standardized error responses
- ✅ Provides role-based filtering to prevent unauthorized access to sensitive emails

---

## 🏗️ Microservices Architecture

The Hospital Management System consists of **11 independent microservices**:

| Group | Service | Role |
|-------|---------|------|
| **Group 1** | Online Appointment System | Triggers appointments |
| **Group 2** | Adapter Layer | Legacy system integration |
| **Group 3** | Authentication System | Issues JWT tokens & verifies users |
| **Group 4** | Analytics Dashboard System | Data visualization & reporting |
| **Group 5** | Patient Portal | Patient-facing UI |
| **Group 6** | Doctor Portal | Doctor-facing UI |
| **Group 7** | Queue Management System | Manages patient queues |
| **Group 8** | Laboratory Information System | Lab test management |
| **Group 9** | **Notification System (Us)** | Sends emails & logs notifications |
| **Group 10** | Pharmacy Management System | Medicine & prescription management |
| **Group 11** | Medical Record Management | EHR storage & retrieval |

---

## 📡 Integration Breakdown

### **GROUP 9 - Notification System Roles**

The Notification System serves two distinct roles in the architecture:

#### **1. THE TRIGGERERS (POST /api/notify)**
Systems that call our API to send emails to users.

| Caller Group | Use Case | Example |
|--------------|----------|---------|
| **Group 1** - Online Appointment System | Appointment confirmations, reminders | "Your appointment is confirmed for 2:30 PM on April 20" |
| **Group 7** - Queue Management System | Queue position updates, turn notifications | "You are 3rd in queue. Expected wait: 45 minutes" |
| **Group 8** - Laboratory Information System | Lab results availability | "Your blood test results are ready" |
| **Group 10** - Pharmacy Management System | Medicine pickup reminders | "Your prescription is ready for pickup at pharmacy counter 2" |
| **Group 11** - Medical Record Management | Record updates, access notifications | "Your medical record has been updated" |

**For These Groups:** We don't modify our code. You provide us with your **live endpoint (POST /api/notify)** and the **JSON body format below**. You handle the triggering on your end.

#### **2. THE READERS (GET /api/notification-logs)**
Systems that fetch notification logs to display in their user interfaces.

| Reader Group | Access Level | Retrieves |
|--------------|--------------|-----------|
| **Group 5** - Patient Portal | 🔒 Restricted | ONLY notifications sent to their own email address |
| **Group 6** - Doctor Portal | 🔒 Restricted | ONLY notifications originating from the Doctor Portal system |
| **Group 4** - Analytics Dashboard | ⚠️ Excluded | NOT included (per their requirements) |

**For These Groups:** We apply **strict RBAC filtering** based on the JWT token payload from **Group 3 (Authentication System)**. Each user can only access data they're authorized to see.

---

## � API Documentation

### **Endpoint 1: POST /api/notify** (For Triggerers)

**Purpose:** Accept notification requests from other microservices and send emails.

**Authentication:** ✅ Required - Valid JWT token in `Authorization: Bearer <token>` header

**Request Headers:**
```http
Authorization: Bearer <jwt_token_from_group_3>
Content-Type: application/json
```

**Request Body:**
```json
{
  "senderSystem": "string (e.g., 'Queue Management System', 'Appointment System', 'Lab System')",
  "recipientEmail": "user@example.com",
  "subject": "Email Subject Line",
  "message": "Full email message body"
}
```

**Request Validation:**
- ✅ All fields are required
- ✅ `recipientEmail` must be a valid email format
- ✅ Must include valid JWT token in headers

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Notification processed successfully",
  "code": "NOTIFICATION_SENT",
  "data": {
    "logId": "507f1f77bcf86cd799439011",
    "recipientEmail": "patient@example.com",
    "sentAt": "2026-04-16T14:30:00.000Z",
    "senderSystem": "Queue Management System"
  }
}
```

**Error Responses:**

| Status | Code | Scenario |
|--------|------|----------|
| **400** | `MISSING_FIELDS` | Missing required fields (senderSystem, recipientEmail, subject, message) |
| **400** | `INVALID_EMAIL` | Email format is invalid |
| **401** | `MISSING_AUTH_HEADER` | Authorization header not provided |
| **401** | `INVALID_AUTH_FORMAT` | Header format is not `Bearer <token>` |
| **401** | `INVALID_TOKEN` | Token is invalid or expired |
| **409** | `DUPLICATE_NOTIFICATION` | Identical notification sent within last 5 minutes |
| **500** | `EMAIL_SEND_FAILED` | Email sending failed (check logs) |
| **500** | `INTERNAL_ERROR` | Unexpected server error |

**Example Error Response - Duplicate Notification:**
```json
{
  "success": false,
  "message": "Duplicate notification. This exact message was sent to this recipient within the last 5 minutes.",
  "code": "DUPLICATE_NOTIFICATION",
  "originalNotificationTime": "2026-04-16T14:25:00.000Z",
  "recipientEmail": "patient@example.com"
}
```

---

### **Endpoint 2: GET /api/notification-logs** (For Readers)

**Purpose:** Retrieve notification logs with automatic role-based filtering.

**Authentication:** ✅ Required - Valid JWT token in `Authorization: Bearer <token>` header

**Request Headers:**
```http
Authorization: Bearer <jwt_token_from_group_3>
Content-Type: application/json
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | 1 | Page number for pagination |
| `limit` | integer | 20 | Records per page |
| `status` | string | - | Filter by status: `Sent`, `Failed`, or `Duplicate` |
| `recipientEmail` | string | - | **Admin only** - Search by recipient email |

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "senderSystem": "Queue Management System",
      "recipientEmail": "patient@example.com",
      "subject": "Queue Update",
      "message": "You are 3rd in queue...",
      "status": "Sent",
      "createdAt": "2026-04-16T14:30:00.000Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalCount": 95
  }
}
```

**Error Responses:**

| Status | Code | Scenario |
|--------|------|----------|
| **400** | Bad Request | Missing email validation for Patient role |
| **401** | `INVALID_TOKEN` | Token is invalid or expired |
| **500** | `FETCH_LOGS_ERROR` | Database query failed |

---

## 🔐 Role-Based Access Control (RBAC)

### How RBAC Works

The `GET /api/notification-logs` endpoint automatically filters data **based on the user's role** extracted from their JWT token.

**Required JWT Token Payload Structure:**
```json
{
  "role": "Patient|Doctor|Admin",
  "email": "user@example.com"  // Required for Patient role
}
```

### Role Filtering Rules

#### **👤 Patient Role (Group 5 - Patient Portal)**
- **Can see:** Notifications sent to their own email address ONLY
- **Filtering logic:** `recipientEmail === user.email`
- **Example:** Patient with email "john@hospital.com" can only see logs where `recipientEmail = "john@hospital.com"`
- **Query parameter `recipientEmail` is ignored** (cannot search for other users' emails)

#### **👨‍⚕️ Doctor Role (Group 6 - Doctor Portal)**
- **Can see:** Notifications that they personally sent (filtered by their specific email address)
- **Filtering logic:** `senderEmail === user.email`
- **Example:** All notifications that originated from (were sent by) this specific doctor
- **Use case:** Doctors viewing notifications they themselves created
- **Security:** Each doctor can ONLY see notifications they themselves created, preventing cross-doctor data leakage
- **Query parameter `recipientEmail` is ignored** (cannot search for other doctors' notifications)

#### **🔧 Admin Role**
- **Can see:** ALL notification logs (unrestricted access)
- **Query parameter `recipientEmail` is respected** - Admins can search by specific email
- **Example:** `GET /api/notification-logs?recipientEmail=patient@example.com` - Shows all notifications sent to that email

#### **⚠️ No Role or Invalid Role**
- **Access:** DENIED
- **Filtering:** Query becomes impossible to satisfy (blocklist applied)
- **Result:** Empty dataset returned (security fallback)

### Why This Design?

✅ **Security First:** Prevents unauthorized access to sensitive patient emails  
✅ **Role-Specific:** Each portal only sees what's relevant to their role  
✅ **Audit Trail:** All access is logged via MongoDB  
✅ **Scalable:** Easy to add new roles in the future

---

## 📌 Functional Requirements

### ✅ 1. Accept Notification Requests from Other Systems

**Implementation:** `POST /api/notify` endpoint

**File:** `routers/notificationRoutes.js` + `controllers/notificationController.js`

**How it works:**
- Other microservices (Queue, Appointment, Lab, Pharmacy, Records) send POST requests to `/api/notify`
- Request body contains: `senderSystem`, `recipientEmail`, `subject`, `message`
- System validates all required fields exist
- JWT token is verified before processing

**Code snippet:**
```javascript
// Extract and validate request body
const { senderSystem, recipientEmail, subject, message } = req.body;

if (!senderSystem || !recipientEmail || !subject || !message) {
  return res.status(400).json({
    success: false,
    message: 'Missing required fields',
    code: 'MISSING_FIELDS',
  });
}
```

---

### ✅ 2. Send Email Notifications

**Implementation:** Nodemailer integration

**Files:** `config/mailer.js` + `.env`

**How it works:**
- `config/mailer.js` creates a configured Nodemailer transporter
- Uses SMTP settings from `.env` file (Mailtrap for development)
- `sendEmail()` helper function handles actual email transmission
- Throws errors if email fails, which are caught and logged

**Environment Variables:**
```
NODEMAILER_HOST=sandbox.smtp.mailtrap.io
NODEMAILER_PORT=2525
NODEMAILER_USER=your_mailtrap_user
NODEMAILER_PASS=your_mailtrap_password
```

**Code snippet:**
```javascript
export const sendEmail = async (to, subject, text) => {
  const mailOptions = {
    from: process.env.NODEMAILER_USER,
    to,
    subject,
    text,
  };
  const info = await transporter.sendMail(mailOptions);
  console.log(`✓ Email sent to ${to}: ${info.messageId}`);
  return info;
};
```

---

### ✅ 3. Prevent Duplicate Notifications

**Implementation:** 5-minute duplicate detection window

**How it works:**
- Before sending, system checks if identical notification was sent to same recipient in last 5 minutes
- If found, returns HTTP 409 (Conflict) with `DUPLICATE_NOTIFICATION` code
- Original notification timestamp is included in response

**Code snippet:**
```javascript
const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

const duplicateRecord = await NotificationLog.findOne({
  recipientEmail: recipientEmail.toLowerCase(),
  message,
  status: { $in: ['Sent', 'Duplicate'] },
  createdAt: { $gte: fiveMinutesAgo },
});

if (duplicateRecord) {
  // Log as duplicate and reject
  return res.status(409).json({
    success: false,
    message: 'Duplicate notification',
    code: 'DUPLICATE_NOTIFICATION',
  });
}
```

---

### ✅ 4. Maintain Audit Logs

**Implementation:** MongoDB logging on all requests

**Files:** `models/NotificationLog.js`

**What's logged:**
- ✅ All successful sends (`status: 'Sent'`)
- ✅ All failed sends (`status: 'Failed'`)
- ✅ All duplicate detections (`status: 'Duplicate'`)
- ✅ Timestamp, sender, recipient, subject, message
- ✅ Error details (if applicable)

**Timestamp:** All logs are automatically timestamped with `createdAt` and `updatedAt`

---

### ✅ 5. Enforce JWT Authentication

**Implementation:** Dual-mode validation system

**Files:** `middleware/authMiddleware.js`

**How it works:**
- **Mode 1 (External API):** If `AUTH_SERVICE_URL` is set in `.env`, validates against Group 3 Auth System
- **Mode 2 (Local JWT):** If `AUTH_SERVICE_URL` is missing, validates locally using `JWT_SECRET`
- Both modes extract `role` and `email` from token payload and attach to `req.user`

**Environment Variables:**
```
JWT_SECRET=your_jwt_secret_key
AUTH_SERVICE_URL=https://auth-group.internal/verify  # Optional - for production with Group 3
```

**Code snippet:**
```javascript
if (authServiceUrl) {
  // External API validation (production with Group 3)
  const authResponse = await fetch(authServiceUrl, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const authData = await authResponse.json();
  req.user = authData.user || authData;
} else {
  // Local JWT validation (development/testing)
  const decoded = jwt.verify(token, jwtSecret);
  req.user = decoded;
}
```

---

### ✅ 6. Provide Role-Based Access Control (RBAC)

**Implementation:** Dynamic query filtering in `getNotificationLogs`

**Files:** `controllers/notificationController.js`

**How it works:**
- Parses `user.role` from JWT token payload
- Automatically constructs MongoDB query based on role
- Patient: Filters by own email
- Doctor: Filters by "Doctor Portal" sender system
- Admin: Full access
- Unknown role: Access denied

**See RBAC section above for detailed breakdown.**

---

### ✅ 3. Create Logs for Each Sent Notification

**Implementation:** MongoDB logging with Mongoose

**Files:** `models/NotificationLog.js` + `controllers/notificationController.js`

**How it works:**
- `NotificationLog` schema stores: `senderSystem`, `recipientEmail`, `subject`, `message`, `status`, `errorDetails`, `createdAt`
- Every notification attempt is logged with status: **'Sent'** | **'Failed'** | **'Duplicate'**
- Indexed on `recipientEmail` and `createdAt` for fast duplicate detection
- All logs are retrievable via `/GET /api/notification-logs` endpoint

**Schema Definition:**
```javascript
const notificationLogSchema = new mongoose.Schema({
  senderSystem: { type: String, required: true },
  recipientEmail: { type: String, required: true, lowercase: true },
  subject: { type: String, required: true },
  message: { type: String, required: true },
  status: { type: String, enum: ['Sent', 'Failed', 'Duplicate'], required: true },
  errorDetails: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
});
```

**Logged Examples:**
- ✅ Status: `'Sent'` - Email successfully delivered
- ❌ Status: `'Failed'` - Email failed, reason in `errorDetails`
- ⚠ Status: `'Duplicate'` - Same recipient + message within 5 minutes

---

### ✅ 4. Prevent Duplicate Notifications

**Implementation:** 5-minute duplicate detection window

**File:** `controllers/notificationController.js`

**How it works:**
1. Before sending email, query MongoDB for identical notifications
2. Check: Same `recipientEmail` + same `message` + sent within last 5 minutes
3. If duplicate found: Log with status 'Duplicate' and return `409 Conflict`
4. If not duplicate: Proceed with email sending

**Code snippet:**
```javascript
const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

const duplicateRecord = await NotificationLog.findOne({
  recipientEmail: recipientEmail.toLowerCase(),
  message,
  status: { $in: ['Sent', 'Duplicate'] },
  createdAt: { $gte: fiveMinutesAgo },
});

if (duplicateRecord) {
  // Log as duplicate and return 409
  await NotificationLog.create({
    senderSystem,
    recipientEmail: recipientEmail.toLowerCase(),
    subject,
    message,
    status: 'Duplicate',
  });

  return res.status(409).json({
    success: false,
    message: 'Duplicate notification. Same message sent within last 5 minutes.',
    code: 'DUPLICATE_NOTIFICATION',
    originalNotificationTime: duplicateRecord.createdAt,
  });
}
```

---

### ✅ 5. Prevent Processing from Unauthorized Users

**Implementation:** JWT Bearer token authentication

**File:** `middleware/authMiddleware.js`

**How it works:**
1. Checks for `Authorization` header in format: `Bearer <token>`
2. Verifies JWT token using `JWT_SECRET` from `.env`
3. If missing or invalid: Returns `401 Unauthorized`
4. If valid: Attaches decoded token to `req.user` and proceeds

**Environment Variable:**
```
JWT_SECRET=project_namin_ito_123
```

**Code snippet:**
```javascript
export const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      success: false,
      message: 'Authorization header is missing',
      code: 'MISSING_AUTH_HEADER',
    });
  }

  const tokenParts = authHeader.split(' ');
  if (tokenParts.length !== 2 || tokenParts[0] !== 'Bearer') {
    return res.status(401).json({
      success: false,
      message: 'Invalid authorization header format. Expected: Bearer <token>',
      code: 'INVALID_AUTH_FORMAT',
    });
  }

  const token = tokenParts[1];
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  req.user = decoded;
  next();
};
```

**Protected Route Example:**
```javascript
router.post('/notify', authMiddleware, processNotification);
// authMiddleware runs FIRST, then processNotification
```

---

## 🔌 Integration Requirements

### ✅ Integration with Authentication and Authorization System

**Current Implementation:** Temporary JWT validation

**File:** `middleware/authMiddleware.js`

**How it works:**
- System currently uses local JWT verification
- When Authentication/Authorization System is complete, this middleware can be replaced to call that system's validation endpoint
- Currently supports: Bearer token verification using `JWT_SECRET`

**Planned Enhancement:**
```javascript
// Future implementation (when Auth system is ready):
export const authMiddleware = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No token' });
  }
  
  // Call Auth System microservice instead:
  // const authResponse = await fetch('http://auth-service/verify', {
  //   headers: { 'Authorization': `Bearer ${token}` }
  // });
  // const user = await authResponse.json();
  
  next();
};
```

---

## 🛡️ Constraints & Solutions

### ✅ 1. System Must Be Independent

**Solution:**
- Self-contained microservice with own database (MongoDB)
- Own Express server (Port 3000 by default)
- Does NOT depend on other systems being available
- Handles failures gracefully with try-catch blocks

**Code example from `app.js`:**
```javascript
// Own database connection
await connectDB();

// Own Express setup
app.use(cors());
app.use(express.json());

// Independent routing
app.use('/api', notificationRoutes);
```

---

### ✅ 2. Handle Errors if Integrated Systems Are Not Available

**Solution:** Comprehensive error handling with standardized JSON responses

**Implementation in `controllers/notificationController.js`:**

**A. Database Connection Failures:**
```javascript
try {
  const duplicateRecord = await NotificationLog.findOne({ /* ... */ });
  // If MongoDB is down, error is caught below
} catch (error) {
  // Handled in main catch block
}
```

**B. Email Server Failures:**
```javascript
try {
  await sendEmail(recipientEmail, subject, message);
  emailSent = true;
} catch (error) {
  sendEmailError = error.message;
  console.error('Email sending failed:', sendEmailError);
  // Continue - don't reject, log the error
}

if (!emailSent) {
  // Save failed attempt to DB
  await NotificationLog.create({
    status: 'Failed',
    errorDetails: sendEmailError,
  });
  
  return res.status(500).json({
    success: false,
    message: 'Failed to send notification email',
    code: 'EMAIL_SEND_FAILED',
    details: sendEmailError,
  });
}
```

**C. Global Error Handler:**
```javascript
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  return res.status(500).json({
    success: false,
    message: 'Internal server error',
    code: 'SERVER_ERROR',
    details: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
});
```

**Standard Error Responses for Integration Teams:**
- `400 Bad Request` - Missing or invalid fields
- `401 Unauthorized` - Invalid/missing JWT token
- `409 Conflict` - Duplicate notification detected
- `500 Internal Server Error` - Server or external service failure
- All errors include: `success`, `message`, `code`, `details` fields

---

### ✅ 3. Any Update in Data Must Reflect to the Legacy System

**Solution:** Placeholder hook for Legacy System Adapter

**Implementation in `controllers/notificationController.js`:**

```javascript
// Step 5: Mock Legacy System Update
// TODO: Trigger Legacy System Adapter
// This represents an asynchronous call to update legacy hospital systems
// Example implementation:
// try {
//   await updateLegacySystem({
//     notificationId: notificationLog._id,
//     recipientEmail,
//     timestamp: new Date(),
//   });
// } catch (legacyError) {
//   console.error('Legacy system update failed:', legacyError);
//   // Log but don't fail the request - notification was already sent
// }
```

**Future Implementation Steps:**
1. Create a helper function `updateLegacySystem()` in a new file: `adapters/legacySystemAdapter.js`
2. This function will call the Legacy System API endpoint
3. It will send: notification ID, recipient, status, timestamp
4. Even if Legacy System fails, the notification is still considered sent (fire-and-forget pattern)

---

## 📁 Project Structure

```
D:\Has-Integrated-System\
│
├── 📋 config/
│   ├── db.js                 # MongoDB connection setup
│   └── mailer.js             # Nodemailer configuration & email helper
│
├── 🎮 controllers/
│   └── notificationController.js  # Business logic for notification processing
│
├── 🔐 middleware/
│   └── authMiddleware.js     # JWT authentication middleware
│
├── 📊 models/
│   └── NotificationLog.js    # Mongoose schema for notification logs
│
├── 🛣️ routers/
│   └── notificationRoutes.js # Express route definitions
│
├── 📄 app.js                 # Main Express application & server startup
├── 📦 package.json           # Dependencies & project metadata
├── 🔑 .env                   # Environment variables (not in Git)
├── 🙈 .gitignore            # Git ignore rules
└── 📚 README.md             # This file
```

---

## ⚙️ Installation & Setup

### Prerequisites
- Node.js v16+ installed
- MongoDB running locally or accessible
- Mailtrap account (for SMTP testing) or Gmail/other SMTP provider

### Step 1: Install Dependencies

```bash
npm install
```

This installs:
- `express` - Web framework
- `mongoose` - MongoDB ODM
- `nodemailer` - Email sending
- `dotenv` - Environment variable management
- `cors` - Cross-origin resource sharing
- `jsonwebtoken` - JWT authentication

### Step 2: Configure Environment Variables

Edit `.env` file with your settings:

```env
# Server Configuration
PORT=3000

# MongoDB Configuration
MONGO_URI=mongodb://localhost:27017/hospital-management-db

# JWT Configuration
JWT_SECRET=project_namin_ito_123

# Nodemailer Configuration (using Mailtrap for development)
NODEMAILER_HOST=sandbox.smtp.mailtrap.io
NODEMAILER_PORT=2525
NODEMAILER_USER=your_mailtrap_username
NODEMAILER_PASS=your_mailtrap_password
```

### Step 3: Ensure MongoDB is Running

```bash
# If using MongoDB locally:
mongod

# Or use MongoDB Atlas (cloud):
# Update MONGO_URI in .env to: mongodb+srv://user:password@cluster.mongodb.net/database
```

### Step 4: Start the Server

```bash
# Production mode
npm start

# Development mode (auto-reload)
npm run dev
```

**Expected output:**
```
╔════════════════════════════════════════════════════════╗
║                                                        ║
║     🏥 Notification System Microservice Started       ║
║                                                        ║
║     Server: http://localhost:3000                     ║
║     Environment: development                          ║
║                                                        ║
╚════════════════════════════════════════════════════════╝
```

---

## 📡 API Documentation

### 1. Health Check (No Auth Required)

```http
GET /
```

**Response:**
```json
{
  "success": true,
  "service": "Notification System",
  "version": "1.0.0",
  "status": "running",
  "timestamp": "2026-04-14T13:45:00.000Z",
  "endpoints": {
    "health": "/api/health",
    "notify": "POST /api/notify (requires JWT)",
    "logs": "GET /api/notification-logs (requires JWT)"
  }
}
```

---

### 2. Send Notification (Requires JWT)

```http
POST /api/notify
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

**Request Body:**
```json
{
  "senderSystem": "Appointment",
  "recipientEmail": "patient@hospital.com",
  "subject": "Appointment Reminder",
  "message": "Your appointment is scheduled for tomorrow at 2:00 PM with Dr. Smith."
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Notification processed successfully",
  "code": "NOTIFICATION_SENT",
  "data": {
    "logId": "507f1f77bcf86cd799439011",
    "recipientEmail": "patient@hospital.com",
    "sentAt": "2026-04-14T13:45:00.000Z",
    "senderSystem": "Appointment"
  }
}
```

**Duplicate Response (409):**
```json
{
  "success": false,
  "message": "Duplicate notification. Same message sent within last 5 minutes.",
  "code": "DUPLICATE_NOTIFICATION",
  "originalNotificationTime": "2026-04-14T13:40:00.000Z",
  "recipientEmail": "patient@hospital.com"
}
```

**Invalid Fields Response (400):**
```json
{
  "success": false,
  "message": "Missing required fields",
  "code": "MISSING_FIELDS",
  "required": ["senderSystem", "recipientEmail", "subject", "message"],
  "received": {
    "senderSystem": "Appointment",
    "recipientEmail": null,
    "subject": "Reminder",
    "message": "Your appointment..."
  }
}
```

**Unauthorized Response (401):**
```json
{
  "success": false,
  "message": "Authorization header is missing",
  "code": "MISSING_AUTH_HEADER"
}
```

**Server Error Response (500):**
```json
{
  "success": false,
  "message": "Failed to send notification email",
  "code": "EMAIL_SEND_FAILED",
  "details": "SMTP connection timeout",
  "logId": "507f1f77bcf86cd799439011"
}
```

---

### 3. Get Notification Logs (Requires JWT)

```http
GET /api/notification-logs?page=1&limit=20&status=Sent&recipientEmail=patient@hospital.com
Authorization: Bearer <JWT_TOKEN>
```

**Query Parameters:**
- `page` (optional, default: 1) - Page number for pagination
- `limit` (optional, default: 20) - Records per page
- `status` (optional) - Filter by status: `Sent` | `Failed` | `Duplicate`
- `recipientEmail` (optional) - Filter by recipient email

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "senderSystem": "Appointment",
      "recipientEmail": "patient@hospital.com",
      "subject": "Appointment Reminder",
      "message": "Your appointment is scheduled...",
      "status": "Sent",
      "errorDetails": null,
      "createdAt": "2026-04-14T13:45:00.000Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalCount": 98
  }
}
```

---

### 4. Service Health (No Auth Required)

```http
GET /api/health
```

**Response:**
```json
{
  "success": true,
  "message": "Notification service is running",
  "timestamp": "2026-04-14T13:45:00.000Z"
}
```

---

## 🧪 File-by-File Implementation

### 1. **package.json**
- **Purpose:** Project metadata and dependencies
- **Contains:** 
  - ES Modules enabled: `"type": "module"`
  - All required dependencies with versions
  - Scripts: `npm start` and `npm run dev`

### 2. **.env**
- **Purpose:** Environment variables (not committed to Git)
- **Contains:**
  - `PORT` - Server port
  - `MONGO_URI` - MongoDB connection string
  - `JWT_SECRET` - Secret for JWT verification
  - `NODEMAILER_*` - Email server credentials

### 3. **.gitignore**
- **Purpose:** Exclude files from Git tracking
- **Contains:** `node_modules/` and `.env`

### 4. **config/db.js**
- **Purpose:** Database connection management
- **Exports:**
  - `connectDB()` - Connects to MongoDB on startup
  - `disconnectDB()` - Gracefully closes connection
- **Features:**
  - Error handling with process exit
  - Console logging for debugging

### 5. **config/mailer.js**
- **Purpose:** Email sending configuration
- **Exports:**
  - `sendEmail(to, subject, text)` - Async function to send emails
  - `transporter` - Nodemailer SMTP transporter
- **Features:**
  - SMTP configured from `.env`
  - Error handling and logging

### 6. **models/NotificationLog.js**
- **Purpose:** MongoDB schema for notification logs
- **Schema fields:**
  - `senderSystem` (String, required)
  - `recipientEmail` (String, required, lowercase)
  - `subject` (String, required)
  - `message` (String, required)
  - `status` (Enum: Sent | Failed | Duplicate)
  - `errorDetails` (String, optional)
  - `createdAt` (Date, default now)
- **Indexes:** On `recipientEmail + createdAt` for fast queries

### 7. **middleware/authMiddleware.js**
- **Purpose:** JWT authentication & authorization
- **Exports:** `authMiddleware` function
- **Validates:**
  - Presence of Authorization header
  - Bearer token format
  - JWT signature using `JWT_SECRET`
- **Returns:** 401 Unauthorized if invalid

### 8. **controllers/notificationController.js**
- **Purpose:** Business logic for notifications
- **Exports:**
  - `processNotification(req, res)` - Main notification handler
  - `getNotificationLogs(req, res)` - Logs retrieval
- **processNotification logic:**
  1. Extract & validate request body
  2. Check for duplicates (5-min window)
  3. Send email via Nodemailer
  4. Log to MongoDB
  5. Handle errors gracefully
  6. TODO: Call Legacy System Adapter

### 9. **routers/notificationRoutes.js**
- **Purpose:** Express route definitions
- **Routes:**
  - `POST /api/notify` - Send notification (requires auth)
  - `GET /api/notification-logs` - Get logs (requires auth)
  - `GET /api/health` - Health check (no auth)
- **Middleware:** `authMiddleware` applied to protected routes

### 10. **app.js**
- **Purpose:** Main Express application
- **Setup:**
  - Connect to MongoDB
  - Apply middleware: CORS, JSON parsing
  - Mount routes
  - 404 handler
  - Global error handler
  - Server startup on PORT
  - Graceful shutdown handlers (SIGTERM, SIGINT)
- **Features:**
  - Root endpoint `/` with service info
  - Request logging
  - ASCII art banner on startup

---

## 🧪 Testing

### Generate a JWT Token

```bash
node -e "console.log(require('jsonwebtoken').sign({ system: 'Test' }, 'project_namin_ito_123'))"
```

**Output example:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzeXN0ZW0iOiJUZXN0IiwiaWF0IjoxNzEzMDYwMzAwfQ.abc123...
```

### Test with cURL

```bash
# Test successful notification
curl -X POST http://localhost:3000/api/notify \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzeXN0ZW0iOiJUZXN0IiwiaWF0IjoxNzEzMDYwMzAwfQ.abc123..." \
  -d '{
    "senderSystem": "Appointment",
    "recipientEmail": "patient@hospital.com",
    "subject": "Appointment Reminder",
    "message": "Your appointment is tomorrow at 2 PM"
  }'

# Test without Authorization header (should get 401)
curl -X POST http://localhost:3000/api/notify \
  -H "Content-Type: application/json" \
  -d '{...}'

# Test missing fields (should get 400)
curl -X POST http://localhost:3000/api/notify \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{
    "senderSystem": "Appointment"
  }'

# Test health check (no auth needed)
curl http://localhost:3000/

# Test service health
curl http://localhost:3000/api/health
```

### Test Duplicate Detection

1. Send first notification:
```bash
curl -X POST http://localhost:3000/api/notify \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{
    "senderSystem": "Queue",
    "recipientEmail": "test@example.com",
    "subject": "Queue Update",
    "message": "You are next in queue"
  }'
# Response: 200 OK
```

2. Send identical notification immediately:
```bash
curl -X POST http://localhost:3000/api/notify \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{
    "senderSystem": "Queue",
    "recipientEmail": "test@example.com",
    "subject": "Queue Update",
    "message": "You are next in queue"
  }'
# Response: 409 Conflict - Duplicate
```

3. After 5+ minutes, resend the same notification:
```bash
# Same request as above
# Response: 200 OK (outside the 5-minute window)
```

---

## 🔧 Troubleshooting

### Issue: `npm install` fails with version error

**Solution:** Update `package.json` with available versions
```bash
npm cache clean --force
npm install express@4.18.2 mongoose@7.5.0 nodemailer@6.9.0 dotenv@16.0.0 cors@2.8.5 jsonwebtoken@9.0.0
```

### Issue: `Cannot find module 'dotenv'`

**Solution:** Ensure `.env` file is in root directory and environment variables are loaded
```javascript
import 'dotenv/config'; // Must be at the top of app.js
```

### Issue: MongoDB connection fails

**Check:**
1. MongoDB service is running: `mongod` or MongoDB Atlas connection
2. `MONGO_URI` in `.env` is correct
3. Database name exists in MongoDB
4. Network connectivity to MongoDB

**Solution:**
```bash
# Test MongoDB connection
mongo "mongodb://localhost:27017/hospital-management-db"
# or
mongo "mongodb+srv://user:password@cluster.mongodb.net/database"
```

### Issue: Email not sending

**Check:**
1. Mailtrap/SMTP credentials in `.env` are correct
2. `NODEMAILER_PORT` matches service (usually 587 for TLS, 465 for SSL)
3. Email format is valid
4. Check Mailtrap inbox/spam folder

**Solution:**
```bash
# Test email configuration
node -e "
import mailer from './config/mailer.js';
const info = await mailer.sendEmail('test@example.com', 'Test', 'Hello');
console.log(info);
"
```

### Issue: 401 Unauthorized on `/api/notify`

**Check:**
1. Authorization header is present: `Authorization: Bearer <TOKEN>`
2. Token is valid JWT signed with `JWT_SECRET`
3. Token format is correct: `Bearer <token>` (with space)

**Solution:**
```bash
# Generate valid token
node -e "console.log(require('jsonwebtoken').sign({ system: 'Test' }, 'project_namin_ito_123'))"

# Use in request
curl -X POST http://localhost:3000/api/notify \
  -H "Authorization: Bearer <GENERATED_TOKEN>" \
  ...
```

### Issue: 400 Bad Request - Missing fields

**Check:** All required fields in request body:
- `senderSystem` (String)
- `recipientEmail` (valid email)
- `subject` (String)
- `message` (String)

**Solution:**
```bash
curl -X POST http://localhost:3000/api/notify \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{
    "senderSystem": "Appointment",
    "recipientEmail": "patient@hospital.com",
    "subject": "Reminder",
    "message": "Your appointment..."
  }'
```

### Issue: Port 3000 already in use

**Solution:**
```bash
# Use different port
PORT=3001 npm start

# Or kill process using port 3000
lsof -i :3000
kill -9 <PID>
```

---

## 🚀 Future Enhancements

1. **Legacy System Adapter** - Implement `adapters/legacySystemAdapter.js` and uncomment TODO in controller
2. **Real Auth Integration** - Replace JWT middleware with Auth System microservice call
3. **Email Templates** - Support HTML email templates instead of plain text
4. **Notification Scheduling** - Add scheduled notifications (send at specific time)
5. **Multi-channel Notifications** - Add SMS, Push notifications alongside email
6. **Retry Logic** - Implement exponential backoff for failed emails
7. **Rate Limiting** - Prevent spam by limiting requests per sender
8. **Webhook Notifications** - Notify third-party systems of delivery status
9. **Testing Suite** - Add Jest tests for controllers and middleware
10. **API Documentation** - Generate Swagger/OpenAPI documentation

---

## 👥 Team Members

This microservice was developed as part of the Hospital Management System group project.

**System Developer:** [Your Name]  
**Project Date:** April 14, 2026  
**Version:** 1.0.0

---

## 📝 License

MIT License - Hospital Management System Project

---

## ✅ Compliance Checklist

- ✅ Functional Requirement 1: Accept POST requests from other systems
- ✅ Functional Requirement 2: Send emails via Nodemailer
- ✅ Functional Requirement 3: Create MongoDB logs for every notification
- ✅ Functional Requirement 4: Prevent duplicates within 5-minute window
- ✅ Functional Requirement 5: Enforce JWT authorization
- ✅ Integration Requirement: Uses temporary JWT (ready for Auth System)
- ✅ Constraint 1: System is independent (own DB, server, error handling)
- ✅ Constraint 2: Graceful error handling for failed integrations
- ✅ Constraint 3: Hook for Legacy System updates (TODO placeholder)

---

**Last Updated:** April 14, 2026  
**Status:** ✅ Production Ready
