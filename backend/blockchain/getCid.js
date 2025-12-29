import { ethers } from "ethers";

/**
 * ----------------------------------------------------
 * Blockchain read utility
 * Fetches ipfsHash (CID) ONLY if passport is Approved
 * ----------------------------------------------------
 */

// 1️⃣ Provider (Sepolia via Infura)
const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);

// 2️⃣ Contract address (from .env)
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;

// 🔍 Log once at startup (helps debugging)
console.log("🔗 Blockchain provider RPC:", process.env.RPC_URL);
console.log("📜 Contract address:", CONTRACT_ADDRESS);

// 3️⃣ Minimal ABI (ONLY what we need)
const CONTRACT_ABI = [
  "function getApplication(string _passportID) view returns (string passportID, address userWallet, string status, string qrURL, string ipfsHash, uint256 createdAt, uint256 updatedAt)"
];

// 4️⃣ Contract instance
const contract = new ethers.Contract(
  CONTRACT_ADDRESS,
  CONTRACT_ABI,
  provider
);

/**
 * 5️⃣ Fetch CID (ipfsHash) ONLY for Approved passports
 */
export async function getCidFromBlockchain(passportID) {
  try {
    console.log("➡️ Fetching application from blockchain for passportID:", passportID);

    const result = await contract.getApplication(passportID);

    console.log("📦 Raw contract result:", result);

    // 🛑 If application does not exist
    if (!result || !result[0]) {
      console.error("❌ Application not found on blockchain");
      return null;
    }

    // 1️⃣ Check approval status
    const status = result.status || result[2];
    if (status !== "Approved") {
      console.warn(`⛔ Passport ${passportID} is not approved (status: ${status})`);
      return null;
    }

    // 2️⃣ Extract IPFS hash
    const ipfsHash = result.ipfsHash || result[4];

    if (!ipfsHash || ipfsHash.trim() === "") {
      console.error("❌ No IPFS hash found for approved passport:", passportID);
      return null;
    }

    console.log("✅ Approved passport | IPFS hash found:", ipfsHash);
    return ipfsHash;

  } catch (err) {
    console.error("❌ Blockchain read error:", err.message);
    throw err; // handled by route → returns 500
  }
}
