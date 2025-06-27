# native-send

A Vincent tool for secure native token (ETH) transfers with integrated policy-based governance and rate limiting capabilities.

## Overview

The `native-send` tool enables secure native token transfers through the Vincent Framework, providing:

- **Secure native token transfers** using PKP (Programmable Key Pair) wallets
- **Policy-based governance** with integrated rate limiting
- **Multi-network support** with configurable RPC endpoints
- **Comprehensive validation** for addresses, amounts, and network parameters
- **Real-time transaction execution** with detailed logging and error handling

## Key Features

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
- Default support for Base network (Yellowstone RPC)
- Chain ID validation and network compatibility checks

### ✅ Comprehensive Validation
- Ethereum address format validation
- Amount validation with reasonable limits (max 1.0 ETH per transaction)
- RPC URL format validation
- Gas estimation and balance checks

## Parameters

### Required Parameters

| Parameter | Type | Validation | Description |
|-----------|------|------------|-------------|
| `to` | `string` | Ethereum address format (0x...) | Recipient address |
| `amount` | `string` | Positive number, max 1.0 | Transfer amount in ETH |

### Optional Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `rpcUrl` | `string` | `"https://yellowstone-rpc.litprotocol.com/"` | Custom RPC endpoint |

## Usage Examples

### Basic Native Transfer
```typescript
const transferParams = {
  to: "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
  amount: "0.001"
};
```

### Custom Network Transfer
```typescript
const transferParams = {
  to: "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
  amount: "0.001",
  rpcUrl: "https://mainnet.infura.io/v3/YOUR_PROJECT_ID"
};
```

### Small Amount Transfer (for testing)
```typescript
const transferParams = {
  to: "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
  amount: "0.00001" // 0.00001 ETH = ~$0.02
};
```

## Execution Flow

### 1. Precheck Phase
- Validates recipient address format
- Validates transfer amount (positive, reasonable limits)
- Validates RPC URL format (if provided)
- Returns validation status

### 2. Execute Phase
- Connects to specified RPC endpoint
- Retrieves PKP public key from delegation context
- Executes native token transfer using `laUtils.transaction.handler.nativeSend`
- Triggers policy commit phase for rate limiting
- Returns transaction hash and metadata

## Policy Integration

The tool automatically integrates with the `send-counter-limit` policy:

- **Precheck**: Validates tool parameters
- **Execute**: Performs the actual transfer
- **Policy Commit**: Records the transaction for rate limiting

### Policy Configuration
```typescript
// Example: Allow 2 sends per 10 seconds
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
```

### Amount Validation Errors
```
"Invalid amount format or amount must be greater than 0"
"Amount too large (maximum 1.0 ETH per transaction)"
```

### Network Errors
```
"Invalid RPC URL format"
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
  amount: "0.001",
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
- `npm run vincent:e2e` - Tests native transfers with rate limiting

### Architecture

The tool follows the Vincent two-phase execution model:

1. **Precheck** - Parameter validation outside Lit Actions
2. **Execute** - Transaction execution within Lit Actions

## Security Considerations

- **Amount limits**: Maximum 1.0 ETH per transaction prevents large accidental transfers
- **Address validation**: Strict Ethereum address format validation
- **PKP security**: Uses Lit Protocol's secure PKP system
- **Policy enforcement**: Integrated rate limiting prevents abuse
- **Network validation**: RPC URL validation prevents malicious endpoints

## Network Support

### Default Network
- **Base Mainnet** via Yellowstone RPC
- Chain ID: 8453
- RPC URL: `https://yellowstone-rpc.litprotocol.com/`

### Custom Networks
- Support for any EVM-compatible network
- Configurable via `rpcUrl` parameter
- Automatic chain ID detection

## Dependencies

- `@lit-protocol/vincent-scaffold-sdk` - Core Vincent framework
- `@lit-protocol/vincent-tool-sdk` - Tool development framework
- `ethers.js` - Blockchain interaction
- `zod` - Schema validation and type safety