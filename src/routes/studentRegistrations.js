const express = require('express');
const multer = require('multer');
const XLSX = require('xlsx');
const Student = require('../models/Student');
const StudentRegistration = require('../models/StudentRegistration');
const { authMiddleware } = require('../middleware/auth');
const { uploadImage } = require('../utils/cloudinary');

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  },
});

const requireStaff = (req, res, next) => {
  if (!req.user || !['admin', 'teacher'].includes(req.user.role)) {
    return res.status(403).json({ detail: 'Only teachers or admins can access this resource' });
  }

  if (req.user.role === 'teacher' && !req.user.is_approved) {
    return res.status(403).json({ detail: 'Your account is pending admin approval' });
  }

  return next();
};

const buildFilter = (query) => {
  const filter = {};

  if (query.search) {
    const searchRegex = new RegExp(query.search, 'i');
    filter.$or = [{ name: searchRegex }, { rollNo: searchRegex }];
  }

  if (query.branch && query.branch.trim()) {
    filter.branch = query.branch.trim();
  }

  if (query.batch && query.batch.trim()) {
    filter.batch = query.batch.trim();
  }

  if (query.status && ['pending', 'approved', 'rejected'].includes(query.status)) {
    filter.status = query.status;
  }

  return filter;
};

// Public student registration
router.post('/', upload.single('image'), async (req, res, next) => {
  try {
    const {
      name,
      rollNo,
      parentNo = '',
      studentNo = '',
      batch = '',
      branch = '',
    } = req.body;

    if (!name || !rollNo) {
      return res.status(400).json({ detail: 'name and rollNo are required' });
    }

    if (!req.file) {
      return res.status(400).json({ detail: 'Student image is required' });
    }

    const normalizedRollNo = String(rollNo).trim();

    const existingStudent = await Student.findOne({ rollNo: normalizedRollNo });
    if (existingStudent) {
      return res.status(409).json({ detail: 'A student with this rollNo already exists in the main collection' });
    }

    const existingRegistration = await StudentRegistration.findOne({ rollNo: normalizedRollNo });
    if (existingRegistration) {
      return res.status(409).json({ detail: 'A registration with this rollNo already exists' });
    }

    const uploadResult = await uploadImage(req.file.buffer, {
      folder: 'student-registrations',
      public_id: `registration_${normalizedRollNo}_${Date.now()}`,
    });

    const registration = await StudentRegistration.create({
      name: String(name).trim(),
      rollNo: normalizedRollNo,
      parentNo: String(parentNo).trim(),
      studentNo: String(studentNo).trim(),
      imageUrl: uploadResult.secure_url,
      batch: String(batch).trim(),
      branch: String(branch).trim(),
      status: 'pending',
    });

    res.status(201).json({
      message: 'Student registration submitted successfully',
      registration,
    });
  } catch (error) {
    next(error);
  }
});

// Staff view registrations
router.get('/', authMiddleware, requireStaff, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const filter = buildFilter(req.query);

    const total = await StudentRegistration.countDocuments(filter);
    const registrations = await StudentRegistration.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      registrations,
      total,
      total_pages: Math.ceil(total / limit),
      page,
      limit,
    });
  } catch (error) {
    next(error);
  }
});

// Export registrations as Excel
router.get('/export/xlsx', authMiddleware, requireStaff, async (req, res, next) => {
  try {
    const filter = buildFilter(req.query);
    const registrations = await StudentRegistration.find(filter).sort({ createdAt: -1 });

    const rows = registrations.map((item) => ({
      name: item.name,
      rollNo: item.rollNo,
      parentNo: item.parentNo || '',
      studentNo: item.studentNo || '',
      imageUrl: item.imageUrl || '',
      batch: item.batch || '',
      branch: item.branch || '',
      status: item.status,
      createdAt: item.createdAt,
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Student Registrations');
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="student-registrations.xlsx"');
    res.send(buffer);
  } catch (error) {
    next(error);
  }
});

// Approve registration into main student collection
router.post('/:id/approve', authMiddleware, requireStaff, async (req, res, next) => {
  try {
    const registration = await StudentRegistration.findById(req.params.id);
    if (!registration) {
      return res.status(404).json({ detail: 'Registration not found' });
    }

    const studentData = {
      name: registration.name,
      rollNo: registration.rollNo,
      parentNo: registration.parentNo || '',
      studentNo: registration.studentNo || '',
      imageUrl: registration.imageUrl || '',
      batch: registration.batch || '',
      branch: registration.branch || '',
      import_id: registration._id,
    };

    const existingStudent = await Student.findOne({ rollNo: registration.rollNo });
    let student;

    if (existingStudent) {
      Object.assign(existingStudent, studentData);
      student = await existingStudent.save();
    } else {
      student = await Student.create(studentData);
    }

    registration.status = 'approved';
    registration.approved_by = req.user.id;
    registration.approved_at = new Date();
    registration.source_student_id = student._id;
    await registration.save();

    res.json({
      message: 'Registration approved and moved to the main student collection',
      student,
      registration,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;