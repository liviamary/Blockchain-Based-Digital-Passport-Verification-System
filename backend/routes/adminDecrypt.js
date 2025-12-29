// backend/routes/adminDecrypt.js
import express from "express";
import fetch from "node-fetch";
import { decryptPacked } from "../utils/decrypt_ipfs.js";
import { getCidFromBlockchain } from "../blockchain/getCid.js";


const router = express.Router();



/**
 * TEST API
 * GET /admin/decrypt/:cid
 */
router.get("/decrypt/:cid", async (req, res) => {
  try {
    const { cid } = req.params;

    if (!cid) {
      return res.status(400).json({ message: "CID is required" });
    }

    // 1️⃣ Download encrypted file from IPFS
    const ipfsUrl = `https://gateway.pinata.cloud/ipfs/${cid}`;
    const response = await fetch(ipfsUrl);

    if (!response.ok) {
      throw new Error("Failed to fetch encrypted data from IPFS");
    }

    const encryptedBuffer = Buffer.from(await response.arrayBuffer());

    // 2️⃣ Decrypt
    const decryptedData = decryptPacked(encryptedBuffer);

    // 3️⃣ Return decrypted passport data
    res.json({
      success: true,
      data: decryptedData,
    });
  } catch (err) {
    console.error("❌ Admin decrypt error:", err.message);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

// GET /admin/passport/:applicationId
router.get("/passport/:applicationId", async (req, res) => {
  try {
    const { applicationId } = req.params;

    if (!applicationId) {
      return res.status(400).json({ message: "applicationId is required" });
    }

    // 1️⃣ Get CID from smart contract
    // TODO: replace this function with your actual contract call
    const cid = await getCidFromBlockchain(applicationId);

    if (!cid) {
      return res.status(404).json({ message: "CID not found on blockchain" });
    }

    // 2️⃣ Fetch encrypted data from IPFS
    const ipfsUrl = `https://gateway.pinata.cloud/ipfs/${cid}`;
    const response = await fetch(ipfsUrl, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch encrypted data from IPFS");
    }

    const encryptedBuffer = Buffer.from(await response.arrayBuffer());

    // 3️⃣ Decrypt
    const decryptedData = decryptPacked(encryptedBuffer);

    // 4️⃣ Return decrypted passport
    res.json({
      success: true,
      applicationId,
      cid,
      data: decryptedData,
    });
  } catch (err) {
    console.error("❌ Admin passport fetch error:", err.message);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});




export default router;
