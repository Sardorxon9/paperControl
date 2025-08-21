const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
require('dotenv').config();

const app = express();

// Enable CORS for all routes
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true
}));

app.use(express.json());

// ImageKit configuration
// Normalize env vars to avoid stray quotes/whitespace issues
const sanitizeEnv = (val) => (val || '').replace(/^\"|\"$/g, '').trim();
const IMAGEKIT_PRIVATE_KEY = sanitizeEnv(process.env.IMAGEKIT_PRIVATE_KEY);
const IMAGEKIT_PUBLIC_KEY = sanitizeEnv(process.env.IMAGEKIT_PUBLIC_KEY);
const IMAGEKIT_URL_ENDPOINT = sanitizeEnv(process.env.IMAGEKIT_URL_ENDPOINT);

console.log('Server starting with ImageKit config:');
console.log('Public Key:', IMAGEKIT_PUBLIC_KEY ? IMAGEKIT_PUBLIC_KEY.substring(0, 20) + '...' : 'MISSING');
console.log('Private Key:', IMAGEKIT_PRIVATE_KEY ? 'Present (hidden)' : 'MISSING');
console.log('URL Endpoint:', IMAGEKIT_URL_ENDPOINT);

// Validate environment variables
if (!IMAGEKIT_PRIVATE_KEY || !IMAGEKIT_PUBLIC_KEY || !IMAGEKIT_URL_ENDPOINT) {
  console.error('❌ Missing required environment variables!');
  process.exit(1);
}

// ✅ FIXED: Correct signature generation
function getAuthenticationParameters() {
  const token = crypto.randomBytes(16).toString('hex'); // Use hex instead of UUID
  const expireNum = Math.floor(Date.now() / 1000) + 3600; // seconds
  const expire = expireNum.toString(); // ensure string for signing and returning
  
  // ImageKit expects the string to be token + expire (both strings)
  const stringToSign = token + expire;
  
  const signature = crypto
    .createHmac('sha1', IMAGEKIT_PRIVATE_KEY)
    .update(stringToSign)
    .digest('hex');

  return {
    token,
    expire, // return as string to avoid type ambiguity on client
    signature,
    publicKey: IMAGEKIT_PUBLIC_KEY
  };
}

// 🔐 Auth endpoint
app.get('/auth', (req, res) => {
  try {
    const authParams = getAuthenticationParameters();
    res.json(authParams);
  } catch (error) {
    console.error('❌ Error generating auth parameters:', error);
    res.status(500).json({ error: error.message });
  }
});

// ✅ ADDED: Test endpoint
app.get('/test', (req, res) => {
  try {
    const testAuth = getAuthenticationParameters();
    res.json({
      message: 'Auth generation test successful',
      sampleAuth: {
        hasToken: !!testAuth.token,
        hasExpire: !!testAuth.expire,
        hasSignature: !!testAuth.signature,
        hasPublicKey: !!testAuth.publicKey,
        tokenSample: testAuth.token.substring(0, 8) + '...',
        signatureLen: testAuth.signature.length,
        expire: testAuth.expire,
        expireTime: new Date(parseInt(testAuth.expire, 10) * 1000).toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      message: 'Auth generation test failed',
      error: error.message
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3002;

app.listen(PORT, () => {
  console.log(`🚀 ImageKit Auth Server running on port ${PORT}`);
  console.log(`📍 Test URL: http://localhost:${PORT}/test`);
  console.log(`🔐 Auth URL: http://localhost:${PORT}/auth`);
});