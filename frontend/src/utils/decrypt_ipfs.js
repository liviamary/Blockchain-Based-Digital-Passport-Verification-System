import crypto from "crypto-browserify";
import { create } from "ipfs-http-client";
import { Buffer } from "buffer"; // ✅ Import Buffer manually

// Make Buffer available globally to avoid duplicate definitions
if (!window.Buffer) window.Buffer = Buffer;

// Connect to your IPFS node
const ipfs = create({ url: "http://127.0.0.1:5001/api/v0" });

/**
 * Fetch and decrypt IPFS encrypted passport data
 * @param {string} cid - IPFS CID (hash)
 * @param {string} password - Decryption password
 * @returns {Object} - Decrypted JSON (original user data)
 */
export async function fetchAndDecryptFromIPFS(cid, password) {
  try {
    // Fetch file from IPFS
    const stream = ipfs.cat(cid);
    let data = "";
    for await (const chunk of stream) {
      data += new TextDecoder().decode(chunk);
    }

    const payload = JSON.parse(data);
    const { iv, algorithm, encryptedData } = payload;

    // Decrypt
    const key = crypto.createHash("sha256").update(password).digest();
    const decipher = crypto.createDecipheriv(
      algorithm,
      key,
      Buffer.from(iv, "base64")
    );

    let decrypted = decipher.update(encryptedData, "base64", "utf8");
    decrypted += decipher.final("utf8");

    const result = JSON.parse(decrypted);
    return result;
  } catch (err) {
    console.error("❌ Decryption failed:", err.message);
    throw err;
  }
}
