const express = require('express');
const Student = require('../models/Student');
const User = require('../models/User');
const Message = require('../models/Message');
const ImportLog = require('../models/ImportLog');
const ActivityLog = require('../models/ActivityLog');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

const router = express.Router();

// Get dashboard statistics
router.get('/stats', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    const [
      total_students,
      total_teachers,
      total_messages,
      total_imports,
      branch_distribution,
      batch_distribution,
    ] = await Promise.all([
      Student.countDocuments(),
      User.countDocuments({ role: 'teacher' }),
      Message.countDocuments(),
      ImportLog.countDocuments(),
      Student.aggregate([
        {
          $group: {
            _id: '$branch',
            count: { $sum: 1 },
          },
        },
        {
          $project: {
            _id: 0,
            branch: '$_id',
            count: 1,
          },
        },
        {
          $sort: { count: -1 },
        },
      ]),
      Student.aggregate([
        {
          $group: {
            _id: '$batch',
            count: { $sum: 1 },
          },
        },
        {
          $match: { _id: { $ne: null } },
        },
        {
          $project: {
            _id: 0,
            batch: '$_id',
            count: 1,
          },
        },
        {
          $sort: { batch: 1 },
        },
      ]),
    ]);

    res.json({
      total_students,
      total_teachers,
      total_messages,
      total_imports,
      branch_distribution,
      batch_distribution,
    });
  } catch (error) {
    next(error);
  }
});

// Get all users
router.get('/users', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const total = await User.countDocuments();
    const users = await User.find()
      .select('-password')
      .limit(limit)
      .skip(skip)
      .sort({ createdAt: -1 });

    res.json({
      users,
      total,
      total_pages: Math.ceil(total / limit),
      page,
    });
  } catch (error) {
    next(error);
  }
});

// Create user
router.post('/users', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    const bcrypt = require('bcryptjs');
    const { email, password, full_name, role } = req.body;

    if (!email || !password || !full_name) {
      return res.status(400).json({ detail: 'Missing required fields' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ detail: 'Email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      email,
      password: hashedPassword,
      full_name,
      role: role || 'teacher',
    });

    await user.save();

    res.status(201).json({
      id: user._id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
    });
  } catch (error) {
    next(error);
  }
});

// Update user
router.put('/users/:id', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    const { full_name, role, is_active, department } = req.body;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { full_name, role, is_active, department },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ detail: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    next(error);
  }
});

// Delete user
router.delete('/users/:id', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return res.status(404).json({ detail: 'User not found' });
    }

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// Get pending teacher approvals
router.get('/pending-teachers', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    const pendingTeachers = await User.find({
      role: 'teacher',
      is_approved: false,
    }).select('-password').sort({ approval_requested_at: -1 });

    res.json(pendingTeachers);
  } catch (error) {
    next(error);
  }
});

// Get approved teachers
router.get('/approved-teachers', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    const approvedTeachers = await User.find({
      role: 'teacher',
      is_approved: true,
    }).select('-password').sort({ approved_at: -1 });

    res.json(approvedTeachers);
  } catch (error) {
    next(error);
  }
});

// Get rejected teachers
router.get('/rejected-teachers', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    const rejectedTeachers = await User.find({
      role: 'teacher',
      rejected_at: { $exists: true, $ne: null },
    }).select('-password').sort({ rejected_at: -1 });

    res.json(rejectedTeachers);
  } catch (error) {
    next(error);
  }
});

// Get deleted teachers
router.get('/deleted-teachers', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    // Note: Deleted teachers won't be in the database as they're permanently deleted
    // This endpoint returns an empty array for UI consistency
    res.json([]);
  } catch (error) {
    next(error);
  }
});

// Approve teacher
router.post('/approve-teacher/:id', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    const teacher = await User.findByIdAndUpdate(
      req.params.id,
      {
        is_approved: true,
        approved_by: req.user.id,
        approved_at: new Date(),
      },
      { new: true }
    ).select('-password');

    if (!teacher) {
      return res.status(404).json({ detail: 'Teacher not found' });
    }

    if (teacher.role !== 'teacher') {
      return res.status(400).json({ detail: 'User is not a teacher' });
    }

    res.json({ message: 'Teacher approved successfully', user: teacher });
  } catch (error) {
    next(error);
  }
});

// Reject teacher
router.post('/reject-teacher/:id', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    const teacher = await User.findByIdAndUpdate(
      req.params.id,
      {
        rejected_at: new Date(),
        rejected_by: req.user.id,
        rejection_reason: req.body.reason || 'No reason provided',
      },
      { new: true }
    ).select('-password');

    if (!teacher) {
      return res.status(404).json({ detail: 'Teacher not found' });
    }

    if (teacher.role !== 'teacher') {
      return res.status(400).json({ detail: 'User is not a teacher' });
    }

    res.json({ message: 'Teacher rejected successfully', user: teacher });
  } catch (error) {
    next(error);
  }
});

// Get activity logs (student updates and deletions)
router.get('/activity-logs', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const filter = {};

    // Filter by action type
    if (req.query.action && ['create', 'update', 'delete'].includes(req.query.action)) {
      filter.action = req.query.action;
    }

    // Filter by student
    if (req.query.student_id) {
      filter.student_id = req.query.student_id;
    }

    // Filter by user who performed the action
    if (req.query.performed_by) {
      filter.performed_by = req.query.performed_by;
    }

    const total = await ActivityLog.countDocuments(filter);
    const logs = await ActivityLog.find(filter)
      .populate('performed_by', 'full_name email')
      .populate('student_id', 'name rollNo')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);

    res.json({
      logs,
      total,
      total_pages: Math.ceil(total / limit),
      page,
    });
  } catch (error) {
    next(error);
  }
});

// Get activity log by ID
router.get('/activity-logs/:id', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    const log = await ActivityLog.findById(req.params.id)
      .populate('performed_by', 'full_name email role')
      .populate('student_id', 'name rollNo branch batch');

    if (!log) {
      return res.status(404).json({ detail: 'Activity log not found' });
    }

    res.json(log);
  } catch (error) {
    next(error);
  }
});

// Delete teacher
router.delete('/teachers/:id', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    const teacher = await User.findById(req.params.id);

    if (!teacher) {
      return res.status(404).json({ detail: 'Teacher not found' });
    }

    if (teacher.role !== 'teacher') {
      return res.status(400).json({ detail: 'Can only delete teacher accounts' });
    }

    await User.findByIdAndDelete(req.params.id);

    res.json({ detail: 'Teacher deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// Rollback teacher (restore from rejected or deleted to approved)
router.post('/rollback-teacher/:id', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    // First check if teacher exists and has teacher role
    const teacher = await User.findById(req.params.id);

    if (!teacher) {
      return res.status(404).json({ detail: 'Teacher not found' });
    }

    if (teacher.role !== 'teacher') {
      return res.status(400).json({ detail: 'Can only rollback teacher accounts' });
    }

    // Update teacher to approved status
    const updatedTeacher = await User.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          is_approved: true,
          approved_by: req.user.id,
          approved_at: new Date(),
        },
        $unset: {
          rejected_at: '',
          rejection_reason: '',
          rejected_by: '',
        }
      },
      { new: true }
    ).select('-password');

    res.json({ detail: 'Teacher restored successfully', teacher: updatedTeacher });
  } catch (error) {
    console.error('Rollback error:', error);
    next(error);
  }
});

module.exports = router;
