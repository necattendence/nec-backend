# Backend Testing Guide

## Quick API Tests

### 1. Health Check
```bash
curl http://localhost:5000/health
```

### 2. Register Admin User
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "admin123",
    "full_name": "Administrator",
    "role": "admin"
  }'
```

Save the `access_token` from response.

### 3. Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "admin123"
  }'
```

### 4. Get Current User
Replace `YOUR_TOKEN` with the actual token:
```bash
curl -X GET http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 5. Create Teacher User (Admin only)
```bash
curl -X POST http://localhost:5000/api/admin/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "email": "teacher@example.com",
    "password": "teacher123",
    "full_name": "John Teacher",
    "role": "teacher"
  }'
```

### 6. Get Dashboard Stats (Admin only)
```bash
curl -X GET http://localhost:5000/api/admin/stats \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 7. Create a Student
```bash
curl -X POST http://localhost:5000/api/students \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "roll_number": "CS001",
    "first_name": "John",
    "last_name": "Doe",
    "email": "john@example.com",
    "phone": "9876543210",
    "branch": "Computer Science",
    "year": 1,
    "cgpa": 8.5
  }'
```

### 8. Get All Students
```bash
curl -X GET "http://localhost:5000/api/students?page=1&limit=20" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 9. Search Students
```bash
curl -X GET "http://localhost:5000/api/students?search=john&branch=Computer%20Science&year=1" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 10. Export Students as CSV
```bash
curl -X GET "http://localhost:5000/api/students/export/csv?branch=Computer%20Science" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o students.csv
```

### 11. Send Message
```bash
curl -X POST http://localhost:5000/api/messages \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "to_user": "USER_ID_HERE",
    "subject": "Hello",
    "body": "This is a test message",
    "message_type": "note"
  }'
```

### 12. Get Messages
```bash
curl -X GET "http://localhost:5000/api/messages?page=1&limit=20" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Using Postman

1. Import this collection to Postman:
   - Create a new collection "Student Management"
   - Add requests following the examples above
   - Store `access_token` in a variable for easy reuse

2. Set up environment variables:
   - `{{base_url}}` = http://localhost:5000
   - `{{token}}` = your_access_token

3. Use in requests:
   - `http://{{base_url}}/api/auth/login`
   - `Authorization: Bearer {{token}}`

## Testing with Insomnia

Similar to Postman, import the above curl commands or create requests manually.

## Automated Testing

Run unit tests:
```bash
cd backend
npm test
```

## Performance Testing

Load test the API:
```bash
# Install autocannon
npm install -g autocannon

# Test endpoint
autocannon -c 10 -d 30 http://localhost:5000/api/students -H "Authorization: Bearer YOUR_TOKEN"
```

## Common Scenarios

### Scenario 1: Complete User Flow
1. Register as admin
2. Create teacher user
3. Teacher creates students
4. Admin views dashboard
5. Teacher exports students

### Scenario 2: Import Flow
1. Prepare Excel file with student data
2. Use admin user to import
3. Check import logs
4. Verify students in database

### Scenario 3: Messaging Flow
1. Create two user accounts
2. Send message from User1 to User2
3. User2 reads message
4. Delete message

## Troubleshooting API Errors

### 401 Unauthorized
- Check if token is expired
- Use refresh endpoint to get new token
- Verify token format: `Bearer <token>`

### 403 Forbidden
- Check user role (admin required for some endpoints)
- Verify user permissions

### 400 Bad Request
- Check required fields
- Verify data types
- Check field validation errors

### 404 Not Found
- Verify resource exists
- Check correct ID is used
- Verify endpoint path

### 500 Internal Server Error
- Check backend logs
- Verify MongoDB connection
- Check database state

## Database Queries

Connect to MongoDB directly:
```bash
# Using MongoDB CLI
mongo student-management

# Or MongoDB Compass (GUI)
mongodb://localhost:27017
```

View data:
```javascript
db.users.find()
db.students.find()
db.messages.find()
db.importlogs.find()
```

## Next Steps

1. Test all endpoints manually
2. Test with frontend application
3. Perform load testing
4. Set up automated tests
5. Deploy to production environment
