# API Quick Reference - Unified Project Management

## 🚀 Quick API Endpoints Reference

### **Projects**

```http
GET    /api/projects                    # List all projects
POST   /api/projects                    # Create new project
GET    /api/projects/[id]               # Get project details
PUT    /api/projects/[id]               # Update project
DELETE /api/projects/[id]               # Delete project (Admin only)
```

---

### **Project Members** ✨ NEW

```http
GET    /api/projects/[id]/members           # List project members
POST   /api/projects/[id]/members           # Assign member
DELETE /api/projects/[id]/members?user_id=  # Remove member
```

**POST Request Body:**
```json
{ "user_id": "uuid" }
```

**GET Response:**
```json
{
  "members": [
    { "user_id": "uuid", "profiles": { "first_name": "John", ... } }
  ]
}
```

---

### **Tasks** ✨ NEW

```http
GET    /api/projects/[id]/tasks              # List all tasks
POST   /api/projects/[id]/tasks              # Create task
PUT    /api/projects/[id]/tasks?task_id=     # Update task
DELETE /api/projects/[id]/tasks?task_id=     # Delete task
```

**POST Request Body:**
```json
{
  "title": "Task title (required)",
  "description": "Description",
  "status": "todo | in-progress | review | completed",
  "priority": "low | medium | high",
  "assignee_id": "uuid",
  "due_date": "2025-01-01"
}
```

**PUT Request Body:** (all fields optional)
```json
{
  "title": "Updated title",
  "status": "in-progress",
  "priority": "high"
}
```

---

### **Attachments**

```http
GET    /api/projects/[id]/attachments               # List attachments
POST   /api/projects/[id]/attachments               # Upload attachment
DELETE /api/projects/[id]/attachments?attachment_id= # Delete attachment
```

**POST Request Body:**
```json
{
  "task_id": "uuid (optional)",
  "storage_path": "path/to/file",
  "file_name": "document.pdf",
  "file_size": 1024,
  "content_type": "application/pdf",
  "client_visible": true
}
```

---

### **Comments**

```http
GET    /api/projects/[id]/comments             # List comments
POST   /api/projects/[id]/comments             # Add comment
DELETE /api/projects/[id]/comments?comment_id= # Delete comment
```

**POST Request Body:**
```json
{
  "body": "Comment text (required)",
  "task_id": "uuid (optional)",
  "file_refs": "attachment references (optional)"
}
```

---

### **Activities**

```http
GET    /api/projects/[id]/activities    # Get project activity log
```

---

### **Employees**

```http
GET    /api/employees                   # List all employees
POST   /api/employees                   # Create employee invitation
GET    /api/employees/[id]              # Get employee details
PUT    /api/employees/[id]              # Update employee
DELETE /api/employees/[id]              # Delete employee
```

---

### **Employee Project Assignments** ✨ NEW

```http
GET    /api/employees/[id]/projects     # Get employee's projects
POST   /api/employees/[id]/projects     # Assign projects to employee
```

**POST Request Body:**
```json
{
  "project_ids": ["uuid1", "uuid2", "uuid3"]
}
```

**Note:** This replaces ALL current project assignments for the employee.

---

## 🔐 Authorization

### **Required Roles:**

| Endpoint | Admin | Manager | Employee |
|----------|-------|---------|----------|
| GET projects | ✅ | ✅ | ✅ (own only) |
| POST projects | ✅ | ✅ | ❌ |
| PUT projects | ✅ | ✅ | ❌ |
| DELETE projects | ✅ | ❌ | ❌ |
| POST/DELETE members | ✅ | ✅ | ❌ |
| GET tasks | ✅ | ✅ | ✅ |
| POST/PUT tasks | ✅ | ✅ | ✅ |
| DELETE tasks | ✅ | ✅ | ❌ |
| POST/DELETE comments | ✅ | ✅ | ✅ |
| POST/DELETE attachments | ✅ | ✅ | ✅ |
| Employee assignments | ✅ | ✅ | ❌ |

---

## 📝 Common Response Formats

### **Success Response:**
```json
{
  "data": { ... },
  "message": "Operation successful (optional)"
}
```

### **Error Response:**
```json
{
  "error": "Error message",
  "details": "Additional details (optional)"
}
```

### **HTTP Status Codes:**
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (not logged in)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (duplicate entry)
- `500` - Internal Server Error

---

## 🔄 Fetch Examples

### **GET Request:**
```typescript
const response = await fetch('/api/projects/abc-123/tasks', {
  credentials: 'same-origin',
});
const { tasks } = await response.json();
```

### **POST Request:**
```typescript
const response = await fetch('/api/projects/abc-123/tasks', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'same-origin',
  body: JSON.stringify({
    title: 'New Task',
    status: 'todo',
    priority: 'high',
  }),
});
const { task } = await response.json();
```

### **PUT Request:**
```typescript
const response = await fetch('/api/projects/abc-123/tasks?task_id=xyz-456', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'same-origin',
  body: JSON.stringify({
    status: 'completed',
  }),
});
const { task } = await response.json();
```

### **DELETE Request:**
```typescript
const response = await fetch('/api/projects/abc-123/tasks?task_id=xyz-456', {
  method: 'DELETE',
  credentials: 'same-origin',
});
const { success } = await response.json();
```

---

## 🛡️ Error Handling Pattern

```typescript
try {
  const response = await fetch('/api/...', { ... });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Operation failed');
  }
  
  const data = await response.json();
  // Handle success
  
} catch (error) {
  console.error('Error:', error);
  // Show error to user
}
```

---

## 📊 Activity Logging

All significant operations are automatically logged to `project_activities`:

| Activity Type | Triggered By |
|---------------|--------------|
| `member_added` | POST /members |
| `member_removed` | DELETE /members |
| `member_assigned` | POST /employees/[id]/projects |
| `task_created` | POST /tasks |
| `task_updated` | PUT /tasks |
| `task_deleted` | DELETE /tasks |

Activity logs include:
- `project_id` - Which project
- `activity_type` - What happened
- `description` - Human-readable description
- `performed_by` - Who did it
- `created_at` - When it happened

---

**Quick Reference Version:** 1.0  
**Last Updated:** October 23, 2025

