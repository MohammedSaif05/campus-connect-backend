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
    "batch": null,
    "department": {
      "id": "dept-uuid",
      "name": "Computer Science"
    }
  }
}
```

> **`batch` field rules:**
> - `HOD` / `SUPER_ADMIN` → `null`
> - `STAFF` (tutor) → batch object of the batch they tutor, or `null` if not assigned
> - `STUDENT` → batch object of their enrolled batch
>
> **Batch object shape:** `{ id, name, startYear, endYear, currentSemester, isPassedOut }`

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

## 👤 User Profile

### GET `/users/me`

> **Access:** Any authenticated user

**Headers:** `Authorization: Bearer <token>`

**Success Response (200):**
```json
{
  "id": "uuid-here",
  "name": "Dr. Ramesh Kumar",
  "email": "ramesh@abcengg.edu",
  "role": "HOD",
  "isTutor": false,
  "departmentId": "dept-uuid",
  "isActive": true,
  "profileImageUrl": "https://r2.campusconnect.com/profiles/uuid-here.jpg",
  "phoneNumber": "9876543210",
  "bio": "Head of Computer Science Department",
  "department": {
    "id": "dept-uuid",
    "name": "Computer Science"
  },
  "college": {
    "id": "college-uuid",
    "name": "ABC Engineering College"
  }
}
```

---

### PATCH `/users/me`

> **Access:** Any authenticated user
> **Content-Type:** `multipart/form-data`

**Headers:** `Authorization: Bearer <token>`

**Request Body (FormData):**
- `name` (string, optional)
- `phoneNumber` (string, optional)
- `bio` (string, optional)
- `file` (file, optional) - Profile picture image

**Success Response (200):**
```json
{
  "id": "uuid-here",
  "name": "Dr. Ramesh Kumar Updated",
  "email": "ramesh@abcengg.edu",
  "role": "HOD",
  "profileImageUrl": "https://r2.campusconnect.com/profiles/uuid-here.jpg",
  "phoneNumber": "9876543210",
  "bio": "Head of Computer Science Department"
}
```

---

### PATCH `/users/me/password`

> **Access:** Any authenticated user

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "currentPassword": "OldPassword123",
  "newPassword": "NewSecurePassword456"
}
```

**Success Response (200):**
```json
{
  "message": "Password updated successfully"
}
```

**Error Response (400):**
```json
{
  "message": "Incorrect current password",
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

### GET `/staff?page=1&limit=10&search=suresh&isActive=true`

> **Access:** HOD only

**Query Parameters:**

| Param | Type | Required | Description |
|---|---|---|---|
| `page` | number | No | Page number (default: 1) |
| `limit` | number | No | Items per page (default: 10, max: 100) |
| `search` | string | No | Filter by name or email (case-insensitive, partial match) |
| `isActive` | boolean | No | `true` = active staff (default), `false` = deactivated staff |

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
  "meta": {
    "total": 1,
    "page": 1,
    "limit": 10
  }
}
```


---

### GET `/staff/:id`

> **Access:** HOD only

**Success Response (200):**
```json
{
  "id": "staff-uuid",
  "name": "Prof. Suresh",
  "email": "suresh@abcengg.edu",
  "isTutor": false,
  "isActive": true,
  "mustChangePassword": false,
  "createdAt": "2026-04-29T08:00:00.000Z",
  "department": {
    "id": "dept-uuid",
    "name": "Computer Science"
  }
}
```

**Error Response (404):**
```json
{
  "message": "Staff member not found in your department",
  "error": "Not Found",
  "statusCode": 404
}
```

---

### PATCH `/staff/:id`

> **Access:** HOD only

**Request Body (all fields optional — send only what you want to change):**
```json
{
  "name": "Prof. Suresh M",
  "email": "suresh.m@abcengg.edu",
  "isTutor": true
}
```

**Success Response (200):**
```json
{
  "id": "staff-uuid",
  "name": "Prof. Suresh M",
  "email": "suresh.m@abcengg.edu",
  "isTutor": true,
  "isActive": true,
  "mustChangePassword": false,
  "createdAt": "2026-04-29T08:00:00.000Z",
  "department": {
    "id": "dept-uuid",
    "name": "Computer Science"
  }
}
```

