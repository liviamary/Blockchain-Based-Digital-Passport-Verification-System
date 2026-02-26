import express from "express";
import fetch from "node-fetch";
import { getCidFromBlockchain } from "../blockchain/getCid.js";
import { decryptPacked } from "../utils/decrypt_ipfs.js";

const router = express.Router();

// 🔒 In-memory cache
const decryptedCache = new Map();

/**
 * Helper: Fetch encrypted binary data from IPFS
 */
async function fetchEncryptedFromIPFS(cid) {
  try {
    const gateway = process.env.PINATA_GATEWAY;

    if (!gateway) {
      throw new Error("PINATA_GATEWAY not set in .env");
    }

    const url = `${gateway}/${cid}`;

    console.log("🌐 Fetching from:", url);

    const res = await fetch(url);

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);

  } catch (err) {
    console.error("❌ IPFS fetch failed:", err.message);
    throw err;
  }
}

/**
 * -------------------------------------------------------
 * 🔐 ADMIN ROUTE
 * GET /api/passport/admin/:applicationId
 * -------------------------------------------------------
 */
router.get("/admin/:applicationId", async (req, res) => {
  const { applicationId } = req.params;

  try {
    // 1️⃣ Return cached if exists
    if (decryptedCache.has(applicationId)) {
      console.log("⚡ Returning cached decrypted data:", applicationId);
      return res.json(decryptedCache.get(applicationId));
    }

    console.log("➡️ Fetching CID from blockchain for:", applicationId);

    const cid = await getCidFromBlockchain(applicationId);

    if (!cid) {
      return res.status(404).json({ error: "Application not found on blockchain" });
    }

    const encryptedBuffer = await fetchEncryptedFromIPFS(cid);
    const decrypted = decryptPacked(encryptedBuffer);

    const responsePayload = {
      application_id: applicationId,
      cid,
      decrypted_passport: decrypted,
    };

    decryptedCache.set(applicationId, responsePayload);

    return res.json(responsePayload);

  } catch (err) {
    console.error("❌ Admin decrypt error:", err.message);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * -------------------------------------------------------
 * 🔓 DIRECT CID DECRYPT ROUTE
 * GET /api/passport/decrypt/:cid
 * -------------------------------------------------------
 */
router.get("/decrypt/:cid", async (req, res) => {
  const { cid } = req.params;

  try {
    console.log("➡️ Decrypting via CID:", cid);

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

/**
 * -------------------------------------------------------
 * 🔓 VERIFY ROUTE
 * GET /api/passport/verify/:passportID
 * -------------------------------------------------------
 */
router.get("/verify/:passportID", async (req, res) => {
  const { passportID } = req.params;

  try {
    console.log("🔍 Verifying passportID:", passportID);

    const cid = await getCidFromBlockchain(passportID);

    if (!cid) {
      return res.status(404).json({
        status: "Invalid",
        message: "Passport not found",
      });
    }

    const encryptedBuffer = await fetchEncryptedFromIPFS(cid);
    const decrypted = decryptPacked(encryptedBuffer);

    return res.json({
      name: decrypted.full_name,
      nationality: decrypted.nationality,
      issuedOn: decrypted.submitted_at,
      status: decrypted.status || "Pending",
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