import fetch from "node-fetch";

/**
 * Fetch encrypted JSON from IPFS using public gateway
 */
export async function fetchFromIPFS(cid) {
  try {
    const url = `https://gateway.pinata.cloud/ipfs/${cid}`;
    console.log("🌐 Fetching from IPFS:", url);

    const res = await fetch(url);

    if (!res.ok) {
      throw new Error(`IPFS HTTP ${res.status}`);
    }

    const data = await res.json();
    return data;
  } catch (err) {
    console.error("❌ IPFS fetch failed:", err.message);
    throw new Error("Failed to fetch encrypted data from IPFS");
  }
}