**Error Response (400) — editing a deactivated staff:**
```json
{
  "message": "Cannot edit a deactivated staff member. Activate them first.",
  "error": "Bad Request",
  "statusCode": 400
}
```

**Error Response (409) — email already in use:**
```json
{
  "message": "Email already exists in this college",
  "error": "Conflict",
  "statusCode": 409
}
```


---

### PATCH `/staff/:id/deactivate`

> **Access:** HOD only
> **Note:** Soft delete — sets `isActive = false`. No request body needed.

**Success Response (200):**
```json
{
  "message": "Staff member deactivated"
}
```

---

### PATCH `/staff/:id/activate`

> **Access:** HOD only
> **Note:** Re-activates a previously deactivated staff member. No request body needed.

**Success Response (200):**
```json
{
  "message": "Staff member activated"
}
```

**Error Response (404) — staff not found or already active:**
```json
{
  "message": "Deactivated staff member not found in your department",
  "error": "Not Found",
  "statusCode": 404
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
  "endYear": 2027,
  "currentSemester": 1
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
  "currentSemester": 1,
  "tutorId": null
}
```

---

### GET `/batches?page=1&limit=10&search=CSE&isPassedOut=false`

> **Access:** HOD only

**Query Parameters:**

| Param | Type | Required | Description |
|---|---|---|---|
| `page` | number | No | Page number (default: 1) |
| `limit` | number | No | Items per page (default: 10, max: 100) |
| `search` | string | No | Filter by batch name (case-insensitive, partial match) |
| `isPassedOut` | boolean | No | `false` = active batches (default), `true` = passed-out batches |

**Success Response (200):**
```json
{
  "data": [
    {
      "id": "batch-uuid",
      "name": "CSE 2023-2027 A",
      "startYear": 2023,
      "endYear": 2027,
      "currentSemester": 2,
      "isPassedOut": false,
      "tutorId": "staff-uuid",
      "tutor": { "id": "staff-uuid", "name": "Prof. Suresh", "email": "suresh@abcengg.edu" },
      "_count": { "students": 60 }
    }
  ],
  "meta": { "total": 1, "page": 1, "limit": 10 }
}
```

---

### GET `/batches/:id`

> **Access:** HOD only

Returns complete details of a single batch including tutor info, department, subject assignments (with the teaching staff for each subject), and all staff-batch mappings.

**Success Response (200):**
```json
{
  "id": "batch-uuid",
  "name": "CSE 2023-2027 A",
  "startYear": 2023,
  "endYear": 2027,
  "currentSemester": 3,
  "isPassedOut": false,
  "tutorId": "staff-uuid",
  "tutor": {
    "id": "staff-uuid",
    "name": "Prof. Suresh",
    "email": "suresh@abcengg.edu"
  },
  "department": {
    "id": "dept-uuid",
    "name": "Computer Science and Engineering"
  },
  "_count": {
    "students": 60,
    "subjectAssignments": 5
  },
  "subjectAssignments": [
    {
      "id": "sa-uuid",
      "subject": { "id": "subj-uuid", "name": "Data Structures", "subjectCode": "CS301" },
      "staff": { "id": "staff-uuid-2", "name": "Prof. Anita", "email": "anita@abcengg.edu" }
    }
  ],
  "staffBatchMappings": [
    {
      "id": "sbm-uuid",
      "roleType": "TUTOR",
      "staff": { "id": "staff-uuid", "name": "Prof. Suresh", "email": "suresh@abcengg.edu" }
    }
  ]
}
```

**Error Response (404) — batch not found:**
```json
{
  "message": "Batch not found in your department",
  "error": "Not Found",
  "statusCode": 404
}
```

---

### GET `/batches/available-tutors`

> **Access:** HOD only
> **Note:** Returns active staff not currently tutoring any **active** batch. Staff freed from passed-out batches appear here automatically.

**Success Response (200):**
```json
[
  {
    "id": "staff-uuid",
    "name": "Prof. Suresh",
    "email": "suresh@abcengg.edu",
    "isTutor": false
  }
]
```

---

### PATCH `/batches/:id/assign-tutor`

> **Access:** HOD only
> **Note:** A staff member can only be tutor of **one batch at a time**. Use `GET /batches/available-tutors` to get eligible staff.

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

