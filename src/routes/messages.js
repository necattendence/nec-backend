const express = require('express');
const Message = require('../models/Message');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Get messages
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const filter = {
      $or: [{ from_user: req.user.id }, { to_user: req.user.id }],
    };

    const total = await Message.countDocuments(filter);
    const messages = await Message.find(filter)
      .populate('from_user', 'full_name email')
      .populate('to_user', 'full_name email')
      .populate('to_student', 'first_name last_name')
      .limit(limit)
      .skip(skip)
      .sort({ createdAt: -1 });

    res.json({
      data: messages,
      total,
      total_pages: Math.ceil(total / limit),
      page,
    });
  } catch (error) {
    next(error);
  }
});

// Get single message
router.get('/:id', authMiddleware, async (req, res, next) => {
  try {
    const message = await Message.findById(req.params.id)
      .populate('from_user', 'full_name email')
      .populate('to_user', 'full_name email')
      .populate('to_student', 'first_name last_name');

    if (!message) {
      return res.status(404).json({ detail: 'Message not found' });
    }

    // Mark as read
    if (message.to_user.toString() === req.user.id && !message.is_read) {
      message.is_read = true;
      message.read_at = new Date();
      await message.save();
    }

    res.json(message);
  } catch (error) {
    next(error);
  }
});

// Create message
router.post('/', authMiddleware, async (req, res, next) => {
  try {
    const { to_user, to_student, subject, body, message_type } = req.body;

    if (!body) {
      return res.status(400).json({ detail: 'Message body is required' });
    }

    if (!to_user && !to_student) {
      return res.status(400).json({ detail: 'To user or student is required' });
    }

    const message = new Message({
      from_user: req.user.id,
      to_user,
      to_student,
      subject,
      body,
      message_type: message_type || 'note',
    });

    await message.save();
    await message.populate('from_user', 'full_name email');

    res.status(201).json(message);
  } catch (error) {
    next(error);
  }
});

// Update message
router.put('/:id', authMiddleware, async (req, res, next) => {
  try {
    const message = await Message.findById(req.params.id);

    if (!message) {
      return res.status(404).json({ detail: 'Message not found' });
    }

    if (message.from_user.toString() !== req.user.id) {
      return res.status(403).json({ detail: 'You can only edit your own messages' });
    }

    const { subject, body, message_type } = req.body;
    if (subject) message.subject = subject;
    if (body) message.body = body;
    if (message_type) message.message_type = message_type;

    await message.save();
    res.json(message);
  } catch (error) {
    next(error);
  }
});

// Delete message
router.delete('/:id', authMiddleware, async (req, res, next) => {
  try {
    const message = await Message.findById(req.params.id);

    if (!message) {
      return res.status(404).json({ detail: 'Message not found' });
    }

    if (
      message.from_user.toString() !== req.user.id &&
      message.to_user.toString() !== req.user.id
    ) {
      return res.status(403).json({ detail: 'You cannot delete this message' });
    }

    await Message.deleteOne({ _id: req.params.id });
    res.json({ message: 'Message deleted successfully' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
