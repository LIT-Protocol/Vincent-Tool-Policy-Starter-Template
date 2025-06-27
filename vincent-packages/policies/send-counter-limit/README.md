# send-counter-limit

A Vincent policy that enforces rate limiting for blockchain transactions by tracking and limiting the number of sends within a configurable time window.

## Overview

The `send-counter-limit` policy implements a sophisticated rate limiting mechanism that:

- **Tracks transaction counts** per user address using on-chain storage
- **Enforces time-based limits** with configurable windows (1 second to 7 days)
- **Provides real-time validation** during both precheck and execution phases
- **Automatically resets counters** when time windows expire
- **Integrates seamlessly** with Vincent tools for native and ERC-20 transfers

## Key Features

### 🚦 Three-Phase Execution
1. **Precheck Phase** - Early validation outside Lit Actions context
2. **Evaluate Phase** - Runtime checks within Lit Actions execution
3. **Commit Phase** - Records successful transactions to on-chain storage

### ⏱️ Configurable Limits
- **Maximum sends**: 1-100 transactions per time window
- **Time window**: 1 second to 7 days (604,800 seconds)
- **Default settings**: 2 sends per 10 seconds (for testing)

### 🔒 Smart Contract Integration
- Uses on-chain counter contract for persistent state
- Automatically handles counter resets when time windows expire
- Provides atomic transaction recording

## Parameters

### User Parameters (Policy Configuration)

| Parameter | Type | Range | Default | Description |
|-----------|------|-------|---------|-------------|
| `maxSends` | `bigint` | 1-100 | `2` | Maximum number of sends allowed per time window |
| `timeWindowSeconds` | `bigint` | 1-604800 | `10` | Time window in seconds (max 7 days) |

### Tool Parameters (Automatically Mapped)

| Parameter | Type | Description |
|-----------|------|-------------|
| `to` | `string` | Recipient address (from tool) |
| `amount` | `string` | Transfer amount (from tool) |

## Usage Examples

### Basic Configuration
```typescript
// Allow 5 sends per hour
const policyConfig = {
  maxSends: 5n,
  timeWindowSeconds: 3600n // 1 hour
};
```

### Strict Rate Limiting
```typescript
// Allow only 1 send per minute
const policyConfig = {
  maxSends: 1n,
  timeWindowSeconds: 60n // 1 minute
};
```

### Daily Limits
```typescript
// Allow 10 sends per day
const policyConfig = {
  maxSends: 10n,
  timeWindowSeconds: 86400n // 24 hours
};
```

## Integration with Tools

This policy is designed to work with Vincent tools that perform blockchain transactions:

- **native-send** - Rate limits native token transfers
- **erc20-transfer** - Rate limits ERC-20 token transfers
- **Any custom tool** - Can be integrated with any Vincent tool

## Error Handling

The policy provides detailed error messages when limits are exceeded:

```
"Send limit exceeded. Maximum 2 sends per 10 seconds. Try again in 5 seconds."
```

Error responses include:
- `reason` - Human-readable error message
- `currentCount` - Current number of sends in the window
- `maxSends` - Maximum allowed sends
- `secondsUntilReset` - Time until counter resets

## Development

### Building
```bash
npm install
npm run build
```

### Testing
This policy is tested through the Vincent E2E testing framework:
- `npm run vincent:e2e` - Tests with native-send tool
- `npm run vincent:e2e:erc20` - Tests with erc20-transfer tool

### Architecture

The policy follows the Vincent three-phase execution model:

1. **Precheck** - Validates parameters and checks current limits
2. **Evaluate** - Performs runtime validation within Lit Actions
3. **Commit** - Records successful transactions to blockchain

## Security Considerations

- **On-chain state**: All counters are stored on-chain for tamper resistance
- **Time-based resets**: Automatic counter resets prevent permanent blocking
- **Atomic operations**: Transaction recording is atomic with the main transaction
- **Validation layers**: Multiple validation phases ensure consistent enforcement

## Dependencies

- `@lit-protocol/vincent-scaffold-sdk` - Core Vincent framework
- `ethers.js` - Blockchain interaction
- `zod` - Schema validation and type safety