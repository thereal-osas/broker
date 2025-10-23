@echo off
echo ========================================
echo Force Restart Development Server
echo ========================================
echo.

echo 1. Killing any existing Node.js processes...
taskkill /f /im node.exe >nul 2>&1
taskkill /f /im npm.exe >nul 2>&1
timeout /t 2 >nul

echo 2. Clearing Next.js cache...
if exist ".next" (
    rmdir /s /q ".next"
    echo    - Removed .next directory
)

echo 3. Clearing node_modules cache...
if exist "node_modules\.cache" (
    rmdir /s /q "node_modules\.cache"
    echo    - Removed node_modules cache
)

echo 4. Testing database connection...
node -e "require('dotenv').config({path:'.env'}); const {Pool} = require('pg'); const pool = new Pool({connectionString: process.env.DATABASE_URL, ssl: false}); pool.query('SELECT NOW()').then(r => {console.log('✅ DB Connected:', r.rows[0].now); process.exit(0);}).catch(e => {console.log('❌ DB Error:', e.message); process.exit(1);});"

if %errorlevel% neq 0 (
    echo.
    echo ❌ Database connection failed!
    echo Please check your PostgreSQL server is running.
    pause
    exit /b 1
)

echo.
echo 5. Starting development server...
echo ========================================
echo Server will start in 3 seconds...
echo Press Ctrl+C to cancel
timeout /t 3

npm run dev
