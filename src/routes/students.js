const express = require('express');
const multer = require('multer');
const Student = require('../models/Student');
const ActivityLog = require('../models/ActivityLog');
const { authMiddleware } = require('../middleware/auth');
const { uploadImage, deleteImage, extractPublicId } = require('../utils/cloudinary');

const router = express.Router();

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  },
});

// Get all students with filters and pagination
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    // Teachers must be approved to access students
    if (req.user.role === 'teacher' && !req.user.is_approved) {
      return res.status(403).json({ detail: 'Your account is pending admin approval. You cannot access student data.' });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const filter = {};

    // Search
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      filter.$or = [
        { name: searchRegex },
        { rollNo: searchRegex },
      ];
    }

    // Branch filter
    if (req.query.branch && req.query.branch.trim()) {
      filter.branch = req.query.branch;
    }

    // Batch filter
    if (req.query.batch && req.query.batch.trim()) {
      filter.batch = req.query.batch;
    }

    const total = await Student.countDocuments(filter);
    const students = await Student.find(filter)
      .limit(limit)
      .skip(skip)
      .sort({ rollNo: 1 });

    res.json({
      students,
      total,
      total_pages: Math.ceil(total / limit),
      page,
      limit,
    });
  } catch (error) {
    next(error);
  }
});

// Get single student
router.get('/:id', authMiddleware, async (req, res, next) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ detail: 'Student not found' });
    }
    res.json(student);
  } catch (error) {
    next(error);
  }
});

// Create student
router.post('/', authMiddleware, async (req, res, next) => {
  try {
    const student = new Student(req.body);
    await student.save();
    res.status(201).json(student);
  } catch (error) {
    next(error);
  }
});

// Update student
router.put('/:id', authMiddleware, async (req, res, next) => {
  try {
    const oldStudent = await Student.findById(req.params.id);
    if (!oldStudent) {
      return res.status(404).json({ detail: 'Student not found' });
    }

    const student = await Student.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    // Log the update activity
    await ActivityLog.create({
      action: 'update',
      student_id: student._id,
      student_name: student.name,
      student_rollNo: student.rollNo,
      performed_by: req.user.id,
      performed_by_name: req.user.full_name,
      changes: {
        before: oldStudent.toObject(),
        after: student.toObject(),
      },
      description: `Updated student ${student.name} (${student.rollNo})`,
      ip_address: req.ip,
      user_agent: req.get('user-agent'),
    });

    res.json(student);
  } catch (error) {
    next(error);
  }
});

// Upload student image to Cloudinary
router.post('/:id/upload-image', authMiddleware, upload.single('image'), async (req, res, next) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ detail: 'Student not found' });
    }

    if (!req.file) {
      return res.status(400).json({ detail: 'No image file provided' });
    }

    // Delete old image from Cloudinary if exists
    if (student.imageUrl) {
      const oldPublicId = extractPublicId(student.imageUrl);
      if (oldPublicId) {
        try {
          await deleteImage(oldPublicId);
        } catch (err) {
          console.error('Failed to delete old image:', err);
        }
      }
    }

    // Upload new image to Cloudinary
    const result = await uploadImage(req.file.buffer, {
      folder: 'students',
      public_id: `student_${student._id}_${Date.now()}`,
    });

    // Update student with new image URL
    const oldStudentData = student.toObject();
    student.imageUrl = result.secure_url;
    await student.save();

    // Log the update activity
    await ActivityLog.create({
      action: 'update',
      student_id: student._id,
      student_name: student.name,
      student_rollNo: student.rollNo,
      performed_by: req.user.id,
      performed_by_name: req.user.full_name,
      changes: {
        before: oldStudentData,
        after: student.toObject(),
      },
      description: `Updated image for student ${student.name} (${student.rollNo})`,
      ip_address: req.ip,
      user_agent: req.get('user-agent'),
    });

    res.json({
      message: 'Image uploaded successfully',
      imageUrl: result.secure_url,
      student,
    });
  } catch (error) {
    next(error);
  }
});


// Delete student
router.delete('/:id', authMiddleware, async (req, res, next) => {
  try {
    const student = await Student.findByIdAndDelete(req.params.id);
    if (!student) {
      return res.status(404).json({ detail: 'Student not found' });
    }

    // Log the delete activity
    await ActivityLog.create({
      action: 'delete',
      student_id: student._id,
      student_name: student.name,
      student_rollNo: student.rollNo,
      performed_by: req.user.id,
      performed_by_name: req.user.full_name,
      changes: {
        before: student.toObject(),
        after: null,
      },
      description: `Deleted student ${student.name} (${student.rollNo})`,
      ip_address: req.ip,
      user_agent: req.get('user-agent'),
    });

    res.json({ message: 'Student deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// Export to CSV
router.get('/export/csv', authMiddleware, async (req, res, next) => {
  try {
    const filter = {};

    if (req.query.branch && req.query.branch.trim()) {
      filter.branch = req.query.branch;
    }

    if (req.query.year && req.query.year.trim()) {
      filter.year = parseInt(req.query.year);
    }

    const students = await Student.find(filter).sort({ roll_number: 1 });

    // Create CSV header
    const headers = [
      'Roll Number',
      'First Name',
      'Last Name',
      'Email',
      'Phone',
      'Branch',
      'Year',
      'CGPA',
      'Guardian Name',
      'Guardian Phone',
    ];

    // Create CSV rows
    const rows = students.map(student => [
      student.roll_number,
      student.first_name,
      student.last_name,
      student.email,
      student.phone || '',
      student.branch || '',
      student.year || '',
      student.cgpa || '',
      student.guardian_name || '',
      student.guardian_phone || '',
    ]);

    // Combine headers and rows
    const csv = [headers, ...rows]
      .map(row =>
        row
          .map(cell => `"${String(cell).replace(/"/g, '""')}"`)
          .join(',')
      )
      .join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="students_export.csv"');
    res.send(csv);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
