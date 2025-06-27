# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

The Vincent Scaffold SDK is a development framework for creating **Vincent Tools** and **Vincent Policies** that execute on Lit Actions - a blockchain-based execution environment with specific constraints.

## Common Development Commands

### Vincent Project Commands

```bash
npm run vincent:build        # Build all tools and policies (erc20-transfer, native-send, send-counter-limit)
npm run vincent:e2e          # Run native send E2E tests with policy integration
npm run vincent:e2e:erc20    # Run ERC-20 transfer E2E tests with policy integration
npm run vincent:e2e:reset    # Delete .e2e-state.json to reset test state
npm run vincent:hardreset    # Clean all dist/, node_modules/, package-lock.json files
```

### Smart Contract Commands (Foundry required)

```bash
npm run vincent:forge:check  # Verify Foundry installation
npm run vincent:forge:init   # Initialize counter contract and deploy to Yellowstone
npm run vincent:forge:deploy # Deploy counter contract to Yellowstone chain
npm run vincent:gen-abi      # Generate ABI signatures from deployed contracts
```

### CLI Commands

```bash
npx @lit-protocol/vincent-scaffold-sdk init                    # Initialize Vincent project
npx @lit-protocol/vincent-scaffold-sdk add tool <name>         # Create new tool
npx @lit-protocol/vincent-scaffold-sdk add policy <name>       # Create new policy
npx @lit-protocol/vincent-scaffold-sdk pkg build               # Build current package (from tool/policy dir)
npx @lit-protocol/vincent-scaffold-sdk pkg deploy              # Deploy current package
npx @lit-protocol/vincent-scaffold-sdk pkg clean               # Clean dist files
```

## Architecture Overview

### Dual Package Structure

- **Vincent Tools**: Executable actions that perform operations (e.g., sending tokens, calling APIs)
- **Vincent Policies**: Governance rules that control when/how tools can execute (e.g., rate limiting, access control)

### Current Project Implementation

This project implements a **complete blockchain transaction system** with:

- **`erc20-transfer` tool** - Configurable ERC-20 token transfers with network flexibility
- **`native-send` tool** - Native ETH transfers on Yellowstone chain
- **`send-counter-limit` policy** - Rate limiting policy using smart contract state
- **Comprehensive E2E tests** - Integration testing for both tools with policy enforcement

**Project Configuration** (vincent.json):
```json
{
  "package": {
    "namespace": "@agentic-ai",
    "toolPrefix": "vincent-tool-",
    "policyPrefix": "vincent-policy-"
  }
}
```

### Lit Actions Environment Constraints

Tools and policies execute in Lit Actions, which has critical limitations:

- **No `globalThis`** - Standard global objects are not available
- **No `process.env`** - Environment variables are not accessible
- **No persistent memory** - State doesn't persist between executions
- **Must use external state** - Smart contracts or third-party services for data persistence

### Template System

The SDK uses a template-based code generation system:

- Templates in `src/templates/` with `{{variable}}` placeholders
- Variable substitution during project creation
- Separate templates for tools (`src/templates/tool/`) and policies (`src/templates/policy/`)

### E2E Testing Framework

Integrated testing system with:

- State management via `.e2e-state.json`
- PKP (Programmable Key Pair) minting and management
- Account setup and funding automation
- Yellowstone blockchain integration

## Key Development Patterns

### Vincent Configuration

This project uses the following `vincent.json` configuration:

```json
{
  "package": {
    "namespace": "@agentic-ai",
    "toolPrefix": "vincent-tool-",
    "policyPrefix": "vincent-policy-"
  },
  "directories": {
    "tools": "./vincent-packages/tools",
    "policies": "./vincent-packages/policies"
  }
}
```

### Schema-Driven Development

All tools and policies use Zod schemas for validation:

- `toolParamsSchema` - Input parameters for tools
- `userParamsSchema` - User-provided configuration for policies
- `precheckSuccessSchema`/`precheckFailSchema` - Precheck result schemas
- `executeSuccessSchema`/`executeFailSchema` - Execution result schemas

### Tool Structure

Tools implement three phases:

