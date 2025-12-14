const XLSX = require('xlsx');
const path = require('path');

// Create a new workbook
const workbook = XLSX.utils.book_new();

// Create sample data
const sampleData = [
  {
    'name': 'John Doe',
    'rollNo': 'CS001',
    'parentNo': '9876543209',
    'studentNo': '9876543210',
    'imageUrl': 'https://example.com/image1.jpg',
    'batch': '2023',
    'branch': 'Computer Science',
  },
  {
    'name': 'Alice Smith',
    'rollNo': 'EE001',
    'parentNo': '9876543212',
    'studentNo': '9876543211',
    'imageUrl': 'https://example.com/image2.jpg',
    'batch': '2023',
    'branch': 'Electrical Engineering',
  },
  {
    'name': 'Charlie Johnson',
    'rollNo': 'ME001',
    'parentNo': '9876543214',
    'studentNo': '9876543213',
    'imageUrl': 'https://example.com/image3.jpg',
    'batch': '2022',
    'branch': 'Mechanical Engineering',
  },
];

// Create worksheet
const worksheet = XLSX.utils.json_to_sheet(sampleData);

// Set column widths
const colWidths = [
  { wch: 15 }, // name
  { wch: 12 }, // rollNo
  { wch: 12 }, // parentNo
  { wch: 12 }, // studentNo
  { wch: 30 }, // imageUrl
  { wch: 8 }, // batch
  { wch: 20 }, // branch
];

worksheet['!cols'] = colWidths;

// Add the worksheet to the workbook
XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');

// Write the file
const templatePath = path.join(__dirname, '../public/excel-template.xlsx');
XLSX.writeFile(workbook, templatePath);

console.log('✅ Excel template created at:', templatePath);
