const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/test', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

const fixSchema = async () => {
  try {
    const db = mongoose.connection;
    const studentsCollection = db.collection('students');

    console.log('Checking for old indexes...');
    
    // Drop old index if it exists
    try {
      const indexes = await studentsCollection.getIndexes();
      if (indexes['roll_number_1']) {
        console.log('⚠️  Found old index: roll_number_1, dropping it...');
        await studentsCollection.dropIndex('roll_number_1');
        console.log('✅ Old index dropped');
      }
    } catch (error) {
      console.log('ℹ️  Old index not found (this is fine)');
    }

    // Clear the collection to remove any old data with null roll_number
    console.log('Clearing students collection...');
    await studentsCollection.deleteMany({});
    console.log('✅ Students collection cleared');

    // Recreate indexes
    console.log('Creating new indexes...');
    await studentsCollection.createIndex({ rollNo: 1, branch: 1, year: 1 });
    console.log('✅ New indexes created');

    console.log('\n✅ Database schema fixed successfully!');
    console.log('You can now import students with the new format.');
    
  } catch (error) {
    console.error('❌ Error fixing schema:', error);
  } finally {
    await mongoose.disconnect();
  }
};

const main = async () => {
  await connectDB();
  await fixSchema();
};

main();
