import { z } from "zod";

/**
 * Tool parameters schema - defines the input parameters for the ERC-20 transfer tool
 */
export const toolParamsSchema = z.object({
  to: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid Ethereum address"),
  amount: z
    .string()
    .regex(/^\d*\.?\d+$/, "Invalid amount format")
    .refine((val) => parseFloat(val) > 0, "Amount must be greater than 0"),
  tokenAddress: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, "Invalid token contract address"),
  tokenDecimals: z
    .number()
    .int()
    .min(0, "Token decimals must be non-negative")
    .max(18, "Token decimals must not exceed 18")
    .default(18), // Default to 18 decimals (most common for ERC-20 tokens)
  rpcUrl: z
    .string()
    .url("Invalid RPC URL format")
    .optional()
    .default("https://yellowstone-rpc.litprotocol.com/"),
  chainId: z
    .number()
    .int()
    .positive("Chain ID must be a positive integer")
    .optional()
    .default(8453), // Default to Base mainnet
});

/**
 * Precheck success result schema
 */
export const precheckSuccessSchema = z.object({
  addressValid: z.boolean(),
  amountValid: z.boolean(),
  tokenAddressValid: z.boolean(),
  estimatedGas: z.number().optional(),
});

/**
 * Precheck failure result schema
 */
export const precheckFailSchema = z.object({
  error: z.string(),
});

/**
 * Execute success result schema
 */
export const executeSuccessSchema = z.object({
  txHash: z.string(),
  to: z.string(),
  amount: z.string(),
  tokenAddress: z.string(),
  timestamp: z.number(),
});

/**
 * Execute failure result schema
 */
export const executeFailSchema = z.object({
  error: z.string(),
});

// Type exports
export type ToolParams = z.infer<typeof toolParamsSchema>;
export type PrecheckSuccess = z.infer<typeof precheckSuccessSchema>;
export type PrecheckFail = z.infer<typeof precheckFailSchema>;
export type ExecuteSuccess = z.infer<typeof executeSuccessSchema>;
export type ExecuteFail = z.infer<typeof executeFailSchema>;