# 📡 Campus Connect Backend — API Documentation

**Base URL:** `http://localhost:3000/api/v1`

**Authentication:** All endpoints (except login) require `Authorization: Bearer <token>` header.

---

## 🔐 Auth

### POST `/auth/login`

> **Access:** Public (no token required)

**Request Body:**
```json
{
  "email": "admin@campusconnect.com",
  "password": "Admin@123"
}
```

> **Note:** Login does not require a college code. You can log in via email and password alone.

**Success Response (200):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid-here",
    "name": "Dr. Ramesh Kumar",
    "email": "ramesh@abcengg.edu",
    "role": "HOD",
    "isTutor": false,
    "collegeId": "college-uuid",
    "departmentId": "dept-uuid",
    "isActive": true,
    "mustChangePassword": false,
    "createdAt": "2026-05-07T08:00:00.000Z",
    "department": {
      "id": "dept-uuid",
      "name": "Computer Science"
    }
  }
}
```

> **Note:** `department` will be `null` for `SUPER_ADMIN` users since they are not associated with any department.


**Error Response (401):**
```json
{
  "message": "Invalid credentials",
  "error": "Unauthorized",
  "statusCode": 401
}
```

---

### POST `/auth/change-password`

> **Access:** Any authenticated user

**Headers:** `Authorization: Bearer <token>`

> **Note:** You do NOT need to send the user's `id` in the payload. The backend securely extracts the `userId` directly from the provided JWT Bearer token to ensure users can only change their own passwords.

**Request Body:**
```json
{
  "currentPassword": "Admin@123",
  "newPassword": "NewSecure@456"
}
```

**Success Response (201):**
```json
{
  "message": "Password changed successfully"
}
```

**Error Response (400):**
```json
{
  "message": "Current password is incorrect",
  "error": "Bad Request",
  "statusCode": 400
}
```

---

## 🏫 Colleges

### POST `/colleges`

> **Access:** SUPER_ADMIN only

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "name": "ABC Engineering College",
  "emailAddress": "info@abcengg.edu",
  "collegeCode": "ABCENGG",
  "city": "Chennai",
  "state": "Tamil Nadu"
}
```

**Success Response (201):**
```json
{
  "id": "uuid-here",
  "name": "ABC Engineering College",
  "emailAddress": "info@abcengg.edu",
  "collegeCode": "ABCENGG",
  "city": "Chennai",
  "state": "Tamil Nadu",
  "createdAt": "2026-04-29T08:00:00.000Z"
}
```

**Error Response (409):**
```json
{
  "message": "College with code \"ABCENGG\" already exists",
  "error": "Conflict",
  "statusCode": 409
}
```

---

### GET `/colleges?page=1&limit=10`

> **Access:** SUPER_ADMIN only

