# Student Management System - Backend

A comprehensive Node.js/Express backend for managing students, teachers, and academic records with features like file import, messaging, and admin statistics.

## Features

- **Authentication**: JWT-based authentication with refresh tokens
- **User Management**: Admin panel for managing users (teachers, admins)
- **Student Management**: CRUD operations, search, filter, and export to CSV
- **Bulk Import**: Excel file import with validation and error tracking
- **Messaging System**: Inter-user messaging with read status
- **Admin Dashboard**: Statistics and analytics for administrators
- **Role-based Access Control**: Admin and Teacher roles with different permissions

## Prerequisites

- Node.js (v14+)
- MongoDB (local or cloud instance)
- yarn or npm

## Installation

1. **Install dependencies**:
   ```bash
   cd backend
   npm install
   # or
   yarn install
   ```

2. **Setup environment variables**:
   Create a `.env` file in the backend root directory:
   ```env
   PORT=5000
   NODE_ENV=development
   MONGODB_URI=mongodb://localhost:27017/student-management
   JWT_SECRET=your_jwt_secret_key_change_this_in_production
   JWT_REFRESH_SECRET=your_jwt_refresh_secret_key_change_this_in_production
   JWT_EXPIRE=1h
   JWT_REFRESH_EXPIRE=7d
   FRONTEND_URL=http://localhost:3000
   ```

3. **Ensure MongoDB is running**:
   ```bash
   # On Windows with MongoDB installed
   net start MongoDB
   
   # Or use MongoDB Atlas (cloud)
   # Update MONGODB_URI in .env with your connection string
   ```

4. **Create Excel template** (optional):
   ```bash
   node scripts/createTemplate.js
   ```

## Running the Server

### Development mode (with auto-reload):
```bash
npm run dev
# or
yarn dev
```

### Production mode:
```bash
npm start
# or
yarn start
```

The server will start on `http://localhost:5000`

## API Documentation

### Authentication Endpoints

#### Register
- **POST** `/api/auth/register`
- Body: `{ email, password, full_name, role }`
- Returns: `{ access_token, refresh_token, user }`

#### Login
- **POST** `/api/auth/login`
- Body: `{ email, password }`
- Returns: `{ access_token, refresh_token, user }`

#### Refresh Token
- **POST** `/api/auth/refresh`
- Body: `{ refresh_token }`
- Returns: `{ access_token, refresh_token }`

#### Get Current User
- **GET** `/api/auth/me`
- Headers: `Authorization: Bearer <token>`

### Student Endpoints

#### Get Students (paginated, with filters)
- **GET** `/api/students?page=1&limit=20&search=name&branch=CS&year=1`
- Headers: `Authorization: Bearer <token>`
- Returns: `{ students, total, total_pages, page, limit }`

#### Get Single Student
- **GET** `/api/students/:id`
- Headers: `Authorization: Bearer <token>`

#### Create Student
- **POST** `/api/students`
- Headers: `Authorization: Bearer <token>`
- Body: `{ roll_number, first_name, last_name, email, ... }`

#### Update Student
- **PUT** `/api/students/:id`
- Headers: `Authorization: Bearer <token>`
- Body: Partial student object

#### Delete Student
- **DELETE** `/api/students/:id`
- Headers: `Authorization: Bearer <token>`

#### Export Students to CSV
- **GET** `/api/students/export/csv?branch=CS&year=1`
- Headers: `Authorization: Bearer <token>`

### Import Endpoints

#### Import Students from Excel
- **POST** `/api/students/import`
- Headers: `Authorization: Bearer <token>`, `Content-Type: multipart/form-data`
- Body: Form data with `file` field
- Returns: `{ total, created, updated, skipped, errors, import_id }`

#### Get Import Logs (Admin)
- **GET** `/api/students/import/logs?page=1&limit=20`
- Headers: `Authorization: Bearer <token>` (Admin required)

#### Get Single Import Log (Admin)
- **GET** `/api/students/import/logs/:id`
- Headers: `Authorization: Bearer <token>` (Admin required)

### Message Endpoints

#### Get Messages
- **GET** `/api/messages?page=1&limit=20`
- Headers: `Authorization: Bearer <token>`

#### Get Single Message
- **GET** `/api/messages/:id`
- Headers: `Authorization: Bearer <token>`

#### Create Message
- **POST** `/api/messages`
- Headers: `Authorization: Bearer <token>`
- Body: `{ to_user, to_student, subject, body, message_type }`

#### Update Message
- **PUT** `/api/messages/:id`
- Headers: `Authorization: Bearer <token>`
- Body: `{ subject, body, message_type }`

