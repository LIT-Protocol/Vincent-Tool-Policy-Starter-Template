import {
  createVincentTool,
  createVincentToolPolicy,
  supportedPoliciesForTool,
} from "@lit-protocol/vincent-tool-sdk";
import "@lit-protocol/vincent-tool-sdk/internal";
import { bundledVincentPolicy } from "../../../../policies/send-counter-limit/dist/index.js";

import {
  executeFailSchema,
  executeSuccessSchema,
  precheckFailSchema,
  precheckSuccessSchema,
  toolParamsSchema,
} from "./schemas";

import { laUtils } from "@lit-protocol/vincent-scaffold-sdk";
import {
  ERC20_TRANSFER_ABI,
  isValidAddress,
  isValidAmount,
  parseTokenAmount,
} from "./helpers";

const SendLimitPolicy = createVincentToolPolicy({
  toolParamsSchema,
  bundledVincentPolicy,
  toolParameterMappings: {
    to: "to",
    amount: "amount",
  },
});

export const vincentTool = createVincentTool({
  packageName: "@agentic-ai/vincent-tool-erc20-transfer" as const,
  toolParamsSchema,
  supportedPolicies: supportedPoliciesForTool([SendLimitPolicy]),

  precheckSuccessSchema,
  precheckFailSchema,

  executeSuccessSchema,
  executeFailSchema,

  precheck: async ({ toolParams }, { succeed, fail }) => {
    console.log("[@agentic-ai/vincent-tool-erc20-transfer/precheck]");
    console.log("[@agentic-ai/vincent-tool-erc20-transfer/precheck] params:", {
      toolParams,
    });

    const { to, amount, tokenAddress, rpcUrl, chainId } = toolParams;

    // Validate recipient address
    if (!isValidAddress(to)) {
      return fail({
        error:
          "[@agentic-ai/vincent-tool-erc20-transfer/precheck] Invalid recipient address format",
      });
    }

    // Validate amount
    if (!isValidAmount(amount)) {
      return fail({
        error:
          "[@agentic-ai/vincent-tool-erc20-transfer/precheck] Invalid amount format or amount must be greater than 0",
      });
    }

    // Validate token contract address
    if (!isValidAddress(tokenAddress)) {
      return fail({
        error:
          "[@agentic-ai/vincent-tool-erc20-transfer/precheck] Invalid token contract address format",
      });
    }

    // Validate RPC URL if provided
    if (rpcUrl && typeof rpcUrl === "string") {
      try {
        new URL(rpcUrl);
      } catch {
        return fail({
          error:
            "[@agentic-ai/vincent-tool-erc20-transfer/precheck] Invalid RPC URL format",
        });
      }
    }

    // Validate chain ID if provided
    if (chainId && (typeof chainId !== "number" || chainId <= 0)) {
      return fail({
        error:
          "[@agentic-ai/vincent-tool-erc20-transfer/precheck] Invalid chain ID - must be a positive integer",
      });
    }

    // Additional validation: check if amount is reasonable (prevent very large transfers)
    const amountFloat = parseFloat(amount);
    if (amountFloat > 1000000) {
      return fail({
        error:
          "[@agentic-ai/vincent-tool-erc20-transfer/precheck] Amount too large (maximum 1,000,000 tokens per transaction)",
      });
    }

    // Precheck succeeded
    const successResult = {
      addressValid: true,
      amountValid: true,
      tokenAddressValid: true,
    };

    console.log(
      "[@agentic-ai/vincent-tool-erc20-transfer/precheck] Success result:",
      successResult
    );
    const successResponse = succeed(successResult);
    console.log(
      "[ERC20TransferTool/precheck] Success response:",
      JSON.stringify(successResponse, null, 2)
    );
    return successResponse;
  },

  execute: async (
    { toolParams },
    { succeed, fail, delegation, policiesContext }
  ) => {
    try {
      const { to, amount, tokenAddress, rpcUrl, chainId } = toolParams;

      console.log(
        "[@agentic-ai/vincent-tool-erc20-transfer/execute] Executing ERC-20 Transfer Tool",
        {
          to,
          amount,
          tokenAddress,
          rpcUrl,
          chainId,
        }
      );

      // Get provider - configurable by user via rpcUrl and chainId parameters
      const finalRpcUrl = rpcUrl;
      const finalChainId = chainId;

      const provider = new ethers.providers.JsonRpcProvider(
        finalRpcUrl,
        finalChainId
      );

      console.log(
        "[@agentic-ai/vincent-tool-erc20-transfer/execute] Using RPC URL:",
        finalRpcUrl
      );
      console.log(
        "[@agentic-ai/vincent-tool-erc20-transfer/execute] Using Chain ID:",
        finalChainId
      );

      // Get PKP public key from delegation context
      const pkpPublicKey = delegation.delegatorPkpInfo.publicKey;
      if (!pkpPublicKey) {
        throw new Error("PKP public key not available from delegation context");
      }

      // Get the PKP address to use as callerAddress
      const callerAddress = laUtils.helpers.toEthAddress(pkpPublicKey);

      console.log(
        "[@agentic-ai/vincent-tool-erc20-transfer/execute] PKP wallet address:",
        callerAddress
      );

      // Get token decimals for amount calculation (default to 6 for USDC)
      let tokenDecimals = 6; // Default for USDC on Base
      console.log(
        "[@agentic-ai/vincent-tool-erc20-transfer/execute] Using default decimals:",
        tokenDecimals
      );

      // Parse amount to token units using decimals
      const tokenAmountInWei = parseTokenAmount(amount, tokenDecimals);
      console.log(
        "[@agentic-ai/vincent-tool-erc20-transfer/execute] Transfer amount:",
        ethers.utils.formatUnits(tokenAmountInWei, tokenDecimals)
      );

      // Prepare contract call data for ERC-20 transfer
      const contractCallData = {
        provider,
        pkpPublicKey,
        callerAddress,
        contractAddress: tokenAddress,
        abi: ERC20_TRANSFER_ABI,
        functionName: "transfer",
        args: [to, tokenAmountInWei],
        chainId: finalChainId,
      };

      console.log(
        "[@agentic-ai/vincent-tool-erc20-transfer/execute] Contract call parameters:",
        {
          contractAddress: tokenAddress,
          functionName: "transfer",
          args: [to, tokenAmountInWei],
          callerAddress,
        }
      );

      // Execute the ERC-20 transfer using laUtils
      const txHash = await laUtils.transaction.handler.contractCall(
        contractCallData
      );

      console.log(
        "[@agentic-ai/vincent-tool-erc20-transfer/execute] ERC-20 transfer successful",
        {
          txHash,
          to,
          amount,
          tokenAddress,
        }
      );

      // Manually call policy commit function using the correct pattern
      console.log(
        "[@agentic-ai/vincent-tool-erc20-transfer/execute] Manually calling policy commit function..."
      );

      try {
        // Use the correct pattern from the reference code
        const sendLimitPolicyContext =
          policiesContext.allowedPolicies[
            "@agentic-ai/vincent-policy-send-counter-limit"
          ];

        if (
          sendLimitPolicyContext &&
          sendLimitPolicyContext.commit &&
          sendLimitPolicyContext.result
        ) {
          console.log(
            "[@agentic-ai/vincent-tool-erc20-transfer/execute] ✅ Found send limit policy context, calling commit..."
          );
          console.log(
            "[@agentic-ai/vincent-tool-erc20-transfer/execute] ✅ Policy evaluation result:",
            sendLimitPolicyContext.result
          );

          // Extract the commit parameters from the policy evaluation results
          const { currentCount, maxSends, remainingSends, timeWindowSeconds } =
            sendLimitPolicyContext.result;
          const commitParams = {
            currentCount,
            maxSends,
            remainingSends,
            timeWindowSeconds,
          };

          console.log(
            "[@agentic-ai/vincent-tool-erc20-transfer/execute] ✅ Available in sendLimitPolicyContext:",
            Object.keys(sendLimitPolicyContext)
          );
          console.log(
            "[@agentic-ai/vincent-tool-erc20-transfer/execute] ✅ Calling commit with explicit parameters..."
          );

          const commitResult = await sendLimitPolicyContext.commit(
            // @ts-ignore - TypeScript signature is wrong, framework actually expects parameters
            commitParams
          );
          console.log(
            "[@agentic-ai/vincent-tool-erc20-transfer/execute] ✅ Policy commit result:",
            commitResult
          );
        } else {
          console.log(
            "[@agentic-ai/vincent-tool-erc20-transfer/execute] ❌ Send limit policy context not found in policiesContext.allowedPolicies"
          );
          console.log(
            "[@agentic-ai/vincent-tool-erc20-transfer/execute] ❌ Available policies:",
            Object.keys(policiesContext.allowedPolicies || {})
          );
        }
      } catch (commitError) {
        console.error(
          "[@agentic-ai/vincent-tool-erc20-transfer/execute] ❌ Error calling policy commit:",
          commitError
        );
        // Don't fail the transaction if commit fails
      }

      return succeed({
        txHash,
        to,
        amount,
        tokenAddress,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error(
        "[@agentic-ai/vincent-tool-erc20-transfer/execute] ERC-20 transfer failed",
        error
      );

      // Provide more specific error messages for common ERC-20 failures
      let errorMessage = "Unknown error occurred";
      if (error instanceof Error) {
        errorMessage = error.message;
      }

      return fail({
        error: errorMessage,
      });
    }
  },
});