**Success Response (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "ABC Engineering College",
      "emailAddress": "info@abcengg.edu",
      "collegeCode": "ABCENGG",
      "city": "Chennai",
      "state": "Tamil Nadu",
      "createdAt": "2026-04-29T08:00:00.000Z"
    }
  ],
  "meta": {
    "total": 1,
    "page": 1,
    "limit": 10
  }
}
```

---

### PATCH `/colleges/:id`

> **Access:** SUPER_ADMIN only

**Request Body (partial):**
```json
{
  "name": "Updated College Name",
  "city": "Bangalore"
}
```

**Success Response (200):**
```json
{
  "id": "uuid",
  "name": "Updated College Name",
  "emailAddress": "info@abcengg.edu",
  "collegeCode": "ABCENGG",
  "city": "Bangalore",
  "state": "Tamil Nadu",
  "updatedAt": "2026-04-29T09:00:00.000Z"
}
```

---

## 🏛️ Departments

### POST `/departments`

> **Access:** SUPER_ADMIN only

**Request Body:**
```json
{
  "collegeId": "college-uuid",
  "name": "Computer Science and Engineering"
}
```

**Success Response (201):**
```json
{
  "id": "dept-uuid",
  "name": "Computer Science and Engineering",
  "collegeId": "college-uuid"
}
```

---

### GET `/departments?collegeId=<uuid>&page=1&limit=10`

> **Access:** SUPER_ADMIN only

**Success Response (200):**
```json
{
  "data": [
    { "id": "dept-uuid", "name": "Computer Science and Engineering", "collegeId": "college-uuid" }
  ],
  "meta": { "total": 1, "page": 1, "limit": 10 }
}
```

---

### PATCH `/departments/:id`

> **Access:** SUPER_ADMIN only
> **Purpose:** Updates an existing department's details.

**Request Body (partial):**
```json
{
  "name": "CSE & IT"
}
```

**Success Response (200):**
```json
{
  "id": "dept-uuid",
  "name": "CSE & IT",
  "collegeId": "college-uuid"
}
```

---

### POST `/hods`

> **Access:** SUPER_ADMIN only
> **Purpose:** Creates a user with role=HOD and assigns them to a department

**Request Body:**
```json
{
  "name": "Dr. Ramesh Kumar",
  "email": "ramesh@abcengg.edu",
  "password": "Hod@12345",
  "collegeId": "college-uuid",
  "departmentId": "dept-uuid"
}
```

**Success Response (201):**
```json
{
  "id": "user-uuid",
  "name": "Dr. Ramesh Kumar",
  "email": "ramesh@abcengg.edu",
  "role": "HOD",
  "isTutor": false,
  "departmentId": "dept-uuid",
  "isActive": true,
  "createdAt": "2026-04-29T08:00:00.000Z"
}
```

---

### PATCH `/hods/:id`

> **Access:** SUPER_ADMIN only
> **Purpose:** Updates an existing HOD's details.

**Request Body (partial):**
```json
{
  "name": "Dr. Ramesh K",
  "isActive": false
}
```

**Success Response (200):**
```json
{
  "id": "user-uuid",
  "name": "Dr. Ramesh K",
  "email": "ramesh@abcengg.edu",
  "role": "HOD",
  "isTutor": false,
  "departmentId": "dept-uuid",
  "isActive": false
}
```

---

## 👨‍🏫 Staff

### POST `/staff`

> **Access:** HOD only (scoped to their college + department)

**Request Body:**
```json
{
  "name": "Prof. Suresh",
  "email": "suresh@abcengg.edu",
  "isTutor": false
}
```

> **Note:** Default password = email prefix + `@123` (e.g., `suresh@123`). Must be changed on first login.

**Success Response (201):**
```json
{
  "id": "staff-uuid",
  "name": "Prof. Suresh",
  "email": "suresh@abcengg.edu",
  "role": "STAFF",
  "isTutor": false,
  "departmentId": "dept-uuid",
  "isActive": true,
  "createdAt": "2026-04-29T08:00:00.000Z"
}
```

---

### GET `/staff?page=1&limit=10`

> **Access:** HOD only

**Success Response (200):**
```json
{
  "data": [
    {
      "id": "staff-uuid",
      "name": "Prof. Suresh",
      "email": "suresh@abcengg.edu",
      "isTutor": false,
      "isActive": true,
      "createdAt": "2026-04-29T08:00:00.000Z"
    }
  ],
  "meta": { "total": 1, "page": 1, "limit": 10 }
}
```

---

### PATCH `/staff/:id`

> **Access:** HOD only

**Request Body (partial):**
```json
{
  "name": "Prof. Suresh M",
  "isTutor": true
}
```

**Success Response (200):**
```json
{
  "id": "staff-uuid",
  "name": "Prof. Suresh M",
  "email": "suresh@abcengg.edu",
  "isTutor": true,
  "isActive": true
}
```

---

### PATCH `/staff/:id/deactivate`

> **Access:** HOD only
> **Note:** Soft delete — sets `is_active = false`. No request body needed.

**Success Response (200):**
```json
{
  "message": "Staff member deactivated"
}
```

---

## 📦 Batches

### POST `/batches`

> **Access:** HOD only

**Request Body:**
```json
{
  "name": "CSE 2023-2027 A",
  "startYear": 2023,
  "endYear": 2027
}
```

**Success Response (201):**
```json
{
  "id": "batch-uuid",
  "name": "CSE 2023-2027 A",
  "departmentId": "dept-uuid",
  "startYear": 2023,
  "endYear": 2027,
  "tutorId": null
}
```

---

### GET `/batches?page=1&limit=10`

> **Access:** HOD only

**Success Response (200):**
```json
{
  "data": [
    {
      "id": "batch-uuid",
      "name": "CSE 2023-2027 A",
      "startYear": 2023,
      "endYear": 2027,
      "tutorId": "staff-uuid",
      "tutor": { "id": "staff-uuid", "name": "Prof. Suresh", "email": "suresh@abcengg.edu" },
      "_count": { "students": 60 }
    }
  ],
  "meta": { "total": 1, "page": 1, "limit": 10 }
}
```

---

### PATCH `/batches/:id/assign-tutor`

> **Access:** HOD only

**Request Body:**
```json
{
  "staffId": "staff-uuid"
}
```

**Success Response (200):**
```json
{
  "message": "Tutor assigned successfully"
}
```

---

## 🎓 Students

### POST `/students`

> **Access:** STAFF with `isTutor = true` (must be assigned tutor of the batch)

**Request Body:**
```json
{
  "name": "Mohammed Saif",
  "email": "saif@student.abcengg.edu",
  "registerNumber": "2023CSE001",
  "dob": "15062005",
  "batchId": "batch-uuid"
}
```

> **Note:** Default password = DOB value (`15062005`), hashed. Must be changed on first login.

**Success Response (201):**
```json
{
  "id": "user-uuid",
  "name": "Mohammed Saif",
  "email": "saif@student.abcengg.edu",
  "role": "STUDENT",
  "isTutor": false,
  "departmentId": null,
  "isActive": true,
  "createdAt": "2026-04-29T08:00:00.000Z",
  "student": {
    "id": "student-uuid",
    "registerNumber": "2023CSE001",
    "batchId": "batch-uuid"
  }
}
```

---

### GET `/students?batchId=<uuid>&page=1&limit=10`

> **Access:** STAFF (tutor of batch) or HOD

**Success Response (200):**
```json
{
  "data": [
    {
      "id": "student-uuid",
      "registerNumber": "2023CSE001",
      "batchId": "batch-uuid",
      "user": {
        "id": "user-uuid",
        "name": "Mohammed Saif",
        "email": "saif@student.abcengg.edu",
        "isActive": true
      }
    }
  ],
  "meta": { "total": 60, "page": 1, "limit": 10 }
}
```

---

## 📚 Subjects

### POST `/subjects`

> **Access:** STAFF only

**Request Body:**
```json
{
  "name": "Data Structures",
  "subjectCode": "CS201",
  "departmentId": "dept-uuid"
}
```

**Success Response (201):**
```json
{
  "id": "subject-uuid",
  "name": "Data Structures",
  "subjectCode": "CS201",
  "departmentId": "dept-uuid"
}
```

---

### GET `/subjects?page=1&limit=10`

> **Access:** STAFF or HOD

**Success Response (200):**
```json
{
  "data": [
    { "id": "subject-uuid", "name": "Data Structures", "subjectCode": "CS201", "departmentId": "dept-uuid" }
  ],
  "meta": { "total": 1, "page": 1, "limit": 10 }
}
```

---

### POST `/subjects/assign`

> **Access:** STAFF or HOD

**Request Body:**
```json
{
  "subjectId": "subject-uuid",
  "batchId": "batch-uuid",
  "staffId": "staff-uuid"
}
```

**Success Response (201):**
```json
{
  "message": "Subject assigned successfully"
}
```

---

## 📅 Timetable

### POST `/timetable`

> **Access:** STAFF with `isTutor = true` (must be tutor of the batch)

**Request Body:**
```json
{
  "batchId": "batch-uuid",
  "slots": [
    {
      "day": "MONDAY",
      "startTime": "09:00",
      "endTime": "10:00",
      "type": "SUBJECT",
      "subjectId": "subject-uuid",
      "staffId": "staff-uuid"
    },
    {
      "day": "MONDAY",
      "startTime": "10:00",
      "endTime": "10:15",
      "type": "BREAK"
    },
    {
      "day": "MONDAY",
      "startTime": "12:30",
      "endTime": "13:30",
      "type": "LUNCH"
    }
  ]
}
```

> **Enums:** `day` = MONDAY | TUESDAY | WEDNESDAY | THURSDAY | FRIDAY | SATURDAY | SUNDAY
> `type` = SUBJECT | BREAK | LUNCH
> `subjectId` and `staffId` are required only when `type` = SUBJECT

**Success Response (201):**
```json
{
  "message": "Timetable updated successfully"
}
```

---

### GET `/timetable/:batchId`

> **Access:** Any authenticated user in the same college

**Success Response (200):**
```json
{
  "batchId": "batch-uuid",
  "slots": [
    {
      "id": "slot-uuid",
      "day": "MONDAY",
      "startTime": "09:00",
      "endTime": "10:00",
      "type": "SUBJECT",
      "subject": { "id": "subject-uuid", "name": "Data Structures", "subjectCode": "CS201" },
      "staff": { "id": "staff-uuid", "name": "Prof. Suresh" }
    },
    {
      "id": "slot-uuid",
      "day": "MONDAY",
      "startTime": "10:00",
      "endTime": "10:15",
      "type": "BREAK",
      "subject": null,
      "staff": null
    }
  ]
}
```

---

## 📝 OD Requests

### POST `/od-requests`

> **Access:** STUDENT only

**Request Body:**
```json
{
  "subject": "Hackathon - Smart India Hackathon",
  "description": "Participating in SIH 2026 at IIT Delhi from May 1-3"
}
```

**Success Response (201):**
```json
{
  "id": "od-uuid",
  "subject": "Hackathon - Smart India Hackathon",
  "description": "Participating in SIH 2026 at IIT Delhi from May 1-3",
  "status": "PENDING_TUTOR",
  "currentLevel": "TUTOR",
  "createdAt": "2026-04-29T08:00:00.000Z"
}
```

---

### GET `/od-requests?page=1&limit=10`

> **Access:** All roles (filtered by role)
> - STUDENT → own requests only
> - STAFF (tutor) → PENDING_TUTOR requests for their batches
> - HOD → PENDING_HOD requests for their department
> - SUPER_ADMIN → all requests

**Success Response (200):**
```json
{
  "data": [
    {
      "id": "od-uuid",
      "subject": "Hackathon - Smart India Hackathon",
      "description": "Participating in SIH 2026...",
      "status": "PENDING_TUTOR",
      "currentLevel": "TUTOR",
      "createdAt": "2026-04-29T08:00:00.000Z",
      "student": {
        "registerNumber": "2023CSE001",
        "user": { "name": "Mohammed Saif", "email": "saif@student.abcengg.edu" }
      },
      "batch": { "id": "batch-uuid", "name": "CSE 2023-2027 A" },
      "approvals": []
    }
  ],
  "meta": { "total": 1, "page": 1, "limit": 10 }
}
```

---

### PATCH `/od-requests/:id/approve`

> **Access:** STAFF (tutor) or HOD
> **State machine:** PENDING_TUTOR → PENDING_HOD → APPROVED

**Request Body:**
```json
{
  "remark": "Approved. Good luck at the hackathon!"
}
```

**Success Response (200):**
```json
{
  "id": "od-uuid",
  "status": "PENDING_HOD",
  "currentLevel": "HOD"
}
```

---

### PATCH `/od-requests/:id/reject`

> **Access:** STAFF (tutor) or HOD
> **State machine:** PENDING_TUTOR → REJECTED_BY_TUTOR, PENDING_HOD → REJECTED_BY_HOD

**Request Body:**
```json
{
  "remark": "Insufficient documentation provided"
}
```

**Success Response (200):**
```json
{
  "id": "od-uuid",
  "status": "REJECTED_BY_TUTOR",
  "currentLevel": "TUTOR"
}
```

**Error Response (400) — Invalid state transition:**
```json
{
  "message": "Cannot approve request with status \"REJECTED_BY_TUTOR\"",
  "error": "Bad Request",
  "statusCode": 400
}
```

---

## 🔔 Notifications

### GET `/notifications?page=1&limit=10`

> **Access:** Any authenticated user

**Success Response (200):**
```json
{
  "data": [
    {
      "id": "notif-uuid",
      "title": "New OD Request",
      "message": "Student submitted an OD request for \"Hackathon\"",
      "isRead": false,
      "createdAt": "2026-04-29T08:00:00.000Z"
    }
  ],
  "meta": { "total": 1, "page": 1, "limit": 10 }
}
```

---

### PATCH `/notifications/:id/read`

> **Access:** Any authenticated user (only their own notifications)

**Success Response (200):**
```json
{
  "message": "Notification marked as read"
}
```

---

## 📤 Bulk Upload

### POST `/bulk-upload/staff/preview`

> **Access:** HOD only
> **Content-Type:** `multipart/form-data`

**Request:** Upload a CSV file with field name `file`

**CSV Format:**
```
name,email,is_tutor
Prof. Alice,alice@college.edu,false
Prof. Bob,bob@college.edu,true
```

**Success Response (201):**
```json
{
  "totalRows": 2,
  "validRows": 2,
  "errors": [],
  "preview": [
    { "name": "Prof. Alice", "email": "alice@college.edu", "is_tutor": "false" },
    { "name": "Prof. Bob", "email": "bob@college.edu", "is_tutor": "true" }
  ]
}
```

**Response with errors:**
```json
{
  "totalRows": 3,
  "validRows": 1,
  "errors": [
    { "row": 3, "field": "email", "message": "Missing required field \"email\"" },
    { "row": 4, "field": "email", "message": "Email \"alice@college.edu\" already exists in this college" }
  ],
  "preview": [...]
}
```

---

### POST `/bulk-upload/staff/confirm`

> **Access:** HOD only
> **Content-Type:** `multipart/form-data`

Same CSV file as preview. Returns error if validation fails, otherwise inserts all rows.

**Success Response (201):**
```json
{
  "message": "2 staff members created successfully",
  "count": 2
}
```

---

### POST `/bulk-upload/students/preview`

> **Access:** HOD only
> **Content-Type:** `multipart/form-data`

**CSV Format:**
```
name,email,register_number,dob,batch_id
John Doe,john@student.edu,2023CSE001,01012005,batch-uuid-here
Jane Smith,jane@student.edu,2023CSE002,15032005,batch-uuid-here
```

**Success Response (201):** Same format as staff preview.

---

### POST `/bulk-upload/students/confirm`

> **Access:** HOD only

**Success Response (201):**
```json
{
  "message": "2 students created successfully",
  "count": 2
}
```

---

## ❌ Common Error Responses

### 401 Unauthorized (missing or invalid token)
```json
{
  "message": "Unauthorized",
  "statusCode": 401
}
```

### 403 Forbidden (wrong role)
```json
{
  "message": "Forbidden resource",
  "error": "Forbidden",
  "statusCode": 403
}
```

### 400 Bad Request (validation failed)
```json
{
  "message": ["name must be a string", "email must be an email"],
  "error": "Bad Request",
  "statusCode": 400
}
```

### 404 Not Found
```json
{
  "message": "Staff member not found in your department",
  "error": "Not Found",
  "statusCode": 404
}
```

### 409 Conflict (duplicate)
```json
{
  "message": "Email already exists in this college",
  "error": "Conflict",
  "statusCode": 409
}
```

---

## 🔄 OD Workflow State Machine

```
PENDING_TUTOR ──(tutor approves)──→ PENDING_HOD ──(HOD approves)──→ APPROVED
      │                                   │
      └──(tutor rejects)──→ REJECTED_BY_TUTOR    └──(HOD rejects)──→ REJECTED_BY_HOD