**Error Response (400) — staff already tutoring another batch:**
```json
{
  "message": "Prof. Suresh is already assigned as tutor for another batch.",
  "error": "Bad Request",
  "statusCode": 400
}
```

---

### PATCH `/batches/:id/promote`

> **Access:** HOD only
> **Note:** Increments `currentSemester` by 1. Maximum is `(endYear - startYear) * 2` (e.g. 8 for a 4-year batch).

**Success Response (200):**
```json
{
  "id": "batch-uuid",
  "name": "CSE 2023-2027 A",
  "currentSemester": 3,
  "startYear": 2023,
  "endYear": 2027,
  "tutorId": "staff-uuid",
  "tutor": { "id": "staff-uuid", "name": "Prof. Suresh", "email": "suresh@abcengg.edu" }
}
```

**Error Response (400) — already at final semester:**
```json
{
  "message": "Batch is already in its final semester (8).",
  "error": "Bad Request",
  "statusCode": 400
}
```


---

### PATCH `/batches/:id/passout`

> **Access:** HOD only
> **Note:** Marks a batch as passed out (irreversible). Automatically frees the tutor if they have no other active batch, making them available in `GET /batches/available-tutors`.

**Success Response (200):**
```json
{
  "message": "Batch marked as passed out successfully"
}
```

