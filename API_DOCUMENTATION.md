# Multi-Tenant Lead Management CRM SaaS - API Documentation

All API requests must submit JSON bodies. Protected routes expect authentication via standard HttpOnly cookies (`accessToken`) or a `Bearer` Token in the `Authorization` header.

---

## 1. Authentication Module

### Login User
- **Endpoint:** `POST /api/auth/login`
- **Payload:**
  ```json
  {
    "email": "admin@acme.com",
    "password": "admin123"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "message": "Login successful.",
    "user": {
      "id": 2,
      "name": "Acme Admin",
      "email": "admin@acme.com",
      "role": "company_admin",
      "companyId": 1,
      "companyName": "Acme Corporates"
    }
  }
  ```
  *(Also sets HttpOnly cookies: `accessToken` and `refreshToken`)*

---

### Fetch Active Session Context
- **Endpoint:** `GET /api/auth/me`
- **Response (200 OK):**
  ```json
  {
    "user": {
      "id": 2,
      "name": "Acme Admin",
      "email": "admin@acme.com",
      "role": "company_admin",
      "companyId": 1,
      "companyName": "Acme Corporates",
      "avatar": null,
      "phone": null
    }
  }
  ```

---

### Refresh Access Token
- **Endpoint:** `POST /api/auth/refresh`
- **Cookie Requirement:** Expects valid `refreshToken` cookie.
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Token refreshed."
  }
  ```
  *(Sets a new short-lived `accessToken` cookie)*

---

### Logout Session
- **Endpoint:** `POST /api/auth/logout`
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Logged out successfully."
  }
  ```
  *(Clears `accessToken` and `refreshToken` cookies)*

---

## 2. Lead Management API

### List Leads (Filtered & Paginated)
- **Endpoint:** `GET /api/leads`
- **Query Parameters:**
  - `page` (default `1`)
  - `limit` (default `10`)
  - `search` (matches first/last name, subject, email, phone)
  - `status` (filter by stage name)
  - `source` (filter by channel)
  - `priority` (`Low`, `Medium`, `High`)
  - `assignedTo` (User ID number)
  - `startDate` / `endDate` (ISO date bounds)
- **Response (200 OK):**
  ```json
  {
    "leads": [
      {
        "id": 1,
        "company_id": 1,
        "assigned_to": 3,
        "source": "Contact Form",
        "first_name": "John",
        "last_name": "Doe",
        "email": "john.doe@example.com",
        "phone": "+1 415 555 2671",
        "subject": "Roof Repair Inquiry",
        "message": "Hi, I need a quick quote for repairing a roof leak...",
        "status": "New",
        "priority": "High",
        "lead_score": 80,
        "follow_up_date": null,
        "created_at": "2026-06-08T08:00:00.000Z",
        "updated_at": "2026-06-08T08:00:00.000Z",
        "AssignedUser": {
          "id": 3,
          "name": "Acme Representative",
          "email": "staff@acme.com",
          "avatar": null
        }
      }
    ],
    "totalCount": 1,
    "totalPages": 1,
    "currentPage": 1
  }
  ```

---

### Create Lead (Manual)
- **Endpoint:** `POST /api/leads`
- **Payload:**
  ```json
  {
    "first_name": "Bruce",
    "last_name": "Wayne",
    "email": "bruce@waynecorp.com",
    "phone": "+1 650 555 9811",
    "subject": "Security System Consult",
    "source": "Manual",
    "status": "New",
    "priority": "High"
  }
  ```
- **Response (210 Created):**
  ```json
  {
    "success": true,
    "message": "Lead created successfully.",
    "lead": { "id": 3, "first_name": "Bruce", "company_id": 1 ... }
  }
  ```

---

### Update Lead Fields (Single Update)
- **Endpoint:** `PUT /api/leads/[id]`
- **Payload:**
  ```json
  {
    "status": "Qualified",
    "assigned_to": 3,
    "priority": "High"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Lead updated successfully.",
    "lead": { "id": 1, "status": "Qualified", "assigned_to": 3 ... }
  }
  ```

---

### Bulk Update Leads
- **Endpoint:** `POST /api/leads/bulk`
- **Payload Examples:**
  - **Bulk Assign:**
    ```json
    {
      "action": "assign",
      "leadIds": [1, 2, 3],
      "assignedTo": 3
    }
    ```
  - **Bulk Status Update:**
    ```json
    {
      "action": "update_status",
      "leadIds": [1, 2],
      "status": "Qualified"
    }
    ```
  - **Bulk Delete:**
    ```json
    {
      "action": "delete",
      "leadIds": [1, 2]
    }
    ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Successfully assigned 3 leads to Acme Representative."
  }
  ```

---

## 3. WordPress Integration API

Processes submissions from external website contact forms.

- **Endpoint:** `POST /api/leads/create`
- **Header:** `Authorization: Bearer <API_KEY>`
- **Payload:**
  ```json
  {
    "name": "Jane Miller",
    "email": "jane@example.com",
    "phone": "+1 202 555 0143",
    "subject": "Siding Quote Request",
    "message": "Please call me back regarding siding materials.",
    "source": "Website Contact Form"
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "success": true,
    "message": "Lead received successfully.",
    "lead_id": 14
  }
  ```

---

## 4. Reports & Analytics API

Generates aggregates for charting metrics.

- **Endpoint:** `GET /api/reports`
- **Response (200 OK):**
  ```json
  {
    "summary": {
      "totalLeads": 15,
      "newLeads": 4,
      "qualifiedLeads": 3,
      "convertedLeads": 6,
      "lostLeads": 2,
      "followupsToday": 1,
      "conversionRate": 40
    },
    "charts": {
      "leadsByMonth": [
        { "month": "Jun 2026", "count": 15, "converted": 6 }
      ],
      "leadsBySource": [
        { "name": "Contact Form", "value": 10 },
        { "name": "Google Ads", "value": 5 }
      ],
      "leadPipeline": [
        { "name": "New", "value": 4 },
        { "name": "Qualified", "value": 3 }
      ],
      "teamPerformance": [
        { "name": "Acme Representative", "leads": 8, "converted": 4, "conversionRate": 50 }
      ]
    }
  }
  ```
