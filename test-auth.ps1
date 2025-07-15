# Test authentication endpoints

Write-Host "🧪 Testing Authentication Endpoints" -ForegroundColor Green
Write-Host "====================================" -ForegroundColor Green

# Test registration
Write-Host "`n📝 Testing Registration..." -ForegroundColor Yellow

$registrationData = @{
    firstName = "Test"
    lastName = "User"
    email = "test$(Get-Date -Format 'yyyyMMddHHmmss')@example.com"
    phone = "+1234567890"
    password = "testpass123"
    referralCode = ""
} | ConvertTo-Json

try {
    $registrationResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/register" -Method POST -ContentType "application/json" -Body $registrationData
    Write-Host "✅ Registration successful!" -ForegroundColor Green
    Write-Host "User: $($registrationResponse.user.email)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Registration failed: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $errorStream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($errorStream)
        $errorBody = $reader.ReadToEnd()
        Write-Host "Error details: $errorBody" -ForegroundColor Red
    }
}

# Test admin login
Write-Host "`n🔐 Testing Admin Login..." -ForegroundColor Yellow

$loginData = @{
    email = "admin@broker.com"
    password = "Admin123"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/signin" -Method POST -ContentType "application/json" -Body $loginData
    Write-Host "✅ Login test completed" -ForegroundColor Green
} catch {
    Write-Host "❌ Login test failed: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $errorStream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($errorStream)
        $errorBody = $reader.ReadToEnd()
        Write-Host "Error details: $errorBody" -ForegroundColor Red
    }
}

Write-Host "`n🎯 Please test login manually in browser:" -ForegroundColor Cyan
Write-Host "   URL: http://localhost:3000/auth/signin" -ForegroundColor White
Write-Host "   Email: admin@broker.com" -ForegroundColor White
Write-Host "   Password: Admin123" -ForegroundColor White
