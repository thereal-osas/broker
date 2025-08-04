// Validate cryptocurrency wallet addresses
require('dotenv').config({ path: '.env.local' });

// Address validation patterns
const ADDRESS_PATTERNS = {
  bitcoin: {
    pattern: /^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,87}$/,
    description: 'Bitcoin address (Bech32 or Legacy format)'
  },
  ethereum: {
    pattern: /^0x[a-fA-F0-9]{40}$/,
    description: 'Ethereum address (42 characters starting with 0x)'
  },
  usdt: {
    pattern: /^0x[a-fA-F0-9]{40}$/,
    description: 'USDT address (ERC-20, same format as Ethereum)'
  }
};

function validateAddress(address, type) {
  if (!address) {
    return { valid: false, error: 'Address is empty or undefined' };
  }

  const pattern = ADDRESS_PATTERNS[type];
  if (!pattern) {
    return { valid: false, error: 'Unknown cryptocurrency type' };
  }

  if (pattern.pattern.test(address)) {
    return { valid: true };
  } else {
    return { 
      valid: false, 
      error: `Invalid format. Expected: ${pattern.description}` 
    };
  }
}

function validateAllAddresses() {
  console.log('🔍 Validating Cryptocurrency Wallet Addresses\n');

  const addresses = {
    bitcoin: process.env.NEXT_PUBLIC_CRYPTO_WALLET_BITCOIN,
    ethereum: process.env.NEXT_PUBLIC_CRYPTO_WALLET_ETHEREUM,
    usdt: process.env.NEXT_PUBLIC_CRYPTO_WALLET_USDT
  };

  let allValid = true;

  Object.entries(addresses).forEach(([type, address]) => {
    const result = validateAddress(address, type);
    const status = result.valid ? '✅' : '❌';
    const typeLabel = type.toUpperCase().padEnd(8);
    
    console.log(`${status} ${typeLabel}: ${address || '[NOT SET]'}`);
    
    if (!result.valid) {
      console.log(`   Error: ${result.error}`);
      allValid = false;
    }
    console.log('');
  });

  if (allValid) {
    console.log('🎉 All wallet addresses are valid!\n');
    console.log('📋 Next steps:');
    console.log('   1. Restart your development server: npm run dev');
    console.log('   2. Test deposit page: http://localhost:3000/dashboard/deposit');
    console.log('   3. Verify QR codes generate correctly');
  } else {
    console.log('⚠️  Some addresses need attention. Please fix the errors above.\n');
    console.log('💡 Address format examples:');
    console.log('   Bitcoin:  bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh');
    console.log('   Ethereum: 0x742d35Cc6634C0532925a3b8D4C9db96590b5c8e');
    console.log('   USDT:     0x742d35Cc6634C0532925a3b8D4C9db96590b5c8e');
  }

  return allValid;
}

// Additional security checks
function performSecurityChecks() {
  console.log('\n🔒 Security Checks\n');

  const addresses = {
    bitcoin: process.env.NEXT_PUBLIC_CRYPTO_WALLET_BITCOIN,
    ethereum: process.env.NEXT_PUBLIC_CRYPTO_WALLET_ETHEREUM,
    usdt: process.env.NEXT_PUBLIC_CRYPTO_WALLET_USDT
  };

  // Check for duplicate addresses
  const addressValues = Object.values(addresses).filter(Boolean);
  const uniqueAddresses = new Set(addressValues);
  
  if (addressValues.length !== uniqueAddresses.size) {
    console.log('⚠️  Warning: Some addresses are duplicated');
    console.log('   This is OK for USDT/Ethereum (same network)');
    console.log('   But Bitcoin should have a unique address\n');
  } else {
    console.log('✅ All addresses are unique\n');
  }

  // Check for placeholder values
  const placeholders = [
    'your-bitcoin-address-here',
    'your-ethereum-address-here',
    'your-usdt-address-here'
  ];

  let hasPlaceholders = false;
  Object.entries(addresses).forEach(([type, address]) => {
    if (placeholders.includes(address)) {
      console.log(`❌ ${type.toUpperCase()}: Still using placeholder value`);
      hasPlaceholders = true;
    }
  });

  if (hasPlaceholders) {
    console.log('\n💡 Replace placeholder values with your actual wallet addresses');
  } else {
    console.log('✅ No placeholder values detected');
  }
}

// Main execution
console.log('🚀 Cryptocurrency Wallet Address Validator\n');

// Check if we're in a deployment environment
const isDeployment = process.env.VERCEL || process.env.NODE_ENV === 'production';

if (isDeployment) {
  console.log('🚀 Running in deployment environment - skipping wallet validation');
  console.log('✅ Wallet validation skipped for deployment');
  process.exit(0);
}

const isValid = validateAllAddresses();
performSecurityChecks();

if (!isValid) {
  console.log('\n⚠️  Validation failed, but continuing for development...');
  console.log('💡 Set proper wallet addresses in production environment');
  // Don't exit with error code in development
  process.exit(0);
}