```

**Allowed transitions ONLY:**
| Current Status | Action | New Status |
|---------------|--------|------------|
| PENDING_TUTOR | APPROVE | PENDING_HOD |
| PENDING_TUTOR | REJECT | REJECTED_BY_TUTOR |
| PENDING_HOD | APPROVE | APPROVED |
| PENDING_HOD | REJECT | REJECTED_BY_HOD |

Any other transition → `400 Bad Request`

---

## 👤 Role Permissions Summary

| Endpoint | SUPER_ADMIN | HOD | STAFF | STUDENT |
|----------|:-----------:|:---:|:-----:|:-------:|
| POST /colleges | ✅ | ❌ | ❌ | ❌ |
| GET /colleges | ✅ | ❌ | ❌ | ❌ |
| POST /departments | ✅ | ❌ | ❌ | ❌ |
| POST /hods | ✅ | ❌ | ❌ | ❌ |
| POST /staff | ❌ | ✅ | ❌ | ❌ |
| GET /staff | ❌ | ✅ | ❌ | ❌ |
| POST /batches | ❌ | ✅ | ❌ | ❌ |
| PATCH /batches/:id/assign-tutor | ❌ | ✅ | ❌ | ❌ |
| POST /students | ❌ | ❌ | ✅ (tutor) | ❌ |
| POST /subjects | ❌ | ❌ | ✅ | ❌ |
| POST /timetable | ❌ | ❌ | ✅ (tutor) | ❌ |
| POST /od-requests | ❌ | ❌ | ❌ | ✅ |
| GET /od-requests | ✅ | ✅ | ✅ (tutor) | ✅ |
| PATCH /od-requests/:id/approve | ❌ | ✅ | ✅ (tutor) | ❌ |
| POST /bulk-upload/* | ❌ | ✅ | ❌ | ❌ |
| GET /notifications | ✅ | ✅ | ✅ | ✅ |

---

## 🚀 Quick Start

```bash
# 1. Login as SUPER_ADMIN
POST /auth/login  →  { "collegeCode": "PLATFORM", "email": "admin@campusconnect.com", "password": "Admin@123" }

# 2. Create a college
POST /colleges  →  { "name": "...", "collegeCode": "MYCODE", ... }

# 3. Create a department
POST /departments  →  { "collegeId": "...", "name": "CSE" }

# 4. Create HOD for the department
POST /hods  →  { "name": "...", "email": "...", "password": "...", "collegeId": "...", "departmentId": "..." }

# 5. Login as HOD
POST /auth/login  →  { "collegeCode": "MYCODE", "email": "hod@...", "password": "..." }

# 6. Create staff, batches, assign tutors...
# 7. Login as tutor, create students, timetable, subjects...
# 8. Login as student, create OD requests...
# 9. Login as tutor, approve OD → Login as HOD, approve OD → DONE!
```
