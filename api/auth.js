import crypto from "crypto";

export default function handler(req, res) {
  try {
    const IMAGEKIT_PRIVATE_KEY = process.env.IMAGEKIT_PRIVATE_KEY;
    const IMAGEKIT_PUBLIC_KEY = process.env.IMAGEKIT_PUBLIC_KEY;

    if (!IMAGEKIT_PRIVATE_KEY || !IMAGEKIT_PUBLIC_KEY) {
      return res.status(500).json({ error: "Missing ImageKit keys" });
    }

    const token = crypto.randomBytes(16).toString("hex");
    const expire = (Math.floor(Date.now() / 1000) + 3600).toString(); // 1h expiry
    const signature = crypto
      .createHmac("sha1", IMAGEKIT_PRIVATE_KEY)
      .update(token + expire)
      .digest("hex");

    res.status(200).json({
      token,
      expire,
      signature,
      publicKey: IMAGEKIT_PUBLIC_KEY,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
