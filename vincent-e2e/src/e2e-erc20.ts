import {
  PARAMETER_TYPE,
  createAppConfig,
  init,
  suppressLitLogs,
} from "@lit-protocol/vincent-scaffold-sdk/e2e";

// Apply log suppression FIRST, before any imports that might trigger logs
suppressLitLogs(false);

import { getVincentToolClient } from "@lit-protocol/vincent-app-sdk";
// Tools and Policies that we will be testing
import { vincentPolicyMetadata as sendLimitPolicyMetadata } from "../../vincent-packages/policies/send-counter-limit/dist/index.js";
import { bundledVincentTool as erc20TransferTool } from "../../vincent-packages/tools/erc20-transfer/dist/index.js";

(async () => {
  /**
   * ====================================
   * Initialise the environment
   * ====================================
   */
  const { accounts, chainClient } = await init({
    network: "datil",
    deploymentStatus: "dev",
  });

  /**
   * ====================================
   * (🫵 You) Prepare the tools and policies
   * ====================================
   */
  const erc20TransferToolClient = getVincentToolClient({
    bundledVincentTool: erc20TransferTool,
    ethersSigner: accounts.delegatee.ethersWallet,
  });

  /**
   * ====================================
   * Prepare the IPFS CIDs for the tools and policies
   * NOTE: All arrays below are parallel - each index corresponds to the same tool.
   * ❗️If you change the policy parameter values, you will need to reset the state file.
   * You can do this by running: npm run vincent:e2e:reset
   * ====================================
   */
  const appConfig = createAppConfig(
    {
      toolIpfsCids: [erc20TransferTool.ipfsCid],
      toolPolicies: [
        [
          sendLimitPolicyMetadata.ipfsCid, // Enable send-counter-limit policy for erc20-transfer tool
        ],
      ],
      toolPolicyParameterNames: [
        ["maxSends", "timeWindowSeconds"], // Policy parameter names for erc20TransferTool
      ],
      toolPolicyParameterTypes: [
        [PARAMETER_TYPE.UINT256, PARAMETER_TYPE.UINT256], // uint256 types for maxSends and timeWindowSeconds
      ],
      toolPolicyParameterValues: [
        ["2", "10"], // maxSends: 2, timeWindowSeconds: 10
      ],
    },

    // Debugging options
    {
      cidToNameMap: {
        [erc20TransferTool.ipfsCid]: "ERC-20 Transfer Tool",
        [sendLimitPolicyMetadata.ipfsCid]: "Send Limit Policy",
      },
      debug: true,
    }
  );

  /**
   * Collect all IPFS CIDs for tools and policies that need to be:
   * 1. Authorised during agent wallet PKP minting
   * 2. Permitted as authentication methods for the PKP
   */
  const toolAndPolicyIpfsCids = [
    erc20TransferTool.ipfsCid,
    sendLimitPolicyMetadata.ipfsCid,
  ];

  /**
   * ====================================
   * 👦🏻 (Agent Wallet PKP Owner) mint an Agent Wallet PKP
   * ====================================
   */
  const agentWalletPkp = await accounts.agentWalletPkpOwner.mintAgentWalletPkp({
    toolAndPolicyIpfsCids: toolAndPolicyIpfsCids,
  });

  console.log("🤖 Agent Wallet PKP:", agentWalletPkp);

  /**
   * ====================================
   * 🦹‍♀️ (App Manager Account) Register Vincent app with delegatee
   * ====================================
   */
  const { appId, appVersion } = await chainClient.registerApp({
    toolIpfsCids: appConfig.TOOL_IPFS_CIDS,
    toolPolicies: appConfig.TOOL_POLICIES,
    toolPolicyParameterNames: appConfig.TOOL_POLICY_PARAMETER_NAMES,
    toolPolicyParameterTypes: appConfig.TOOL_POLICY_PARAMETER_TYPES,
  });

  console.log("✅ Vincent app registered:", { appId, appVersion });

  /**
   * ====================================
   * 👦🏻 (Agent Wallet PKP Owner) Permit PKP to use the app version
   * ====================================
   */
  await chainClient.permitAppVersion({
    pkpTokenId: agentWalletPkp.tokenId,
    appId,
    appVersion,
    toolIpfsCids: appConfig.TOOL_IPFS_CIDS,
    policyIpfsCids: appConfig.TOOL_POLICIES,
    policyParameterNames: appConfig.TOOL_POLICY_PARAMETER_NAMES,
    policyParameterValues: appConfig.TOOL_POLICY_PARAMETER_VALUES,
    policyParameterTypes: appConfig.TOOL_POLICY_PARAMETER_TYPES,
  });

  console.log("✅ PKP permitted to use app version");

  /**
   * ====================================
   * 👦🏻 (Agent Wallet PKP Owner) Permit auth methods for the agent wallet PKP
   * ====================================
   */
  const permittedAuthMethodsTxHashes =
    await accounts.agentWalletPkpOwner.permittedAuthMethods({
      agentWalletPkp: agentWalletPkp,
      toolAndPolicyIpfsCids: toolAndPolicyIpfsCids,
    });

  console.log(
    "✅ Permitted Auth Methods Tx hashes:",
    permittedAuthMethodsTxHashes
  );

  /**
   * ====================================
   * Validate delegatee permissions (debugging)
   * ====================================
   */
  const validation = await chainClient.validateToolExecution({
    delegateeAddress: accounts.delegatee.ethersWallet.address,
    pkpTokenId: agentWalletPkp.tokenId,
    toolIpfsCid: erc20TransferTool.ipfsCid,
  });

  console.log("✅ Tool execution validation:", validation);

  if (!validation.isPermitted) {
    throw new Error(
      `❌ Delegatee is not permitted to execute tool for PKP. Validation: ${JSON.stringify(
        validation,
        (key, value) => (typeof value === "bigint" ? value.toString() : value)
      )}`
    );
  }

  /**
   * ====================================
   * Test your tools and policies here
   * ====================================
   *
   * This section is where you validate that your custom tools and policies
   * work together as expected.
   *
   * Replace this example with tests relevant to your tools and policies.
   * ====================================
   */
  console.log(`🧪 Testing ERC-20 transfer with send limit policy`);
  console.log(
    "💡 Testing on Base network - each ERC-20 transfer costs approximately 0.0000001 ETH in gas fees"
  );

  // Array to collect transaction hashes from successful executions
  const transactionHashes: string[] = [];

  const TEST_TOOL_PARAMS = {
    to: accounts.delegatee.ethersWallet.address, // Transfer to self for testing
    amount: "0.000001",
    tokenAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // Base USDC Contract Address
    tokenDecimals: 6,
    rpcUrl: "https://base.llamarpc.com",
    chainId: 8453,
  };

  const precheck = async () => {
    return await erc20TransferToolClient.precheck(TEST_TOOL_PARAMS, {
      delegatorPkpEthAddress: agentWalletPkp.ethAddress,
    });
  };

  const execute = async () => {
    return await erc20TransferToolClient.execute(TEST_TOOL_PARAMS, {
      delegatorPkpEthAddress: agentWalletPkp.ethAddress,
    });
  };

  // ----------------------------------------
  // Test 1: First ERC-20 transfer should succeed
  // ----------------------------------------
  console.log("(PRECHECK-TEST-1) First ERC-20 transfer (should succeed)");
  const erc20PrecheckRes1 = await precheck();
  console.log("(PRECHECK-RES[1]): ", erc20PrecheckRes1);

  if (!erc20PrecheckRes1.success) {
    throw new Error(
      `❌ First ERC-20 precheck should succeed: ${JSON.stringify(
        erc20PrecheckRes1
      )}`
    );
  }

  console.log("(EXECUTE-TEST-1) First ERC-20 transfer (should succeed)");
  const executeRes1 = await execute();

  console.log("(EXECUTE-RES[1]): ", executeRes1);

  if (!executeRes1.success) {
    throw new Error(
      `❌ First ERC-20 execute should succeed: ${JSON.stringify(executeRes1)}`
    );
  }

  // Collect transaction hash if successful
  if (executeRes1.success && executeRes1.result?.txHash) {
    transactionHashes.push(executeRes1.result.txHash);
  }

  console.log(
    "(✅ EXECUTE-TEST-1) First ERC-20 transfer completed successfully"
  );

  // ----------------------------------------
  // Test 2: Second ERC-20 transfer should succeed
  // ----------------------------------------
  console.log("(PRECHECK-TEST-2) Second ERC-20 transfer (should succeed)");
  const erc20PrecheckRes2 = await precheck();

  console.log("(PRECHECK-RES[2]): ", erc20PrecheckRes2);

  if (!erc20PrecheckRes2.success) {
    throw new Error(
      `❌ (PRECHECK-TEST-2) Second ERC-20 precheck should succeed: ${JSON.stringify(
        erc20PrecheckRes2
      )}`
    );
  }

  const executeRes2 = await execute();

  console.log("(EXECUTE-RES[2]): ", executeRes2);

  if (!executeRes2.success) {
    throw new Error(
      `❌ (EXECUTE-TEST-2) Second ERC-20 execute should succeed: ${JSON.stringify(
        executeRes2
      )}`
    );
  }

  // Collect transaction hash if successful
  if (executeRes2.success && executeRes2.result?.txHash) {
    transactionHashes.push(executeRes2.result.txHash);
  }

  console.log(
    "(✅ EXECUTE-TEST-2) Second ERC-20 transfer completed successfully"
  );

  // ----------------------------------------
  // Test 3: Third ERC-20 transfer should fail (limit exceeded)
  // ----------------------------------------
  console.log(
    "(PRECHECK-TEST-3) Third ERC-20 transfer (should fail - limit exceeded)"
  );
  const erc20PrecheckRes3 = await precheck();

  console.log("(PRECHECK-RES[3]): ", erc20PrecheckRes3);

  if (erc20PrecheckRes3.success) {
    console.log(
      "✅ (PRECHECK-TEST-3) Third ERC-20 precheck succeeded (expected - precheck only validates tool parameters)"
    );

    // Test if execution is properly blocked by policy
    console.log(
      "🧪 (EXECUTE-TEST-3) Testing if ERC-20 execution is blocked by policy (this is where enforcement happens)..."
    );

    const executeRes3 = await execute();

    console.log("(EXECUTE-RES[3]): ", executeRes3);

    if (executeRes3.success) {
      // Collect hash if unexpectedly successful
      if (executeRes3.result?.txHash) {
        transactionHashes.push(executeRes3.result.txHash);
      }
      throw new Error(
        "❌ (EXECUTE-TEST-3) CRITICAL: Third ERC-20 execution should have been blocked by policy but succeeded!"
      );
    } else {
      console.log(
        "✅ (EXECUTE-TEST-3) PERFECT: Third ERC-20 execution correctly blocked by send limit policy!"
      );
      console.log(
        "🎉 (EXECUTE-TEST-3) ERC-20 SEND LIMIT POLICY SYSTEM WORKING CORRECTLY!"
      );
      console.log(
        "📊 (EXECUTE-TEST-3) Policy properly enforced: 2 ERC-20 transfers allowed, 3rd transfer blocked"
      );
    }
  } else {
    console.log(
      "🟨 (PRECHECK-TEST-3) Third ERC-20 transfer precheck failed (unexpected but also fine)"
    );
    console.log("🎉 (PRECHECK-TEST-3) ERC-20 POLICY ENFORCEMENT WORKING!");
  }

  // Print all collected transaction hashes
  console.log("\n" + "=".repeat(50));
  console.log("📋 SUMMARY: COLLECTED TRANSACTION HASHES");
  console.log("=".repeat(50));

  if (transactionHashes.length > 0) {
    transactionHashes.forEach((hash, index) => {
      console.log(`${index + 1}. ${hash}`);
    });
    console.log(
      `\n✅ Total successful ERC-20 transactions: ${transactionHashes.length}`
    );
  } else {
    console.log("❌ No transaction hashes collected");
  }

  console.log("=".repeat(50));

  process.exit();
})();
