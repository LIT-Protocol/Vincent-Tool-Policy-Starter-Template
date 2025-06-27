import { createVincentTool, createVincentToolPolicy, supportedPoliciesForTool, } from "@lit-protocol/vincent-tool-sdk";
import "@lit-protocol/vincent-tool-sdk/internal";
import { bundledVincentPolicy } from "../../../../policies/send-counter-limit/dist/index.js";
import { executeFailSchema, executeSuccessSchema, precheckFailSchema, precheckSuccessSchema, toolParamsSchema, } from "./schemas";
import { laUtils } from "@lit-protocol/vincent-scaffold-sdk";
import { ERC20_TRANSFER_ABI, isValidAddress, isValidAmount, parseTokenAmount, } from "./helpers";
import { commitAllowedPolicies } from "./helpers/commit-allowed-policies";
const SendLimitPolicy = createVincentToolPolicy({
    toolParamsSchema,
    bundledVincentPolicy,
    toolParameterMappings: {
        to: "to",
        amount: "amount",
    },
});
export const vincentTool = createVincentTool({
    packageName: "@agentic-ai/vincent-tool-erc20-transfer",
    toolParamsSchema,
    supportedPolicies: supportedPoliciesForTool([SendLimitPolicy]),
    precheckSuccessSchema,
    precheckFailSchema,
    executeSuccessSchema,
    executeFailSchema,
    precheck: async ({ toolParams }, { succeed, fail }) => {
        console.log("[@agentic-ai/vincent-tool-erc20-transfer/precheck] 🔍 Starting validation");
        console.log("[@agentic-ai/vincent-tool-erc20-transfer/precheck] 📋 params:", {
            toolParams,
        });
        const { to, amount, tokenAddress, rpcUrl, chainId } = toolParams;
        // Validate recipient address
        if (!isValidAddress(to)) {
            return fail({
                error: "[@agentic-ai/vincent-tool-erc20-transfer/precheck] ❌ Invalid recipient address format",
            });
        }
        // Validate amount
        if (!isValidAmount(amount)) {
            return fail({
                error: "[@agentic-ai/vincent-tool-erc20-transfer/precheck] ❌ Invalid amount format or amount must be greater than 0",
            });
        }
        // Validate token contract address
        if (!isValidAddress(tokenAddress)) {
            return fail({
                error: "[@agentic-ai/vincent-tool-erc20-transfer/precheck] ❌ Invalid token contract address format",
            });
        }
        // Validate RPC URL if provided
        if (rpcUrl && typeof rpcUrl === "string") {
            try {
                new URL(rpcUrl);
            }
            catch {
                return fail({
                    error: "[@agentic-ai/vincent-tool-erc20-transfer/precheck] ❌ Invalid RPC URL format",
                });
            }
        }
        // Validate chain ID if provided
        if (chainId && (typeof chainId !== "number" || chainId <= 0)) {
            return fail({
                error: "[@agentic-ai/vincent-tool-erc20-transfer/precheck] ❌ Invalid chain ID - must be a positive integer",
            });
        }
        // Additional validation: check if amount is reasonable (prevent very large transfers)
        const amountFloat = parseFloat(amount);
        if (amountFloat > 1000000) {
            return fail({
                error: "[@agentic-ai/vincent-tool-erc20-transfer/precheck] ❌ Amount too large (maximum 1,000,000 tokens per transaction)",
            });
        }
        // Precheck succeeded
        const successResult = {
            addressValid: true,
            amountValid: true,
            tokenAddressValid: true,
        };
        console.log("[@agentic-ai/vincent-tool-erc20-transfer/precheck] ✅ Success result:", successResult);
        const successResponse = succeed(successResult);
        console.log("[ERC20TransferTool/precheck] ✅ Success response:", JSON.stringify(successResponse, null, 2));
        return successResponse;
    },
    execute: async ({ toolParams }, { succeed, fail, delegation, policiesContext }) => {
        try {
            const { to, amount, tokenAddress, tokenDecimals, rpcUrl, chainId } = toolParams;
            console.log("[@agentic-ai/vincent-tool-erc20-transfer/execute] 🚀 Executing ERC-20 Transfer Tool", {
                to,
                amount,
                tokenAddress,
                rpcUrl,
                chainId,
            });
            // Get provider - configurable by user via rpcUrl and chainId parameters
            const finalRpcUrl = rpcUrl;
            const finalChainId = chainId;
            const provider = new ethers.providers.JsonRpcProvider(finalRpcUrl, finalChainId);
            console.log("[@agentic-ai/vincent-tool-erc20-transfer/execute] 🔗 Using RPC URL:", finalRpcUrl);
            console.log("[@agentic-ai/vincent-tool-erc20-transfer/execute] ⛓️ Using Chain ID:", finalChainId);
            // Get PKP public key from delegation context
            const pkpPublicKey = delegation.delegatorPkpInfo.publicKey;
            if (!pkpPublicKey) {
                return fail({
                    error: "[@agentic-ai/vincent-tool-erc20-transfer/execute] ❌ PKP public key not available from delegation context",
                });
            }
            // Get the PKP address to use as callerAddress
            const callerAddress = laUtils.helpers.toEthAddress(pkpPublicKey);
            console.log("[@agentic-ai/vincent-tool-erc20-transfer/execute] 🔑 PKP wallet address:", callerAddress);
            // Use provided token decimals for amount calculation
            console.log("[@agentic-ai/vincent-tool-erc20-transfer/execute] 🔢 Using token decimals:", tokenDecimals);
            // Parse amount to token units using decimals
            const tokenAmountInWei = parseTokenAmount(amount, tokenDecimals);
            console.log("[@agentic-ai/vincent-tool-erc20-transfer/execute] 💰 Transfer amount:", ethers.utils.formatUnits(tokenAmountInWei, tokenDecimals));
            // Check native balance for gas fees
            console.log("[@agentic-ai/vincent-tool-erc20-transfer/execute] 🔍 Checking native balance for gas...");
            try {
                const nativeBalance = await provider.getBalance(callerAddress);
                console.log("[@agentic-ai/vincent-tool-erc20-transfer/execute] 💰 Native balance (wei):", nativeBalance.toString());
                console.log("[@agentic-ai/vincent-tool-erc20-transfer/execute] 💰 Native balance (ETH):", ethers.utils.formatEther(nativeBalance));
                // Estimate gas needed for ERC-20 transfer (approximate)
                const estimatedGasLimit = 65000; // Conservative estimate for ERC-20 transfer
                const gasPrice = await provider.getGasPrice();
                const estimatedGasCost = gasPrice.mul(estimatedGasLimit);
                console.log("[@agentic-ai/vincent-tool-erc20-transfer/execute] ⛽ Estimated gas cost (wei):", estimatedGasCost.toString());
                console.log("[@agentic-ai/vincent-tool-erc20-transfer/execute] ⛽ Estimated gas cost (ETH):", ethers.utils.formatEther(estimatedGasCost));
                if (nativeBalance.lt(estimatedGasCost)) {
                    return fail({
                        error: `[@agentic-ai/vincent-tool-erc20-transfer/execute] ❌ Insufficient native balance for gas. Need ${ethers.utils.formatEther(estimatedGasCost)} ETH, but only have ${ethers.utils.formatEther(nativeBalance)} ETH`,
                    });
                }
            }
            catch (balanceError) {
                console.error("[@agentic-ai/vincent-tool-erc20-transfer/execute] ❌ Failed to check native balance:", balanceError);
                return fail({
                    error: `[@agentic-ai/vincent-tool-erc20-transfer/execute] ❌ Failed to check native balance: ${balanceError instanceof Error
                        ? balanceError.message
                        : "Unknown error"}`,
                });
            }
            // Check ERC-20 token balance
            console.log("[@agentic-ai/vincent-tool-erc20-transfer/execute] 🔍 Checking ERC-20 token balance...");
            try {
                const tokenContract = new ethers.Contract(tokenAddress, ERC20_TRANSFER_ABI, provider);
                const tokenBalance = await tokenContract.balanceOf(callerAddress);
                console.log("[@agentic-ai/vincent-tool-erc20-transfer/execute] 🪙 Token balance (raw):", tokenBalance.toString());
                console.log("[@agentic-ai/vincent-tool-erc20-transfer/execute] 🪙 Token balance (formatted):", ethers.utils.formatUnits(tokenBalance, tokenDecimals));
                if (tokenBalance.lt(tokenAmountInWei)) {
                    return fail({
                        error: `[@agentic-ai/vincent-tool-erc20-transfer/execute] ❌ Insufficient token balance. Need ${ethers.utils.formatUnits(tokenAmountInWei, tokenDecimals)} tokens, but only have ${ethers.utils.formatUnits(tokenBalance, tokenDecimals)} tokens`,
                    });
                }
            }
            catch (tokenBalanceError) {
                console.error("[@agentic-ai/vincent-tool-erc20-transfer/execute] ❌ Failed to check token balance:", tokenBalanceError);
                return fail({
                    error: `[@agentic-ai/vincent-tool-erc20-transfer/execute] ❌ Failed to check token balance: ${tokenBalanceError instanceof Error
                        ? tokenBalanceError.message
                        : "Unknown error"}`,
                });
            }
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
            console.log("[@agentic-ai/vincent-tool-erc20-transfer/execute] 📋 Contract call parameters:", {
                contractAddress: tokenAddress,
                functionName: "transfer",
                args: [to, tokenAmountInWei],
                callerAddress,
                chainId: finalChainId,
            });
            console.log("[@agentic-ai/vincent-tool-erc20-transfer/execute] 🔧 Full contractCallData:", JSON.stringify(contractCallData, null, 2));
            console.log("[@agentic-ai/vincent-tool-erc20-transfer/execute] 🚀 Attempting contract call...");
            // Execute the ERC-20 transfer using laUtils
            const txHash = await laUtils.transaction.handler.contractCall(contractCallData);
            console.log("[@agentic-ai/vincent-tool-erc20-transfer/execute] ✅ Contract call completed, txHash:", txHash);
            console.log("[@agentic-ai/vincent-tool-erc20-transfer/execute] ✅ ERC-20 transfer successful", {
                txHash,
                to,
                amount,
                tokenAddress,
            });
            const policyCommitResults = await commitAllowedPolicies(policiesContext, "[@agentic-ai/vincent-tool-erc20-transfer/execute]");
            console.log("[@agentic-ai/vincent-tool-erc20-transfer/execute] ✅ Policy commit results:", policyCommitResults);
            return succeed({
                txHash,
                to,
                amount,
                tokenAddress,
                timestamp: Date.now(),
            });
        }
        catch (error) {
            console.error("[@agentic-ai/vincent-tool-erc20-transfer/execute] ❌ ERC-20 transfer failed", error);
            // Provide more specific error messages for common ERC-20 failures
            let errorMessage = "[@agentic-ai/vincent-tool-erc20-transfer/execute] ❌ Unknown error occurred";
            if (error instanceof Error) {
                errorMessage = `[@agentic-ai/vincent-tool-erc20-transfer/execute] ❌ ${error.message}`;
            }
            return fail({
                error: errorMessage,
            });
        }
    },
});