#### Delete Message
- **DELETE** `/api/messages/:id`
- Headers: `Authorization: Bearer <token>`

### Admin Endpoints

#### Get Dashboard Statistics
- **GET** `/api/admin/stats`
- Headers: `Authorization: Bearer <token>` (Admin required)
- Returns: `{ total_students, total_teachers, total_messages, total_imports, branch_distribution, year_distribution }`

#### Get All Users
- **GET** `/api/admin/users?page=1&limit=20`
- Headers: `Authorization: Bearer <token>` (Admin required)

#### Create User
- **POST** `/api/admin/users`
- Headers: `Authorization: Bearer <token>` (Admin required)
- Body: `{ email, password, full_name, role }`

#### Update User
- **PUT** `/api/admin/users/:id`
- Headers: `Authorization: Bearer <token>` (Admin required)
- Body: `{ full_name, role, is_active, department }`

#### Delete User
- **DELETE** `/api/admin/users/:id`
- Headers: `Authorization: Bearer <token>` (Admin required)

## Database Schema

### User
```javascript
{
  email: String (unique),
  password: String (hashed),
  full_name: String,
  role: 'admin' | 'teacher',
  phone: String,
  department: String,
  is_active: Boolean,
  last_login: Date,
  timestamps: true
}
```

### Student
```javascript
{
  roll_number: String (unique),
  first_name: String,
  last_name: String,
  email: String,
  phone: String,
  branch: String,
  year: Number (1-4),
  section: String,
  cgpa: Number,
  date_of_birth: Date,
  address: String,
  city: String,
  state: String,
  pincode: String,
  guardian_name: String,
  guardian_phone: String,
  is_active: Boolean,
  enrollment_date: Date,
  import_id: ObjectId,
  timestamps: true
}
```

### Message
```javascript
{
  from_user: ObjectId (User),
  to_user: ObjectId (User),
  to_student: ObjectId (Student),
  subject: String,
  body: String,
  message_type: 'note' | 'announcement' | 'assignment' | 'alert',
  is_read: Boolean,
  read_at: Date,
  attachments: [String],
  timestamps: true
}
```

### ImportLog
```javascript
{
  file_name: String,
  imported_by: ObjectId (User),
  total_records: Number,
  created_count: Number,
  updated_count: Number,
  skipped_count: Number,
  errors: [{ row: Number, error: String }],
  status: 'pending' | 'success' | 'failed' | 'partial',
  started_at: Date,
  completed_at: Date,
  processing_time_ms: Number,
  timestamps: true
}
```

## Excel Import Template Format

The import file should have the following columns:
- Roll Number (required)
- First Name
- Last Name
- Email (required)
- Phone
- Branch (Computer Science | Electrical Engineering | Mechanical Engineering)
- Year (1-4)
- Section
- CGPA
- Date of Birth
- Address
- City
- State
- Pincode
- Guardian Name
- Guardian Phone

## Error Handling

All errors are returned in the following format:
```json
{
  "detail": "Error message",
  "errors": [] // Optional, for validation errors
}
```

HTTP Status Codes:
- `200`: Success
- `201`: Created
- `400`: Bad Request
- `401`: Unauthorized (Invalid/Expired token)
- `403`: Forbidden (Insufficient permissions)
- `404`: Not Found
- `500`: Internal Server Error

## Security Features

- ✅ Password hashing with bcryptjs
- ✅ JWT token-based authentication
- ✅ Refresh token rotation
- ✅ CORS enabled for frontend
- ✅ Role-based access control
- ✅ Input validation

## Performance Features

- ✅ Database indexing on frequently searched fields
- ✅ Pagination for large result sets
- ✅ Aggregation pipelines for statistics
- ✅ Population of references efficiently
- ✅ File upload handling with multer

## Development Tips

1. **Test the API**: Use Postman or curl to test endpoints
2. **Monitor logs**: Check console output for request logs and errors
3. **Reset database**: Connect to MongoDB and drop the database if needed
4. **Create test users**: 
   ```bash
   curl -X POST http://localhost:5000/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@test.com","password":"123456","full_name":"Admin","role":"admin"}'
   ```

## Troubleshooting

### MongoDB Connection Error
- Ensure MongoDB is running
- Check the connection string in `.env`
- Verify network connectivity

### Port Already in Use
- Change the PORT in `.env`
- Or kill the process using the port

### CORS Issues
- Check `FRONTEND_URL` in `.env`
- Ensure it matches your frontend URL

## Next Steps

1. Connect the frontend to use these APIs
2. Set up MongoDB (local or cloud)
3. Run both backend and frontend servers
4. Test the complete flow

## License

ISC
