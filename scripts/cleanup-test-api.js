const fs = require('fs');
const path = require('path');

const apiDir = path.join(process.cwd(), 'src', 'app', 'api', 'test-db');
if (fs.existsSync(apiDir)) {
  fs.rmSync(apiDir, { recursive: true });
  console.log('✅ Cleaned up test API endpoint');
} else {
  console.log('ℹ️  Test API endpoint not found');
}