1. **Precheck**: Validate inputs before execution
2. **Execute**: Perform the actual operation
3. **Policy Integration**: Work with policies for governance

### Policy Structure

Policies implement three phases:

1. **Precheck**: Early validation and rate limiting
2. **Evaluate**: Runtime checks during tool execution
3. **Commit**: Record state changes after successful execution

### Chain Integration

Uses Yellowstone chain (Lit Protocol's test network):

- Provider setup via `laUtils.chain.getYellowstoneProvider()`
- Transaction utilities in `laUtils.transaction.handler`
- PKP-based signing for blockchain interactions

## Important File Locations

### Current Project Structure

- `vincent-packages/tools/erc20-transfer/` - ERC-20 token transfer tool
- `vincent-packages/tools/native-send/` - Native ETH transfer tool
- `vincent-packages/policies/send-counter-limit/` - Rate limiting policy
- `vincent-e2e/src/e2e.ts` - Native send E2E tests
- `vincent-e2e/src/e2e-erc20.ts` - ERC-20 transfer E2E tests
- `vincent.json` - Project configuration
- `.env` - Environment variables for testing and deployment

### Key Implementation Files

- `vincent-packages/tools/erc20-transfer/src/lib/vincent-tool.ts` - ERC-20 tool implementation
- `vincent-packages/tools/erc20-transfer/src/lib/schemas.ts` - ERC-20 validation schemas
- `vincent-packages/tools/erc20-transfer/src/lib/helpers/` - ERC-20 helper functions
- `vincent-packages/policies/send-counter-limit/src/lib/vincent-policy.ts` - Policy implementation

## Development Environment Setup

1. Initialize Vincent project: `npx @lit-protocol/vincent-scaffold-sdk init`
2. Copy `.env.vincent-sample` to `.env` and configure:
   - `VINCENT_ADDRESS` - Vincent contract address
   - `TEST_FUNDER_PRIVATE_KEY` - Account for funding operations
   - `TEST_APP_MANAGER_PRIVATE_KEY` - App management account
   - `TEST_AGENT_WALLET_PKP_OWNER_PRIVATE_KEY` - PKP owner account
   - `TEST_APP_DELEGATEE_PRIVATE_KEY` - Delegatee account
   - Yellowstone and Base RPC URLs
3. Run `npm install` to install dependencies
4. Run `npm run vincent:build` to build examples
5. Run `npm run vincent:e2e` to test setup

## Testing

The SDK includes a comprehensive E2E testing framework that:

- Manages blockchain accounts and funding
- Handles PKP minting and permissions
- Provides utilities for contract interaction
- Maintains test state across runs

Key test utilities are exported from `@lit-protocol/vincent-scaffold-sdk/e2e`.

### Current Implementation Status

**✅ Working Components:**
- ERC-20 transfer tool with configurable networks and validation
- Native send tool with Yellowstone chain integration
- Send counter limit policy with smart contract state management
- Comprehensive build system with automatic tool/policy discovery

**🔧 Testing Status:**
- E2E tests implemented for both tools with policy integration
- Test state management via `.e2e-state.json`
- PKP minting and account funding automation

**🛠 Current Build Configuration:**
The build script automatically discovers and builds all tools and policies in `vincent-packages/` directories using a loop-based approach for scalability.

## Vincent-Specific Coding Patterns

### ❌ Forbidden Patterns in Tools/Policies

```typescript
// NEVER use these in Vincent tools or policies:
globalThis.someGlobal; // Not available in Lit Actions
process.env.MY_VAR; // Environment variables not accessible
const mockData = { fake: "data" }; // Never use mock/fake data
```

### ✅ Required Patterns

#### Schema Definition

```typescript
import { z } from "zod";

// Always define schemas first
export const toolParamsSchema = z.object({
  to: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid address"),
  amount: z.string().regex(/^\d*\.?\d+$/, "Invalid amount"),
});

export type ToolParams = z.infer<typeof toolParamsSchema>;
```

#### Tool Implementation

```typescript
import { createVincentTool } from "@lit-protocol/vincent-tool-sdk";
import { laUtils } from "@lit-protocol/vincent-scaffold-sdk/la-utils";

export const vincentTool = createVincentTool({
  packageName: "{{packageName}}" as const,
  toolParamsSchema,

  precheck: async ({ toolParams }, { succeed, fail }) => {
    // Validation logic (NO laUtils here)
    if (!toolParams.to.startsWith("0x")) {
      return fail({ error: "Invalid address format" });
    }
    return succeed({ validated: true });
  },

  execute: async ({ toolParams }, { succeed, fail, delegation }) => {
    try {
      // laUtils ONLY available here (in Lit Actions context)
      const provider = new ethers.providers.JsonRpcProvider(
  "https://yellowstone-rpc.litprotocol.com/"
);
      const txHash = await laUtils.transaction.handler.nativeSend({
        provider,
        pkpPublicKey: delegation.delegatorPkpInfo.publicKey,
        amount: toolParams.amount,
        to: toolParams.to,
      });

      return succeed({ txHash, timestamp: Date.now() });
    } catch (error) {
      return fail({ error: error.message });
    }
  },
});
```

#### Policy Implementation

```typescript
export const vincentPolicy = createVincentPolicy({
  packageName: "{{packageName}}" as const,

  precheck: async ({ toolParams, userParams }, { allow, deny }) => {
    // Early validation (NO laUtils here)
    const currentCount = await checkLimitFromStorage(ethAddress);
    if (currentCount >= userParams.maxSends) {
      return deny({ reason: "Limit exceeded", currentCount });
    }
    return allow({
      currentCount,
      remainingSends: userParams.maxSends - currentCount,
    });
  },

  evaluate: async ({ toolParams, userParams }, { allow, deny }) => {
    // Runtime checks (laUtils available here)
    const result = await Lit.Actions.runOnce(
      { waitForResponse: true, name: "checkLimit" },
      async () => {
        // Policy evaluation logic with laUtils
        return checkSendLimit(ethAddress, maxSends, timeWindow);
      }
    );

    return result.allowed ? allow(result) : deny(result);
  },

  commit: async ({ currentCount, maxSends }, { allow, delegation }) => {
    // State recording (laUtils available here)
    const provider = new ethers.providers.JsonRpcProvider(
  "https://yellowstone-rpc.litprotocol.com/"
);
    await laUtils.transaction.handler.contractCall({
      provider,
      pkpPublicKey: delegation.delegatorPkpInfo.publicKey,
      // Contract call to record state
    });

    return allow({ recorded: true, newCount: currentCount + 1 });
  },
});
```

### Build Script Management

The current build system **automatically discovers** all tools and policies:

```json
{
  "scripts": {
    "vincent:build": "dotenv -e .env -- sh -c 'for dir in vincent-packages/policies/*/; do [ -d \"$dir\" ] && echo \"Building policy: $(basename \"$dir\")\" && cd \"$dir\" && npm install && npm run build && cd - > /dev/null; done && for dir in vincent-packages/tools/*/; do [ -d \"$dir\" ] && echo \"Building tool: $(basename \"$dir\")\" && cd \"$dir\" && npm install && npm run build && cd - > /dev/null; done'"
  }
}
```

**No manual updates required** when adding new tools/policies - the script automatically detects and builds all components in their respective directories.

### Template Variable Usage

When creating templates or modifying template files:

- `{{packageName}}` - Full package name (e.g., `@company/vincent-tool-name`)
- `{{name}}` - Component name (e.g., `my-tool`)
- `{{namespace}}` - Package namespace (e.g., `@company`)
- `{{policyPackageName}}` - For tools referencing policies

### Import Patterns

```typescript
// Tool/Policy development
import { laUtils } from "@lit-protocol/vincent-scaffold-sdk/la-utils";

// E2E testing
import { bundledVincentTool } from "../../vincent-packages/tools/my-tool/dist/index.js";
import { vincentPolicyMetadata } from "../../vincent-packages/policies/my-policy/dist/index.js";
```

## Critical Reminders

1. **Never use mock data** - If requirements unclear, ask for clarification
2. **laUtils context restrictions** - Only in execute/evaluate/commit hooks
3. **Build script updates** - Required when adding new components
4. **Schema-first development** - Define types before implementation
5. **Template variable consistency** - Use proper variable substitution patterns
