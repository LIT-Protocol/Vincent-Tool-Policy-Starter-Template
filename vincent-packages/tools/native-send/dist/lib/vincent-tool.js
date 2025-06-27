import { createVincentTool, createVincentToolPolicy, supportedPoliciesForTool, } from "@lit-protocol/vincent-tool-sdk";
import "@lit-protocol/vincent-tool-sdk/internal";
import { bundledVincentPolicy } from "../../../../policies/send-counter-limit/dist/index.js";
import { executeFailSchema, executeSuccessSchema, precheckFailSchema, precheckSuccessSchema, toolParamsSchema, } from "./schemas";
import { laUtils } from "@lit-protocol/vincent-scaffold-sdk";
const SendLimitPolicy = createVincentToolPolicy({
    toolParamsSchema,
    bundledVincentPolicy,
    toolParameterMappings: {
        to: "to",
        amount: "amount",
    },
});
export const vincentTool = createVincentTool({
    packageName: "@agentic-ai/vincent-tool-native-send",
    toolParamsSchema,
    supportedPolicies: supportedPoliciesForTool([SendLimitPolicy]),
    precheckSuccessSchema,
    precheckFailSchema,
    executeSuccessSchema,
    executeFailSchema,
    precheck: async ({ toolParams }, { succeed, fail }) => {
        console.log("[@agentic-ai/vincent-tool-native-send/precheck]");
        console.log("[@agentic-ai/vincent-tool-native-send/precheck] params:", {
            toolParams,
        });
        const { to, amount, rpcUrl } = toolParams;
        // Basic validation without using ethers directly
        if (!to || !to.startsWith("0x") || to.length !== 42) {
            return fail({
                error: "[@agentic-ai/vincent-tool-native-send/precheck] Invalid recipient address format",
            });
        }
        // Validate the amount
        if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
            return fail({
                error: "[@agentic-ai/vincent-tool-native-send/precheck] Invalid amount format or amount must be greater than 0",
            });
        }
        // Validate RPC URL if provided
        if (rpcUrl && typeof rpcUrl === "string") {
            try {
                new URL(rpcUrl);
            }
            catch {
                return fail({
                    error: "[@agentic-ai/vincent-tool-native-send/precheck] Invalid RPC URL format",
                });
            }
        }
        // Additional validation: check if amount is too large
        const amountFloat = parseFloat(amount);
        if (amountFloat > 1.0) {
            return fail({
                error: "[@agentic-ai/vincent-tool-native-send/precheck] Amount too large (maximum 1.0 ETH per transaction)",
            });
        }
        // Precheck succeeded
        const successResult = {
            addressValid: true,
            amountValid: true,
        };
        console.log("[@agentic-ai/vincent-tool-native-send/precheck] Success result:", successResult);
        const successResponse = succeed(successResult);
        console.log("[NativeSendTool/precheck] Success response:", JSON.stringify(successResponse, null, 2));
        return successResponse;
    },
    execute: async ({ toolParams }, { succeed, fail, delegation, policiesContext }) => {
        try {
            const { to, amount, rpcUrl } = toolParams;
            console.log("[@agentic-ai/vincent-tool-native-send/execute] Executing Native Send Tool", {
                to,
                amount,
                rpcUrl,
            });
            // Get provider - use provided RPC URL or default to Yellowstone
            const finalRpcUrl = rpcUrl || "https://yellowstone-rpc.litprotocol.com/";
            const provider = new ethers.providers.JsonRpcProvider(finalRpcUrl);
            console.log("[@agentic-ai/vincent-tool-native-send/execute] Using RPC URL:", finalRpcUrl);
            // Get PKP public key from delegation context
            const pkpPublicKey = delegation.delegatorPkpInfo.publicKey;
            if (!pkpPublicKey) {
                return fail({
                    error: "PKP public key not available from delegation context",
                });
            }
            // Execute the native send
            const txHash = await laUtils.transaction.handler.nativeSend({
                provider,
                pkpPublicKey,
                amount,
                to,
            });
            console.log("[@agentic-ai/vincent-tool-native-send/execute] Native send successful", {
                txHash,
                to,
                amount,
            });
            // Manually call policy commit function using the correct pattern
            console.log("[@agentic-ai/vincent-tool-native-send/execute] Manually calling policy commit function...");
            try {
                // Use the correct pattern from the reference code
                const sendLimitPolicyContext = policiesContext.allowedPolicies["@agentic-ai/vincent-policy-send-counter-limit"];
                if (sendLimitPolicyContext &&
                    sendLimitPolicyContext.commit &&
                    sendLimitPolicyContext.result) {
                    console.log("[@agentic-ai/vincent-tool-native-send/execute] ✅ Found send limit policy context, calling commit...");
                    console.log("[@agentic-ai/vincent-tool-native-send/execute] ✅ Policy evaluation result:", sendLimitPolicyContext.result);
                    // Extract the commit parameters from the policy evaluation results
                    const { currentCount, maxSends, remainingSends, timeWindowSeconds } = sendLimitPolicyContext.result;
                    const commitParams = {
                        currentCount,
                        maxSends,
                        remainingSends,
                        timeWindowSeconds,
                    };
                    console.log("[@agentic-ai/vincent-tool-native-send/execute] ✅ Available in sendLimitPolicyContext:", Object.keys(sendLimitPolicyContext));
                    console.log("[@agentic-ai/vincent-tool-native-send/execute] ✅ Calling commit with explicit parameters (ignoring TS signature)...");
                    const commitResult = await sendLimitPolicyContext.commit(
                    // @ts-ignore - TypeScript signature is wrong, framework actually expects parameters
                    commitParams);
                    console.log("[@agentic-ai/vincent-tool-native-send/execute] ✅ Policy commit result:", commitResult);
                }
                else {
                    console.log("[@agentic-ai/vincent-tool-native-send/execute] ❌ Send limit policy context not found in policiesContext.allowedPolicies");
                    console.log("[@agentic-ai/vincent-tool-native-send/execute] ❌ Available policies:", Object.keys(policiesContext.allowedPolicies || {}));
                }
            }
            catch (commitError) {
                console.error("[@agentic-ai/vincent-tool-native-send/execute] ❌ Error calling policy commit:", commitError);
                // Don't fail the transaction if commit fails
            }
            return succeed({
                txHash,
                to,
                amount,
                timestamp: Date.now(),
            });
        }
        catch (error) {
            console.error("[@agentic-ai/vincent-tool-native-send/execute] Native send failed", error);
            return fail({
                error: error instanceof Error ? error.message : "Unknown error occurred",
            });
        }
    },
});
