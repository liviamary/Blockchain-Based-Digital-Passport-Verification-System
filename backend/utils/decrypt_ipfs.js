import crypto from "crypto";

/**
 * Decrypts AES-256-GCM packed buffer
 * Format:
 *   iv (12 bytes) + authTag (16 bytes) + ciphertext (remaining)
 *
 * @param {Buffer} packed - encrypted binary data fetched from IPFS
 * @returns {Object} decrypted JSON object
 */
export function decryptPacked(packed) {
  try {
    // 1️⃣ Validate input
    if (!Buffer.isBuffer(packed)) {
      throw new Error("Encrypted payload is not a Buffer");
    }

    // 2️⃣ Read shared passphrase (MUST match encryption side)
    const COMMON_PASSPHRASE = process.env.COMMON_ENCRYPTION_PASSPHRASE;
    if (!COMMON_PASSPHRASE) {
      throw new Error(
        "COMMON_ENCRYPTION_PASSPHRASE not set in environment variables"
      );
    }

    // 3️⃣ Derive 32-byte AES key using SHA-256 (same as encryptor)
    const key = crypto
      .createHash("sha256")
      .update(COMMON_PASSPHRASE, "utf8")
      .digest(); // 32 bytes

    // 4️⃣ Validate minimum length (12 + 16 = 28 bytes)
    if (packed.length < 28) {
      throw new Error("Encrypted payload too small or corrupted");
    }

    // 5️⃣ Split packed buffer
    const iv = packed.subarray(0, 12);        // 12 bytes
    const authTag = packed.subarray(12, 28);  // 16 bytes
    const ciphertext = packed.subarray(28);   // remaining bytes

    // 6️⃣ Create decipher
    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      key,
      iv
    );
    decipher.setAuthTag(authTag);

    // 7️⃣ Decrypt
    const decryptedBuffer = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);

    // 8️⃣ Convert to JSON
    const decryptedText = decryptedBuffer.toString("utf8");

    try {
      return JSON.parse(decryptedText);
    } catch {
      throw new Error("Decrypted data is not valid JSON");
    }
  } catch (err) {
    console.error("❌ AES-256-GCM decryption failed:", err.message);
    throw new Error("Decryption failed (wrong key, corrupted data, or invalid format)");
  }
}