**Error Response (400) — already passed out:**
```json
{
  "message": "Batch is already marked as passed out.",
  "error": "Bad Request",
  "statusCode": 400
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

### GET `/students?batchId=<uuid>&page=1&limit=10&search=saif&isActive=true`

> **Access:** STAFF (tutor of batch) or HOD

**Query Parameters:**

| Param | Type | Required | Description |
|---|---|---|---|
| `batchId` | string | **Yes** | UUID of the batch to list students from |
| `page` | number | No | Page number (default: 1) |
| `limit` | number | No | Items per page (default: 10, max: 100) |
| `search` | string | No | Filter by name, email or register number (case-insensitive) |
| `isActive` | boolean | No | `true` = active students (default), `false` = deactivated students |

**Success Response (200):**
```json
{
  "data": [
    {
      "id": "student-uuid",
      "name": "Mohammed Saif",
      "registerNumber": "2023CSE001",
      "isActive": true
    }
  ],
  "meta": { "total": 60, "page": 1, "limit": 10 }
}
```

---

### GET `/students/:id`

> **Access:** STAFF (tutor of the student's batch) or HOD

Returns complete details of a single student including their batch info and OD request count.

**Success Response (200):**
```json
{
  "id": "student-uuid",
  "registerNumber": "2023CSE001",
  "batchId": "batch-uuid",
  "user": {
    "id": "user-uuid",
    "name": "Mohammed Saif",
    "email": "saif@student.abcengg.edu",
    "isActive": true,
    "mustChangePassword": false,
    "createdAt": "2026-04-29T08:00:00.000Z"
  },
  "batch": {
    "id": "batch-uuid",
    "name": "CSE 2023-2027 A",
    "startYear": 2023,
    "endYear": 2027,
    "currentSemester": 3,
    "isPassedOut": false
  },
  "_count": {
    "odRequests": 5
  }
}
```

**Error Response (404) — student not found:**
```json
{
  "message": "Student not found in your college",
  "error": "Not Found",
  "statusCode": 404
}
```

---

### PATCH `/students/:id`

> **Access:** STAFF (tutor of the student's batch) or HOD

Edits a student's details. Passing `dob` resets their password to the new `dob` and sets `mustChangePassword` to `true`.

**Request Body:**
```json
{
  "name": "Mohammed Saif Updated",
  "email": "saif.new@student.abcengg.edu",
  "registerNumber": "2023CSE001X",
  "dob": "16062005"
}
```

**Success Response (200):**
```json
{
  "id": "student-uuid",
  "registerNumber": "2023CSE001X",
  "batchId": "batch-uuid",
  "user": {
    "id": "user-uuid",
    "name": "Mohammed Saif Updated",
    "email": "saif.new@student.abcengg.edu",
    "isActive": true,
    "mustChangePassword": true,
    "createdAt": "2026-04-29T08:00:00.000Z"
  },
  "batch": {
    "id": "batch-uuid",
    "name": "CSE 2023-2027 A",
    "startYear": 2023,
    "endYear": 2027,
    "currentSemester": 3,
    "isPassedOut": false
  },
  "_count": {
    "odRequests": 5
  }
}
```

**Error Response (400) — deactivated student:**
```json
{
  "message": "Cannot edit a deactivated student member. Activate them first.",
  "error": "Bad Request",
  "statusCode": 400
}
```

---

### PATCH `/students/:id/deactivate`

> **Access:** STAFF (tutor of the student's batch) or HOD

Deactivates a student (soft delete), preventing them from logging in.

**Success Response (200):**
```json
{
  "message": "Student deactivated successfully"
}
```

**Error Response (400) — already deactivated:**
```json
{
  "message": "Student is already deactivated",
  "error": "Bad Request",
  "statusCode": 400
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
  "departmentId": "dept-uuid",
  "semester": 3
}
```

**Success Response (201):**
```json
{
  "id": "subject-uuid",
  "name": "Data Structures",
  "subjectCode": "CS201",
  "departmentId": "dept-uuid",
  "semester": 3
}
```

---

### GET `/subjects?page=1&limit=10&search=data&semester=3`

> **Access:** STAFF or HOD

**Query Parameters:**

| Param | Type | Required | Description |
|---|---|---|---|
| `page` | number | No | Page number (default: 1) |
| `limit` | number | No | Items per page (default: 10, max: 100) |
| `search` | string | No | Filter by name or subject code (case-insensitive, partial match) |
| `semester` | number | No | Filter by semester number |

**Success Response (200):**
```json
{
  "data": [
    {
      "id": "subject-uuid",
      "name": "Data Structures",
      "subjectCode": "CS201",
      "departmentId": "dept-uuid",
      "semester": 3
    }
  ],
  "meta": { "total": 1, "page": 1, "limit": 10 }
}
```

---

### GET `/subjects/:id`

> **Access:** STAFF or HOD

Returns complete details of a single subject including department info, batch assignments (with teaching staff), and timetable slot count.

**Success Response (200):**
```json
{
  "id": "subject-uuid",
  "name": "Data Structures",
  "subjectCode": "CS201",
  "semester": 3,
  "departmentId": "dept-uuid",
  "department": {
    "id": "dept-uuid",
    "name": "Computer Science and Engineering"
  },
  "assignments": [
    {
      "id": "sa-uuid",
      "batch": { "id": "batch-uuid", "name": "CSE 2023-2027 A" },
      "staff": { "id": "staff-uuid", "name": "Prof. Anita", "email": "anita@abcengg.edu" }
    }
  ],
  "_count": {
    "timetableSlots": 4
  }
}
```

**Error Response (404) — subject not found:**
```json
{
  "message": "Subject not found in your college",
  "error": "Not Found",
  "statusCode": 404
}
```

---

### PATCH `/subjects/:id`

> **Access:** STAFF or HOD

Edits a subject's name, code, or semester. Subject code uniqueness is enforced per college.

**Request Body:**
```json
{
  "name": "Advanced Data Structures",
  "subjectCode": "CS301",
  "semester": 5
}
```

**Success Response (200):**
```json
{
  "id": "subject-uuid",
  "name": "Advanced Data Structures",
  "subjectCode": "CS301",
  "departmentId": "dept-uuid",
  "semester": 5
}
```

**Error Response (409) — duplicate subject code:**
```json
{
  "message": "Subject code \"CS301\" already exists in this college",
  "error": "Conflict",
  "statusCode": 409
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
  "semester": 3,
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

> **`semester`** *(required, integer ≥ 1)* — The semester this timetable belongs to. Each semester has its own independent timetable.
> **Enums:** `day` = MONDAY | TUESDAY | WEDNESDAY | THURSDAY | FRIDAY | SATURDAY | SUNDAY
> `type` = SUBJECT | BREAK | LUNCH
> `subjectId` and `staffId` are required only when `type` = SUBJECT

> **Note:** If a timetable already exists for the same `batchId` + `semester`, it will be fully replaced with the new slots.

**Success Response (201):**
```json
{
  "message": "Timetable updated successfully"
}
```

---

### GET `/timetable/:batchId?semester=3`

> **Access:** Any authenticated user in the same college

**Query Parameters:**

| Param | Type | Required | Description |
|---|---|---|---|
| `semester` | number | **Yes** | Semester number to fetch the timetable for |

**Success Response (200):**
```json
{
  "batchId": "batch-uuid",
  "semester": 3,
  "slots": [
    {
      "id": "slot-uuid",
      "semester": 3,
      "day": "MONDAY",
      "startTime": "09:00",
      "endTime": "10:00",
      "type": "SUBJECT",
      "subject": { "id": "subject-uuid", "name": "Data Structures", "subjectCode": "CS201" },
      "staff": { "id": "staff-uuid", "name": "Prof. Suresh" }
    },
    {
      "id": "slot-uuid",
      "semester": 3,
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

**Error Response (400) — missing semester:**
```json
{
  "message": "Validation failed (numeric string is expected)",
  "error": "Bad Request",
  "statusCode": 400
}
```

---

### PATCH `/timetable`

> **Access:** STAFF with `isTutor = true` (must be tutor of the batch)
> **Purpose:** Edit specific timetable slots without replacing the entire timetable. Each slot to update must include its `id`.

**Request Body:**
```json
{
  "batchId": "batch-uuid",
  "semester": 3,
  "slots": [
    {
      "id": "slot-uuid-1",
      "startTime": "09:30",
      "endTime": "10:30"
    },
    {
      "id": "slot-uuid-2",
      "type": "SUBJECT",
      "subjectId": "new-subject-uuid",
      "staffId": "new-staff-uuid"
    }
  ]
}
```

> **Fields per slot:** All fields except `id` are optional — send only the fields you want to change.
> To clear `subjectId` or `staffId` (e.g., changing type from SUBJECT to BREAK), send `null` explicitly.

**Success Response (200):**
```json
{
  "message": "Timetable slots updated successfully"
}
```

**Error Response (400) — slot not found:**
```json
{
  "message": "Slot(s) not found in this batch/semester: slot-uuid-1, slot-uuid-2",
  "error": "Bad Request",
  "statusCode": 400
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
| PATCH /timetable | ❌ | ❌ | ✅ (tutor) | ❌ |
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

---

## 🏆 Hackathons

### POST `/hackathons`
> **Access:** `HOD`

Creates a new hackathon. This endpoint uses `multipart/form-data` to handle thumbnail image uploads to Cloudflare R2.

**Request Body (multipart/form-data):**
- `name` (string)
- `description` (string)
- `isGroup` (boolean - send as "true" or "false")
- `minSize` (integer, required if `isGroup` is true)
- `maxSize` (integer, required if `isGroup` is true)
- `registrationDeadline` (string, ISO DateTime)
- `hackathonDate` (string, ISO DateTime)
- `thumbnail` (file, optional, max 5MB, png/jpg/jpeg/webp)

**Success Response (201):**
```json
{
  "id": "uuid-here",
  "collegeId": "college-uuid",
  "departmentId": "dept-uuid",
  "name": "Spring Hack 2026",
  "description": "Annual 24-hour coding sprint.",
  "isGroup": true,
  "minSize": 2,
  "maxSize": 4,
  "thumbnailUrl": "https://pub-xxxxxx.r2.dev/hackathons/college-uuid/uuid-here/thumbnail.png",
  "registrationDeadline": "2026-06-01T00:00:00.000Z",
  "hackathonDate": "2026-06-15T00:00:00.000Z",
  "createdById": "hod-uuid",
  "createdAt": "2026-05-11T13:30:00.000Z",
  "updatedAt": "2026-05-11T13:30:00.000Z"
}
```

---

### GET `/hackathons`
> **Access:** `HOD`, `STAFF`, `STUDENT`

Retrieves a list of all hackathons within the user's department, sorted by newest first.

**Success Response (200):**
```json
[
  {
    "id": "uuid-here",
    "name": "Spring Hack 2026",
    "description": "Annual 24-hour coding sprint.",
    "isGroup": true,
    "minSize": 2,
    "maxSize": 4,
    "thumbnailUrl": "https://...",
    "registrationDeadline": "2026-06-01T00:00:00.000Z",
    "hackathonDate": "2026-06-15T00:00:00.000Z",
    "_count": {
      "teams": 12
    }
  }
]
```

---

### GET `/hackathons/:id`
> **Access:** `HOD`, `STAFF`, `STUDENT`

Retrieves full details of a specific hackathon.

**Success Response (200):**
```json
{
  "id": "uuid-here",
  "name": "Spring Hack 2026",
  "description": "Annual 24-hour coding sprint.",
  "isGroup": true,
  "minSize": 2,
  "maxSize": 4,
  "thumbnailUrl": "https://...",
  "registrationDeadline": "2026-06-01T00:00:00.000Z",
  "hackathonDate": "2026-06-15T00:00:00.000Z",
  "createdBy": {
    "id": "user-uuid",
    "name": "Dr. Ramesh Kumar",
    "role": "HOD"
  }
}
```

---

### POST `/hackathons/:id/register`
> **Access:** `STUDENT`

Registers a team (or solo participant) for a hackathon. The student initiating the request is automatically set as the Team Leader.

**Request Body (JSON):**
```json
{
  "teamName": "Byte Benders",
  "ideaTitle": "AI Attendance Tracker",
  "ideaDescription": "Using facial recognition to automate classroom attendance.",
  "memberIds": [
    "student-uuid-1",
    "student-uuid-2"
  ]
}
```

**Validation Rules:**
- The deadline must not be passed.
- `memberIds` array must only contain students from the same department.
- If `isGroup` is true, the total member count (Leader + `memberIds`) must be between `minSize` and `maxSize`.
- If `isGroup` is false, `memberIds` must be empty (only the leader).
- None of the members (including the leader) can already be registered for this hackathon.

**Success Response (201):**
```json
{
  "id": "team-uuid",
  "hackathonId": "hackathon-uuid",
  "leaderId": "leader-student-uuid",
  "teamName": "Byte Benders",
  "ideaTitle": "AI Attendance Tracker",
  "ideaDescription": "Using facial recognition...",
  "createdAt": "2026-05-11T13:30:00.000Z",
  "members": [
    {
      "id": "member-uuid",
      "teamId": "team-uuid",
      "studentId": "leader-student-uuid",
      "hackathonId": "hackathon-uuid",
      "joinedAt": "2026-05-11T13:30:00.000Z",
      "student": {
        "id": "leader-student-uuid",
        "registerNumber": "S1001",
        "user": { "name": "Alice" }
      }
    }
  ]
}
```

---

### GET `/hackathons/:id/teams`
> **Access:** `HOD`, `STAFF` (Tutors)

Lists all teams registered for a specific hackathon.

**Success Response (200):**
```json
[
  {
    "id": "team-uuid",
    "hackathonId": "hackathon-uuid",
    "leaderId": "leader-student-uuid",
    "teamName": "Byte Benders",
    "ideaTitle": "AI Attendance Tracker",
    "ideaDescription": "Using facial recognition...",
    "createdAt": "2026-05-11T13:30:00.000Z",
    "leader": {
      "registerNumber": "S1001",
      "user": { "name": "Alice" }
    },
    "_count": {
      "members": 3
    }
  }
]
```

---

### GET `/hackathons/teams/:teamId`
> **Access:** `HOD`, `STAFF`, `STUDENT`

Retrieves complete details of a registered team, including all members and their chronological progress updates.

**Success Response (200):**
```json
{
  "id": "team-uuid",
  "teamName": "Byte Benders",
  "ideaTitle": "AI Attendance Tracker",
  "ideaDescription": "Using facial recognition...",
  "leader": {
    "registerNumber": "S1001",
    "user": { "name": "Alice" }
  },
  "members": [
    {
      "student": {
        "id": "student-uuid",
        "registerNumber": "S1001",
        "user": { "name": "Alice" },
        "batch": { "name": "CSE B" }
      }
    }
  ],
  "progress": [
    {
      "id": "progress-uuid",
      "teamId": "team-uuid",
      "description": "Completed frontend UI mocks.",
      "date": "2026-06-05T10:00:00.000Z",
      "createdAt": "2026-06-05T10:05:00.000Z"
    }
  ]
}
```

---

### POST `/hackathons/teams/:teamId/progress`
> **Access:** `STUDENT`

Allows a team member to submit a progress update. The backend verifies that the requesting student is a registered member of this team.

**Request Body:**
```json
{
  "description": "Integrated facial recognition API with backend.",
  "date": "2026-06-06T10:00:00.000Z"
}
```

**Success Response (201):**
```json
{
  "id": "progress-uuid",
  "teamId": "team-uuid",
  "description": "Integrated facial recognition API with backend.",
  "date": "2026-06-06T10:00:00.000Z",
  "createdAt": "2026-06-06T10:05:00.000Z"
}
```

---

### GET `/hackathons/department-batches`
> **Access:** `STUDENT`

Retrieves all active batches for the current user's department. Used by students to browse batches before loading their students.

**Success Response (200):**
```json
[
  {
    "id": "batch-uuid",
    "name": "B.Tech CSE 2024",
    "currentSemester": 1
  }
]
```

---

### GET `/hackathons/batches/:batchId/students`
> **Access:** `STUDENT`

Retrieves active students for a specific batch with pagination.

**Query Parameters:**
- `page` (optional, default: 1)
- `limit` (optional, default: 20)

**Success Response (200):**
```json
{
  "students": [
    {
      "id": "student-uuid",
      "registerNumber": "12345678",
      "user": {
        "id": "user-uuid",
        "name": "John Doe"
      }
    }
  ],
  "page": 1,
  "limit": 20,
  "total": 60,
  "hasMore": true
}
```

---

### PATCH `/hackathons/:id`
> **Access:** `HOD`

Updates an existing hackathon. Only the creator (HOD) can update it. `isGroup`, `minSize`, and `maxSize` cannot be changed. If a new `thumbnail` is provided, the old one is deleted from R2.

**Request Body (`multipart/form-data`):**
- `name` (optional string)
- `description` (optional string)
- `registrationDeadline` (optional ISO DateTime)
- `hackathonDate` (optional ISO DateTime)
- `thumbnail` (optional file - JPG, PNG, WEBP, max 5MB)

**Success Response (200):**
```json
{
  "id": "hackathon-uuid",
  "name": "Updated Appathon 2026",
  "description": "Updated Description...",
  "thumbnailUrl": "https://pub-....r2.dev/hackathons/college-id/hackathon-uuid/new-uuid.jpg",
  "registrationDeadline": "2026-06-01T23:59:59.000Z",
  "hackathonDate": "2026-06-15T09:00:00.000Z",
  "updatedAt": "2026-05-12T10:00:00.000Z"
}
```

---

### DELETE `/hackathons/:id`
> **Access:** `HOD`

Deletes a hackathon. Only the creator (HOD) can delete it. Automatically deletes the associated thumbnail from R2 and cascades deletion to all registered teams and progress.

**Success Response (200):**
```json
{
  "message": "Hackathon deleted successfully"
}
```

---

## Events (HOD, Tutor, Student)

Endpoints for managing and viewing college-wide events.

### 1. Create Event
- **Endpoint:** `POST /api/v1/events`
- **Roles:** `HOD`
- **Content-Type:** `multipart/form-data`
- **Payload:**
  - `name` (string)
  - `description` (string)
  - `startDate` (ISO 8601 string)
  - `endDate` (ISO 8601 string)
  - `thumbnail` (file, optional) - Max 5MB, JPG/PNG/WEBP.
- **Response (201):**
  ```json
  {
    "id": "uuid",
    "collegeId": "uuid",
    "departmentId": "uuid",
    "name": "Event Name",
    "description": "Event Description",
    "thumbnailUrl": "https://pub-....r2.dev/events/...",
    "startDate": "2024-03-20T10:00:00.000Z",
    "endDate": "2024-03-21T18:00:00.000Z",
    "createdById": "uuid",
    "createdAt": "...",
    "updatedAt": "..."
  }
  ```

### 2. Get All Events
- **Endpoint:** `GET /api/v1/events`
- **Roles:** `HOD`, `STAFF`, `STUDENT`
- **Description:** Returns all events visible to the college.
- **Response (200):** Array of event objects (includes `department: { name }`).

### 3. Get Event Details
- **Endpoint:** `GET /api/v1/events/:id`
- **Roles:** `HOD`, `STAFF`, `STUDENT`
- **Response (200):** Event details.

### 4. Update Event
- **Endpoint:** `PATCH /api/v1/events/:id`
- **Roles:** `HOD`
- **Content-Type:** `multipart/form-data`
- **Payload:** Same as create, all optional.
- **Response (200):** Updated event details.

### 5. Delete Event
- **Endpoint:** `DELETE /api/v1/events/:id`
- **Roles:** `HOD`
- **Response (200):**
  ```json
  {
    "message": "Event deleted successfully"
  }
  ```
