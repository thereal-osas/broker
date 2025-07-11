# Cryptocurrency Wallet Configuration Guide

This guide explains how to configure your own cryptocurrency wallet addresses for collecting payments in your broker platform.

## 🏦 Overview

The platform supports 4 major cryptocurrencies:
- **Bitcoin (BTC)** - Native Bitcoin addresses
- **Ethereum (ETH)** - Standard Ethereum addresses  
- **USDT (Tether)** - ERC-20 token on Ethereum network
- **Litecoin (LTC)** - Native Litecoin addresses

## 🔧 Configuration Steps

### Step 1: Set Up Your Wallet Addresses

Add your wallet addresses to `.env.local`:

```env
# Cryptocurrency Wallet Addresses (NEXT_PUBLIC_ prefix makes them available in browser)
NEXT_PUBLIC_CRYPTO_WALLET_BITCOIN=your-bitcoin-address-here
NEXT_PUBLIC_CRYPTO_WALLET_ETHEREUM=your-ethereum-address-here
NEXT_PUBLIC_CRYPTO_WALLET_USDT=your-usdt-address-here
NEXT_PUBLIC_CRYPTO_WALLET_LITECOIN=your-litecoin-address-here
```

### Step 2: Replace with Your Actual Addresses

**Example Configuration:**
```env
NEXT_PUBLIC_CRYPTO_WALLET_BITCOIN=bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh
NEXT_PUBLIC_CRYPTO_WALLET_ETHEREUM=0x742d35Cc6634C0532925a3b8D4C9db96590b5c8e
NEXT_PUBLIC_CRYPTO_WALLET_USDT=0x742d35Cc6634C0532925a3b8D4C9db96590b5c8e
NEXT_PUBLIC_CRYPTO_WALLET_LITECOIN=ltc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4
```

## 📋 Address Format Requirements

### Bitcoin (BTC)
- **Format**: Bech32 (starts with `bc1`) or Legacy (starts with `1` or `3`)
- **Example**: `bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh`
- **Recommended**: Use Bech32 format for lower fees

### Ethereum (ETH)
- **Format**: Hexadecimal address starting with `0x`
- **Example**: `0x742d35Cc6634C0532925a3b8D4C9db96590b5c8e`
- **Length**: Exactly 42 characters (including 0x)

### USDT (Tether)
- **Network**: Ethereum (ERC-20)
- **Format**: Same as Ethereum address
- **Example**: `0x742d35Cc6634C0532925a3b8D4C9db96590b5c8e`
- **Note**: Can use the same address as Ethereum

### Litecoin (LTC)
- **Format**: Bech32 (starts with `ltc1`) or Legacy (starts with `L` or `M`)
- **Example**: `ltc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4`
- **Recommended**: Use Bech32 format for consistency

## 🔒 Security Best Practices

### 1. Use Hardware Wallets
- **Recommended**: Ledger, Trezor, or similar hardware wallets
- **Why**: Private keys never leave the device
- **Setup**: Generate addresses from your hardware wallet

### 2. Separate Business Wallets
- **Don't**: Use personal wallet addresses
- **Do**: Create dedicated business wallet addresses
- **Benefit**: Better accounting and security separation

### 3. Multi-Signature Wallets
- **Consider**: Multi-sig wallets for large amounts
- **Benefit**: Requires multiple signatures to spend funds
- **Tools**: Gnosis Safe (Ethereum), Electrum (Bitcoin)

## 🔄 How It Works

### 1. QR Code Generation
- QR codes are automatically generated from wallet addresses
- Users scan QR codes to get the exact wallet address
- No manual typing required - reduces errors

### 2. Payment Flow
1. User selects cryptocurrency
2. System displays your wallet address + QR code
3. User sends payment to your address
4. User submits transaction hash for verification
5. Admin verifies and approves deposit

### 3. Multi-Currency Support
- Each cryptocurrency needs a separate wallet address
- USDT can share the same address as Ethereum (ERC-20)
- System automatically shows correct address based on selection

## 🛠️ Testing Your Configuration

### 1. Restart Development Server
```bash
npm run dev
```

### 2. Test Each Cryptocurrency
1. Go to `/dashboard/deposit`
2. Select each cryptocurrency
3. Verify your wallet address appears
4. Check QR code generates correctly

### 3. Verify Address Formats
- Bitcoin: Should start with `bc1`, `1`, or `3`
- Ethereum/USDT: Should start with `0x` and be 42 characters
- Litecoin: Should start with `ltc1`, `L`, or `M`

## 📊 Monitoring Payments

### 1. Transaction Verification
- Users must provide transaction hash after payment
- Admin can verify payments on blockchain explorers:
  - Bitcoin: blockchain.info, blockchair.com
  - Ethereum/USDT: etherscan.io
  - Litecoin: blockchair.com

### 2. Admin Interface
- Access `/admin/deposits` to review payments
- Verify transaction hashes on blockchain
- Approve/decline deposits with admin notes

## 🚨 Important Notes

### Environment Variables
- Use `NEXT_PUBLIC_` prefix for browser-accessible variables
- Wallet addresses are public information (safe to expose)
- Private keys should NEVER be in environment variables

### Network Considerations
- Ensure USDT is on Ethereum network (ERC-20)
- Bitcoin and Litecoin use their native networks
- Double-check network compatibility with your wallets

### Backup Strategy
- Keep secure backups of wallet private keys/seed phrases
- Test recovery process before going live
- Document wallet setup for team members

## 🔧 Troubleshooting

### QR Code Not Updating
- Clear browser cache
- Restart development server
- Check environment variable names

### Invalid Address Format
- Verify address format matches requirements
- Test addresses with small amounts first
- Use blockchain explorers to validate addresses

### Environment Variables Not Loading
- Ensure `.env.local` is in project root
- Use `NEXT_PUBLIC_` prefix for client-side variables
- Restart development server after changes
