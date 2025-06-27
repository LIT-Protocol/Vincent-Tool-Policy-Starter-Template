# erc20-transfer

A Vincent tool for secure ERC-20 token transfers with integrated policy-based governance, balance validation, and multi-network support.

## Overview

The `erc20-transfer` tool enables secure ERC-20 token transfers through the Vincent Framework, providing:

- **Secure ERC-20 token transfers** using PKP (Programmable Key Pair) wallets
- **Multi-token support** with configurable token decimals and addresses
- **Policy-based governance** with integrated rate limiting
- **Comprehensive balance validation** for both native gas fees and token amounts
- **Multi-network support** with configurable RPC endpoints and chain IDs
- **Real-time transaction execution** with detailed logging and error handling

## Key Features

### 🪙 ERC-20 Token Support
- Support for any ERC-20 token with configurable decimals (0-18)
- Automatic token amount parsing based on decimal places
- Token balance validation before transfer execution
- Standard ERC-20 transfer function integration

### 🔐 PKP-Based Security
- Uses Lit Protocol's PKP wallets for secure transaction signing
- Delegated execution with proper permission validation
- No private key exposure during transaction execution

### 🚦 Policy Integration
- Integrated with `send-counter-limit` policy for rate limiting
- Configurable transaction limits per time window
- Automatic policy enforcement during execution

### 🌐 Multi-Network Support
- Configurable RPC endpoints for different networks
- Chain ID specification for network compatibility
- Default support for Base network
- Support for any EVM-compatible network

### ✅ Comprehensive Validation
- Ethereum address format validation for recipient and token contract
- Token amount validation with reasonable limits (max 1,000,000 tokens)
- Token decimals validation (0-18 decimal places)
- Native balance validation for gas fees
- Token balance validation before transfer

## Parameters

### Required Parameters

| Parameter | Type | Validation | Description |
|-----------|------|------------|-------------|
| `to` | `string` | Ethereum address format (0x...) | Recipient address |
| `amount` | `string` | Positive number, max 1,000,000 | Transfer amount in token units |
| `tokenAddress` | `string` | Ethereum address format (0x...) | ERC-20 token contract address |
| `tokenDecimals` | `number` | 0-18, default 18 | Number of decimal places for the token |

### Optional Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `rpcUrl` | `string` | `"https://yellowstone-rpc.litprotocol.com/"` | Custom RPC endpoint |
| `chainId` | `number` | `8453` (Base) | Network chain ID |

## Usage Examples

### USDC Transfer on Base Network
```typescript
const transferParams = {
  to: "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
  amount: "10.50",
  tokenAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // Base USDC
  tokenDecimals: 6,
  rpcUrl: "https://base.llamarpc.com",
  chainId: 8453
};
```

### Custom Token Transfer
```typescript
const transferParams = {
  to: "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
  amount: "100.0",
  tokenAddress: "0xYourTokenContractAddress",
  tokenDecimals: 18, // Standard ERC-20 with 18 decimals
  rpcUrl: "https://mainnet.infura.io/v3/YOUR_PROJECT_ID",
  chainId: 1 // Ethereum mainnet
};
```

### Small Amount Transfer (for testing)
```typescript
const transferParams = {
  to: "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
  amount: "0.000001", // 0.000001 USDC = $0.000001
  tokenAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  tokenDecimals: 6
};
```

## Execution Flow

### 1. Precheck Phase
- Validates recipient address format
- Validates token contract address format
- Validates transfer amount (positive, reasonable limits)
- Validates token decimals (0-18 range)
- Validates RPC URL format (if provided)
- Validates chain ID (if provided)
- Returns validation status

### 2. Execute Phase
- Connects to specified RPC endpoint
- Retrieves PKP public key from delegation context
- Converts PKP public key to Ethereum address
- Parses token amount using specified decimals
- Validates native balance for gas fees
- Validates token balance for transfer amount
- Executes ERC-20 transfer using `laUtils.transaction.handler.contractCall`
- Triggers policy commit phase for rate limiting
- Returns transaction hash and metadata

## Policy Integration

The tool automatically integrates with the `send-counter-limit` policy:

- **Precheck**: Validates tool parameters
- **Execute**: Performs the actual ERC-20 transfer
- **Policy Commit**: Records the transaction for rate limiting

### Policy Configuration
```typescript
// Example: Allow 2 ERC-20 transfers per 10 seconds
const policyConfig = {
  maxSends: 2n,
  timeWindowSeconds: 10n
};
```

## Error Handling

The tool provides detailed error messages for various failure scenarios:

### Address Validation Errors
```
"Invalid recipient address format"
"Invalid token contract address format"
```

### Amount Validation Errors
```
"Invalid amount format or amount must be greater than 0"
"Amount too large (maximum 1,000,000 tokens per transaction)"
```

### Balance Validation Errors
```
"Insufficient native balance for gas. Need 0.0001 ETH, but only have 0.00005 ETH"
"Insufficient token balance. Need 100.0 tokens, but only have 50.0 tokens"
```

### Network Errors
```
"Invalid RPC URL format"
"Invalid chain ID - must be a positive integer"
"PKP public key not available from delegation context"
```

### Transaction Errors
```
"Unknown error occurred"
```

## Response Format

### Success Response
```typescript
{
  txHash: "0x...",
  to: "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
  amount: "10.50",
  tokenAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  timestamp: 1703123456789
}
```

### Error Response
```typescript
{
  error: "Detailed error message"
}
```

## Development

### Building
```bash
npm install
npm run build
```

### Testing
This tool is tested through the Vincent E2E testing framework:
- `npm run vincent:e2e:erc20` - Tests ERC-20 transfers with rate limiting

### Architecture

The tool follows the Vincent two-phase execution model:

1. **Precheck** - Parameter validation outside Lit Actions
2. **Execute** - Transaction execution within Lit Actions

## Security Considerations

- **Amount limits**: Maximum 1,000,000 tokens per transaction prevents large accidental transfers
- **Address validation**: Strict Ethereum address format validation for both recipient and token contract
- **Balance validation**: Comprehensive checks for both native gas fees and token balances
- **PKP security**: Uses Lit Protocol's secure PKP system
- **Policy enforcement**: Integrated rate limiting prevents abuse
- **Network validation**: RPC URL and chain ID validation prevents malicious endpoints

## Network Support

### Default Network
- **Base Mainnet** via Yellowstone RPC
- Chain ID: 8453
- RPC URL: `https://yellowstone-rpc.litprotocol.com/`

### Supported Networks
- **Base Mainnet** (Chain ID: 8453)
- **Ethereum Mainnet** (Chain ID: 1)
- **Polygon** (Chain ID: 137)
- **Arbitrum** (Chain ID: 42161)
- **Any EVM-compatible network**

### Popular Token Addresses

#### Base Network
- **USDC**: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` (6 decimals)
- **WETH**: `0x4200000000000000000000000000000000000006` (18 decimals)

#### Ethereum Mainnet
- **USDC**: `0xA0b86a33E6441b8C4C8C8C8C8C8C8C8C8C8C8C8` (6 decimals)
- **USDT**: `0xdAC17F958D2ee523a2206206994597C13D831ec7` (6 decimals)

## Dependencies

- `@lit-protocol/vincent-scaffold-sdk` - Core Vincent framework
- `@lit-protocol/vincent-tool-sdk` - Tool development framework
- `ethers.js` - Blockchain interaction
- `zod` - Schema validation and type safety