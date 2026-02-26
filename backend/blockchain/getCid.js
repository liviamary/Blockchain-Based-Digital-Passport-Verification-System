import { ethers } from "ethers";

/**
 * ----------------------------------------------------
 * Blockchain read utility
 * Fetches ipfsHash (CID) for ANY existing passport
 * ----------------------------------------------------
 */


console.log("🔗 Backend RPC:", process.env.RPC_URL);
console.log("📜 Backend Contract:", process.env.CONTRACT_ADDRESS);
// 1️⃣ Provider (Sepolia via Infura)
const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);

// 2️⃣ Contract address
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;

console.log("🔗 Blockchain provider RPC:", process.env.RPC_URL);
console.log("📜 Contract address:", CONTRACT_ADDRESS);

// 3️⃣ Minimal ABI
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
 * 5️⃣ Fetch CID (ipfsHash) for ANY passport (Pending or Approved)
 */
export async function getCidFromBlockchain(passportID) {
  try {
    console.log("➡️ Fetching application for:", passportID);

    const result = await contract.getApplication(passportID);

    console.log("📦 FULL RESULT:", result);
    console.log("📌 passportID:", result.passportID);
    console.log("📌 status:", result.status);
    console.log("📌 ipfsHash:", result.ipfsHash);

    if (!result.passportID || result.passportID.trim() === "") {
      console.log("❌ Application does not exist");
      return null;
    }

    if (!result.ipfsHash || result.ipfsHash.trim() === "") {
      console.log("❌ IPFS hash is EMPTY");
      return null;
    }

    return result.ipfsHash;

  } catch (err) {
    console.error("❌ Blockchain read error:", err.message);
    throw err;
  }
}