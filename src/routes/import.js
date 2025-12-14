const express = require('express');
const multer = require('multer');
const path = require('path');
const XLSX = require('xlsx');
const Student = require('../models/Student');
const ImportLog = require('../models/ImportLog');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files are allowed'));
    }
  },
});

// Import students from Excel
router.post('/', authMiddleware, adminMiddleware, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ detail: 'No file uploaded' });
    }

    const startTime = Date.now();
    const importLog = new ImportLog({
      file_name: req.file.filename,
      imported_by: req.user.id,
      started_at: new Date(),
    });

    try {
      // Read Excel file
      const workbook = XLSX.readFile(req.file.path);
      
      let created = 0;
      let updated = 0;
      let skipped = 0;
      const errors = [];
      let totalRecords = 0;

      // Process all sheets
      for (const sheetName of workbook.SheetNames) {
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet);
        
        totalRecords += data.length;

        // Process each row in the sheet
        for (let i = 0; i < data.length; i++) {
          try {
            const row = data[i];

            // Validate required fields
            if (!row.rollNo || !row.name) {
              errors.push({
                sheet: sheetName,
                row: i + 2,
                error: 'Missing rollNo or name',
              });
              skipped++;
              continue;
            }

            // Check if student exists
            const existingStudent = await Student.findOne({
              rollNo: String(row.rollNo).trim(),
            });

            const studentData = {
              name: String(row.name).trim(),
              rollNo: String(row.rollNo).trim(),
              parentNo: row.parentNo ? String(row.parentNo).trim() : '',
              studentNo: row.studentNo ? String(row.studentNo).trim() : '',
              imageUrl: row.imageUrl || '',
              branch: row.branch || '',
              batch: row.batch || '',
              import_id: importLog._id,
            };

            if (existingStudent) {
              // Update existing student
              Object.assign(existingStudent, studentData);
              await existingStudent.save();
              updated++;
            } else {
              // Create new student
              const newStudent = new Student(studentData);
              await newStudent.save();
              created++;
            }
          } catch (rowError) {
            errors.push({
              sheet: sheetName,
              row: i + 2,
              error: rowError.message,
            });
            skipped++;
          }
        }
      }

      importLog.total_records = totalRecords;

      // Update import log
      importLog.created_count = created;
      importLog.updated_count = updated;
      importLog.skipped_count = skipped;
      importLog.errors = errors;
      importLog.completed_at = new Date();
      importLog.processing_time_ms = Date.now() - startTime;

      if (errors.length === 0) {
        importLog.status = 'success';
      } else if (created + updated > 0) {
        importLog.status = 'partial';
      } else {
        importLog.status = 'failed';
      }

      await importLog.save();

      // Delete uploaded file
      const fs = require('fs');
      fs.unlinkSync(req.file.path);

      res.json({
        total: totalRecords,
        created,
        updated,
        skipped,
        errors,
        import_id: importLog._id,
      });
    } catch (fileError) {
      importLog.status = 'failed';
      importLog.errors = [{ error: fileError.message }];
      importLog.completed_at = new Date();
      importLog.processing_time_ms = Date.now() - startTime;
      await importLog.save();

      // Delete file
      const fs = require('fs');
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      throw fileError;
    }
  } catch (error) {
    next(error);
  }
});

// Get import logs
router.get('/logs', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const total = await ImportLog.countDocuments();
    const logs = await ImportLog.find()
      .populate('imported_by', 'full_name email')
      .limit(limit)
      .skip(skip)
      .sort({ createdAt: -1 });

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

// Get single import log
router.get('/logs/:id', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    const log = await ImportLog.findById(req.params.id).populate(
      'imported_by',
      'full_name email'
    );
    if (!log) {
      return res.status(404).json({ detail: 'Import log not found' });
    }
    res.json(log);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
