// scripts/deploy.js
const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

function formatEtherCompat(ethersLib, balance) {
  if (!balance) return "0";
  if (typeof ethersLib.formatEther === "function") return ethersLib.formatEther(balance);
  if (ethersLib.utils && typeof ethersLib.utils.formatEther === "function")
    return ethersLib.utils.formatEther(balance);
  try {
    return (Number(balance) / 1e18).toString();
  } catch {
    return String(balance);
  }
}

function isAddressCompat(ethersLib, addr) {
  if (!addr) return false;
  if (typeof ethersLib.isAddress === "function") return ethersLib.isAddress(addr);
  if (ethersLib.utils && typeof ethersLib.utils.isAddress === "function")
    return ethersLib.utils.isAddress(addr);
  return /^0x[a-fA-F0-9]{40}$/.test(addr);
}

async function getContractAddressCompat(contract) {
  if (!contract) return undefined;
  try {
    if (typeof contract.getAddress === "function") {
      return await contract.getAddress();
    }
  } catch (e) {
    // ignore
  }
  if (contract.address) return contract.address;
  if (contract.target) return contract.target;
  return undefined;
}

async function getDeploymentTxInfo(contract, provider) {
  if (!contract) return {};
  let tx = undefined;

  try {
    if (typeof contract.deploymentTransaction === "function") {
      tx = contract.deploymentTransaction();
    }
  } catch (e) {
    // ignore
  }

  if (!tx && contract.deployTransaction) tx = contract.deployTransaction;

  if (tx && tx.hash && provider) {
    try {
      const receipt = await provider.getTransactionReceipt(tx.hash);
      return {
        hash: tx.hash,
        blockNumber: receipt ? receipt.blockNumber : tx.blockNumber || null,
        gasUsed: receipt ? receipt.gasUsed : tx.gasLimit || null,
        receipt,
      };
    } catch (e) {
      return {
        hash: tx.hash,
        blockNumber: tx.blockNumber || null,
        gasUsed: tx.gasLimit || null,
      };
    }
  }

  return {};
}

