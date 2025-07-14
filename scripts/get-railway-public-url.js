#!/usr/bin/env node

/**
 * Railway Public URL Finder
 * 
 * This script helps you find the correct public Railway URL
 * for external connections (like Vercel deployment)
 */

const { execSync } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function findRailwayPublicURL() {
  console.log('🚂 Railway Public URL Finder\n');
  console.log('This script will help you find the correct public Railway URL for Vercel.\n');
  
  // Check if Railway CLI is installed
  try {
    execSync('railway --version', { stdio: 'ignore' });
    console.log('✅ Railway CLI is installed');
  } catch (error) {
    console.log('❌ Railway CLI not found. Installing...');
    try {
      execSync('npm install -g @railway/cli', { stdio: 'inherit' });
      console.log('✅ Railway CLI installed successfully');
    } catch (installError) {
      console.log('❌ Failed to install Railway CLI');
      console.log('Please install manually: npm install -g @railway/cli');
      process.exit(1);
    }
  }
  
  console.log('\n🔐 Logging into Railway...');
  
  // Check if already logged in
  try {
    execSync('railway whoami', { stdio: 'ignore' });
    console.log('✅ Already logged into Railway');
  } catch (error) {
    console.log('Please log into Railway...');
    try {
      execSync('railway login', { stdio: 'inherit' });
      console.log('✅ Logged into Railway successfully');
    } catch (loginError) {
      console.log('❌ Failed to log into Railway');
      process.exit(1);
    }
  }
  
  console.log('\n📋 Getting your Railway projects...');
  
  try {
    // List projects
    const projects = execSync('railway list --json', { encoding: 'utf8' });
    const projectList = JSON.parse(projects);
    
    if (projectList.length === 0) {
      console.log('❌ No Railway projects found');
      process.exit(1);
    }
    
    console.log('\n🚂 Your Railway projects:');
    projectList.forEach((project, index) => {
      console.log(`${index + 1}. ${project.name} (${project.id})`);
    });
    
    const projectChoice = await question('\nEnter the number of your project: ');
    const selectedProject = projectList[parseInt(projectChoice) - 1];
    
    if (!selectedProject) {
      console.log('❌ Invalid project selection');
      process.exit(1);
    }
    
    console.log(`\n✅ Selected project: ${selectedProject.name}`);
    
    // Link to the project
    execSync(`railway link ${selectedProject.id}`, { stdio: 'ignore' });
    
    // Get services
    console.log('\n📋 Getting services in your project...');
    const services = execSync('railway service list --json', { encoding: 'utf8' });
    const serviceList = JSON.parse(services);
    
    // Find PostgreSQL service
    const postgresServices = serviceList.filter(service => 
      service.name.toLowerCase().includes('postgres') || 
      service.name.toLowerCase().includes('database') ||
      service.name.toLowerCase().includes('db')
    );
    
    if (postgresServices.length === 0) {
      console.log('\n📋 All services in project:');
      serviceList.forEach((service, index) => {
        console.log(`${index + 1}. ${service.name} (${service.id})`);
      });
      
      const serviceChoice = await question('\nEnter the number of your PostgreSQL service: ');
      const selectedService = serviceList[parseInt(serviceChoice) - 1];
      
      if (!selectedService) {
        console.log('❌ Invalid service selection');
        process.exit(1);
      }
      
      postgresServices.push(selectedService);
    }
    
    const postgresService = postgresServices[0];
    console.log(`\n✅ Using service: ${postgresService.name}`);
    
    // Connect to the service
    execSync(`railway service connect ${postgresService.id}`, { stdio: 'ignore' });
    
    // Get variables
    console.log('\n🔍 Getting database connection details...');
    const variables = execSync('railway variables --json', { encoding: 'utf8' });
    const varList = JSON.parse(variables);
    
    console.log('\n📋 Database Variables Found:');
    
    // Look for relevant variables
    const dbVars = {};
    Object.keys(varList).forEach(key => {
      if (key.includes('DATABASE_URL') || 
          key.includes('PGHOST') || 
          key.includes('PGUSER') || 
          key.includes('PGPASSWORD') || 
          key.includes('PGDATABASE') || 
          key.includes('PGPORT')) {
        dbVars[key] = varList[key];
        
        if (key === 'DATABASE_URL') {
          console.log(`${key}: ${varList[key].replace(/:([^:@]+)@/, ':***@')}`);
        } else if (key === 'PGPASSWORD') {
          console.log(`${key}: ***`);
        } else {
          console.log(`${key}: ${varList[key]}`);
        }
      }
    });
    
    // Analyze the URLs
    if (dbVars.DATABASE_URL) {
      const url = dbVars.DATABASE_URL;
      const parsed = new URL(url);
      
      console.log('\n🔍 Analyzing DATABASE_URL:');
      console.log('Hostname:', parsed.hostname);
      console.log('Port:', parsed.port || '5432');
      
      if (parsed.hostname.includes('.railway.internal')) {
        console.log('\n🚨 ISSUE: This is an internal Railway URL');
        console.log('❌ Internal URLs don\'t work with external services like Vercel');
        
        console.log('\n🔧 SOLUTION NEEDED:');
        console.log('1. Check Railway dashboard → PostgreSQL service → Connect tab');
        console.log('2. Look for "External Connection" or "Public Connection"');
        console.log('3. Copy the public URL from there');
        
      } else if (parsed.hostname.includes('.proxy.rlwy.net') || 
                 parsed.hostname.includes('.railway.app')) {
        console.log('\n✅ GOOD: This appears to be a public Railway URL');
        console.log('✅ This should work with Vercel');
        
        // Test the connection
        await testConnection(url);
        
      } else {
        console.log('\n⚠️  Unknown URL format');
        console.log('This might be a custom or older Railway URL');
      }
    }
    
    // Provide manual instructions
    console.log('\n📝 Manual Steps to Get Public URL:');
    console.log('1. Go to https://railway.app/dashboard');
    console.log(`2. Select project: ${selectedProject.name}`);
    console.log(`3. Select service: ${postgresService.name}`);
    console.log('4. Click "Connect" tab');
    console.log('5. Look for "External Connection" section');
    console.log('6. Copy the connection string that looks like:');
    console.log('   postgresql://postgres:password@containers-*.railway.app:5432/railway');
    console.log('   OR');
    console.log('   postgresql://postgres:password@*.proxy.rlwy.net:port/railway');
    
  } catch (error) {
    console.log('❌ Error getting Railway information:', error.message);
    console.log('\n📝 Manual Steps:');
    console.log('1. Go to Railway dashboard');
    console.log('2. Select your PostgreSQL service');
    console.log('3. Click "Connect" tab');
    console.log('4. Look for "External Connection" URL');
  } finally {
    rl.close();
  }
}

async function testConnection(url) {
  console.log('\n🧪 Testing connection...');
  
  try {
    const { Pool } = require('pg');
    const pool = new Pool({
      connectionString: url,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 10000
    });
    
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    console.log('✅ Connection test successful!');
    console.log('Server time:', result.rows[0].now);
    client.release();
    await pool.end();
    
    console.log('\n🎉 This URL is ready for Vercel!');
    console.log('Set this as DATABASE_URL in Vercel environment variables.');
    
  } catch (error) {
    console.log('❌ Connection test failed:', error.message);
    console.log('You may need to get a fresh URL from Railway dashboard.');
  }
}

// Run the finder
if (require.main === module) {
  findRailwayPublicURL()
    .catch(error => {
      console.error('Script failed:', error);
      process.exit(1);
    });
}

module.exports = { findRailwayPublicURL };
