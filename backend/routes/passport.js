import express from "express";
import fetch from "node-fetch";
import { getCidFromBlockchain } from "../blockchain/getCid.js";
import { decryptPacked } from "../utils/decrypt_ipfs.js";

const router = express.Router();

// 🔒 In-memory cache to prevent repeated blockchain + IPFS calls
const decryptedCache = new Map();

/**
 * Helper: Fetch encrypted binary data from IPFS
 */
async function fetchEncryptedFromIPFS(cid) {
  const gateways = [
    `https://gateway.pinata.cloud/ipfs/${cid}`,
    `https://ipfs.io/ipfs/${cid}`,
    `https://cloudflare-ipfs.com/ipfs/${cid}`,
  ];

  let lastError = null;

  for (const url of gateways) {
    try {
      console.log("🌐 Trying IPFS gateway:", url);
      const res = await fetch(url);

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const arrayBuffer = await res.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (err) {
      lastError = err;
      console.warn("⚠️ IPFS gateway failed:", url, err.message);
    }
  }

  throw new Error(
    `Failed to fetch encrypted data from IPFS (${lastError?.message || "unknown error"})`
  );
}

/**
 * -------------------------------------------------------
 * 🔐 ADMIN ROUTE (PRIMARY)
 * GET /api/passport/admin/:applicationId
 * -------------------------------------------------------
 */
// 🔐 ADMIN ROUTE
router.get("/admin/:applicationId", async (req, res) => {
  const { applicationId } = req.params;

  try {
    // ✅ 1. Return from cache if exists
    if (decryptedCache.has(applicationId)) {
      console.log("⚡ Returning cached decrypted data:", applicationId);
      return res.json(decryptedCache.get(applicationId));
    }

    console.log("➡️ Fetching CID from blockchain for passportID:", applicationId);

    const cid = await getCidFromBlockchain(applicationId);
    if (!cid) {
      return res.status(404).json({ error: "CID not found" });
    }

    console.log("✅ IPFS hash found:", cid);

    const encryptedBuffer = await fetchEncryptedFromIPFS(cid);
    const decrypted = decryptPacked(encryptedBuffer);

    const responsePayload = {
      application_id: applicationId,
      cid,
      decrypted_passport: decrypted,
    };

    // ✅ 2. Store in cache
    decryptedCache.set(applicationId, responsePayload);

    return res.json(responsePayload);

  } catch (err) {
    console.error("❌ Admin decrypt error:", err.message);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * -------------------------------------------------------
 * 🔓 CID ROUTE (FALLBACK)
 * GET /api/passport/decrypt/:cid
 * -------------------------------------------------------
 */
router.get("/decrypt/:cid", async (req, res) => {
  const { cid } = req.params;

  try {
    console.log("➡️ Decrypting directly via CID:", cid);

    const encryptedBuffer = await fetchEncryptedFromIPFS(cid);
    const decrypted = decryptPacked(encryptedBuffer);

    return res.json({
      cid,
      decrypted,
    });
  } catch (err) {
    console.error("❌ CID decrypt error:", err.message);
    return res.status(500).json({
      error: err.message,
    });
  }
});


// -------------------------------------------------------
// 🔓 PUBLIC PASSPORT VERIFICATION ROUTE
// GET /api/passport/verify/:passportID
// -------------------------------------------------------
router.get("/verify/:passportID", async (req, res) => {
  const { passportID } = req.params;

  try {
    console.log("🔍 Verifying passportID:", passportID);

    // 1️⃣ Get CID from blockchain
    // (this will return NULL if status is NOT Approved)
    const cid = await getCidFromBlockchain(passportID);

    if (!cid) {
      return res.status(403).json({
        status: "Invalid",
        message: "Passport not approved or does not exist",
      });
    }

    // 2️⃣ Fetch encrypted data from IPFS
    const encryptedBuffer = await fetchEncryptedFromIPFS(cid);

    // 3️⃣ Decrypt passport data
    const decrypted = decryptPacked(encryptedBuffer);

    console.log("🔓 FULL DECRYPTED OBJECT:", decrypted);

    // 4️⃣ Return ONLY safe verification fields
    return res.json({
      name: decrypted.full_name,
      nationality: decrypted.nationality,
      issuedOn: decrypted.submitted_at,
      status: "Approved",
    });

  } catch (err) {
    console.error("❌ VERIFY ROUTE ERROR:", err.message);
    return res.status(500).json({
      status: "Error",
      message: "Verification failed",
    });
  }
});


export default router;
