# 🚀 Backend System Instruction – OD Management Platform

## 🎯 Objective

Build a **production-ready backend system** for a multi-tenant college platform that manages **On-Duty (OD) requests**, user hierarchy, academic structure, and approval workflows.

The backend must be built using:

* Framework: NestJS
* Database: PostgreSQL
* Architecture: REST API
* Auth: JWT-based authentication
* ORM: Prisma (preferred) or TypeORM

---

# 🧠 Core Concept

This is a **multi-college (multi-tenant) system**.

Each college operates independently, but all data is stored in a **single database**, separated using `college_id`.

---

# ⚠️ CRITICAL RULES

1. Every table MUST include:

   * `college_id` (except global system tables if any)

2. DO NOT hard delete important data:

   * Use `is_active` for soft deletion (especially staff/users)

3. Passwords MUST be hashed (bcrypt)

4. Enforce strict **Role-Based Access Control (RBAC)**

5. All APIs must be **secured using JWT**

6. Follow clean architecture:

   * modules
   * services
   * controllers
   * DTOs
   * guards

---

# 👥 Roles

* SUPER_ADMIN → manages entire platform
* HOD → manages department
* STAFF → includes tutors and subject teachers
* STUDENT → end user

### Important:

* Tutor is NOT a separate role
* Tutor = STAFF with `is_tutor = true`

---

# 🗂️ Database Schema

## 1. Colleges

* id
* name
* email_address
* college_code (UNIQUE)
* city
* state
* created_at
* updated_at

---

## 2. Departments

* id
* college_id
* name

---

## 3. Users (MASTER AUTH TABLE)

* id
* college_id
* name
* email (unique per college)
* password (hashed)
* role (SUPER_ADMIN / HOD / STAFF / STUDENT)
* is_tutor (boolean)
* department_id (nullable)
* is_active (boolean)
* created_at

---

## 4. Students (Extension Table)

* id
* user_id (FK → users.id)
* register_number (unique per college)
* batch_id

---

## 5. Batches

* id
* college_id
* department_id
* name
* tutor_id (FK → users.id)
* start_year
* end_year

---

## 6. Staff-Batch Mapping

* id
* staff_id
* batch_id
* role_type (TUTOR / SUBJECT_TEACHER)

---

## 7. Subjects

* id
* college_id
* name
* subject_code
* department_id

---

## 8. Subject Assignments

* id
* subject_id
* batch_id
* staff_id

---

## 9. Timetable (Dynamic)

* id
* batch_id
* day (ENUM)
* start_time
* end_time
* type (SUBJECT / BREAK / LUNCH)
* subject_id (nullable)
* staff_id (nullable)

---

## 10. OD Requests

* id
* student_id
* batch_id
* subject
* description
* status
* current_level (TUTOR / HOD)
* created_at

---

## 11. OD Approvals (Audit Trail)

* id
* od_request_id
* approved_by
* role (TUTOR / HOD)
* status (APPROVED / REJECTED)
* remark
* timestamp

---

## 12. Notifications

* id
* user_id
* title
* message
* is_read
* created_at

---

# 🔄 OD Workflow Logic

### Status ENUM:

* PENDING_TUTOR
* REJECTED_BY_TUTOR
* PENDING_HOD
* REJECTED_BY_HOD
* APPROVED

---

### Flow:

1. Student creates OD request
   → status = PENDING_TUTOR

2. Tutor action:

   * Reject → REJECTED_BY_TUTOR
   * Approve → PENDING_HOD

3. HOD action:

   * Reject → REJECTED_BY_HOD
   * Approve → APPROVED

4. Maintain full approval history in `od_approvals`

---

# 🔔 Notification System

Integrate push notification system (FCM or placeholder service).

Trigger notifications on:

* OD request submitted → notify Tutor
* Tutor approval → notify HOD
* Final decision → notify Student

Also store notifications in DB.

---

# 📦 Bulk Upload Feature

Implement CSV/Excel upload for:

* Students
* Staff

Flow:

1. Upload file
2. Parse data
3. Validate:

   * duplicates
   * required fields
   * format errors
4. Return preview
5. Confirm → insert into DB

---

# 🔐 Authentication & Security

* JWT-based authentication
* Role-based guards
* Password hashing (bcrypt)
* First login → force password change (especially for students using DOB)

---

# 📡 API DESIGN

## Auth

* POST /auth/login

---

## Super Admin

* POST /colleges

* GET /colleges

* PATCH /colleges/:id

* POST /departments

* POST /hods

---

## HOD

* POST /staff

* GET /staff

* PATCH /staff/:id

* DEACTIVATE /staff/:id

* POST /batches

* ASSIGN tutor

* BULK UPLOAD endpoints

---

## Tutor

* POST /students
* POST /subjects
* POST /timetable

---

## OD

* POST /od-request

* GET /od-request (role-based filtering)

* PATCH /od-request/:id/approve

* PATCH /od-request/:id/reject

---

# ⚡ Performance Requirements

* Add indexes on:

  * college_id
  * batch_id
  * user_id
  * status
  * register_number

* Implement pagination:

  * ?page=1&limit=10

---

# 🧱 Folder Structure (NestJS)

* auth/
* users/
* colleges/
* departments/
* batches/
* students/
* staff/
* subjects/
* timetable/
* od/
* notifications/
* common/

  * guards/
  * decorators/
  * enums/
  * utils/

---

# 🧪 Expectations

The system must:

* Be modular and scalable
* Follow best practices
* Be production-ready
* Handle real-world college workflows
* Avoid hardcoding
* Be cleanly documented

---

# ❌ DO NOT

* Do not skip validation
* Do not mix roles incorrectly
* Do not create tightly coupled logic
* Do not expose unsecured endpoints

---

# ✅ FINAL GOAL

Deliver a fully functional backend system that supports:

* Multi-college onboarding
* Role-based management
* Dynamic academic structure
* OD request lifecycle with approval hierarchy
* Notifications and audit tracking

---

Build this as if it will be used in real colleges at scale.