async function main() {
  console.log("🚀 Starting Attendance Contract Deployment...\n");

  // Signers
  let deployer;
  try {
    const signers = await hre.ethers.getSigners();
    if (!signers || signers.length === 0) {
      throw new Error("No signers available. Start a node (npx hardhat node) or run without --network localhost.");
    }
    deployer = signers[0];
  } catch (err) {
    console.error("❌ Could not get signers:", err.message || err);
    throw err;
  }

  console.log("📝 Deploying with account:", deployer.address);

  // Balance
  try {
    const balance = await hre.ethers.provider.getBalance(deployer.address);
    console.log("💰 Account balance:", formatEtherCompat(hre.ethers, balance), "ETH\n");
  } catch (err) {
    console.warn("⚠️  Could not read deployer balance:", err.message || err);
  }

  // Get contract factory
  console.log("⏳ Deploying Attendance contract...");
  let AttendanceFactory;
  try {
    AttendanceFactory = await hre.ethers.getContractFactory("Attendance", deployer);
    if (!AttendanceFactory) throw new Error("ContractFactory returned falsy value.");
  } catch (err) {
    console.error("❌ Could not get ContractFactory for Attendance:", err.message || err);
    throw err;
  }

  // Deploy contract
  let attendance;
  try {
    attendance = await AttendanceFactory.deploy();
  } catch (err) {
    console.error("❌ Failed to send deploy transaction:", err.message || err);
    throw err;
  }

  // Wait for deployment using multiple fallbacks
  try {
    if (attendance && typeof attendance.waitForDeployment === "function") {
      await attendance.waitForDeployment();
    } else if (attendance && typeof attendance.deployed === "function") {
      await attendance.deployed();
    } else if (attendance && attendance.deployTransaction && attendance.deployTransaction.hash) {
      await hre.ethers.provider.waitForTransaction(attendance.deployTransaction.hash);
    } else {
      // small fallback pause
      await new Promise((r) => setTimeout(r, 2000));
    }
  } catch (err) {
    console.warn("⚠️  Warning while waiting for deployment:", err.message || err);
    // continue — will attempt to fetch address and tx info
  }

  // Determine address
  const contractAddress = await getContractAddressCompat(attendance);
  if (!contractAddress) {
    console.warn("⚠️  Could not determine deployed contract address from standard fields. Dumping object for debugging:");
    console.warn({
      attendanceExists: !!attendance,
      deployTx: attendance ? attendance.deployTransaction || null : null,
      fields: attendance ? Object.keys(attendance).slice(0, 30) : null,
    });
  } else {
    console.log("✅ Attendance contract deployed to:", contractAddress);
  }

  // Tx info
  const txInfo = await getDeploymentTxInfo(attendance, hre.ethers.provider);
  if (txInfo.hash) {
    console.log("🔗 Transaction hash:", txInfo.hash);
    console.log("📦 Block number:", txInfo.blockNumber ?? "N/A");
    if (txInfo.gasUsed) {
      console.log("⛽ Gas used:", txInfo.gasUsed.toString ? txInfo.gasUsed.toString() : txInfo.gasUsed);
    }
  } else {
    console.log("ℹ️  Deployment transaction information not available.");
  }

  // Save deployment metadata
  const deploymentInfo = {
    contractAddress: contractAddress || null,
    contractName: "Attendance",
    network: hre.network.name,
    deployer: deployer.address,
    deploymentTime: new Date().toISOString(),
    blockNumber: txInfo.blockNumber || null,
    transactionHash: txInfo.hash || null,
  };

  try {
    const deploymentPath = path.join(__dirname, "..", "deployment.json");
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
    console.log("💾 Deployment info saved to:", deploymentPath, "\n");
  } catch (err) {
    console.warn("⚠️  Could not write deployment.json:", err.message || err);
  }

  // Verify owner() if available
  console.log("🔍 Verifying contract setup...");
  try {
    if (attendance && typeof attendance.owner === "function") {
      const owner = await attendance.owner();
      console.log("👤 Contract owner:", owner);
      console.log("✅ Owner matches deployer:", owner === deployer.address, "\n");
    } else {
      // sometimes read-only properties are on interface; attempt call if function-like property exists
      if (attendance && attendance.owner !== undefined) {
        try {
          const ownerMaybe = await attendance.owner;
          console.log("👤 owner property value:", ownerMaybe);
        } catch {
          console.log("ℹ️  attendance.owner exists but is not callable.");
        }
      } else {
        console.log("ℹ️  attendance.owner() not available on contract instance.\n");
      }
    }
  } catch (err) {
    console.warn("⚠️  Could not call owner():", err.message || err);
  }

  // Optional: Authorize additional teachers
  if (process.env.TEACHER_ADDRESSES) {
    console.log("👨‍🏫 Authorizing additional teachers...");
    const teacherAddresses = process.env.TEACHER_ADDRESSES.split(",");
    for (const teacherAddress of teacherAddresses) {
      const trimmedAddress = teacherAddress.trim();
      if (isAddressCompat(hre.ethers, trimmedAddress)) {
        console.log(`   Authorizing: ${trimmedAddress}`);
        try {
          const tx = await attendance.authorizeTeacher(trimmedAddress);
          if (tx && typeof tx.wait === "function") await tx.wait();
          console.log(`   ✅ Authorized`);
        } catch (err) {
          console.warn(`   ⚠️  Failed to authorize ${trimmedAddress}:`, err.message || err);
        }
      } else {
        console.log(`   ⚠️  Invalid address: ${trimmedAddress}`);
      }
    }
    console.log();
  }

  // Save ABI if artifact exists
  const artifactPath = path.join(__dirname, "..", "artifacts", "contracts", "Attendance.sol", "Attendance.json");
  if (fs.existsSync(artifactPath)) {
    try {
      const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
      const abiPath = path.join(__dirname, "..", "Attendance.abi.json");
      fs.writeFileSync(abiPath, JSON.stringify(artifact.abi, null, 2));
      console.log("💾 Contract ABI saved to:", abiPath, "\n");
    } catch (err) {
      console.warn("⚠️  Could not read/write artifact ABI:", err.message || err);
    }
  } else {
    console.log("ℹ️  Artifact not found at:", artifactPath);
  }

  // Write env template
  try {
    const envTemplate = `# Attendance Contract Configuration
CONTRACT_ADDRESS=${contractAddress || ""}
RPC_URL=${(hre.network.config && hre.network.config.url) || "http://127.0.0.1:8545"}
PRIVATE_KEY=${process.env.PRIVATE_KEY || "0x"}
GAS_LIMIT=500000

# Optional: Comma-separated list of teacher addresses to authorize
# TEACHER_ADDRESSES=0x...,0x...
`;
    const envPath = path.join(__dirname, "..", ".env.contract");
    fs.writeFileSync(envPath, envTemplate);
    console.log("💾 Environment template saved to:", envPath);
    console.log("⚠️  Remember to update .env with the contract address!\n");
  } catch (err) {
    console.warn("⚠️  Could not write .env.contract:", err.message || err);
  }

  // Summary
  console.log("═══════════════════════════════════════════════════");
  console.log("✨ Deployment Summary");
  console.log("═══════════════════════════════════════════════════");
  console.log(`📍 Network:          ${hre.network.name}`);
  console.log(`📝 Contract Address: ${contractAddress || "N/A"}`);
  console.log(`👤 Owner:            ${deployer.address}`);
  console.log(`⛽ Gas Used:         ${txInfo.gasUsed ? (txInfo.gasUsed.toString ? txInfo.gasUsed.toString() : txInfo.gasUsed) : "N/A"}`);
  console.log("═══════════════════════════════════════════════════\n");

  console.log("🎉 Deployment completed (or partially completed with diagnostics).");
  console.log("\n📋 Next Steps:");
  console.log("   1. Copy the contract address to your .env file");
  console.log("   2. Update backend configuration if needed");
  console.log("   3. Test the contract with: npx hardhat test");
  console.log("   4. Start your backend server\n");

  return {
    contractAddress,
    deployer: deployer.address,
    network: hre.network.name,
  };
}

// Execute deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Deployment failed:");
    console.error(error && error.stack ? error.stack : error);
    process.exit(1);
  });
