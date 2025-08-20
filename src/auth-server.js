require('dotenv').config({ path: '../.env' }); // Path to .env in root folder
const express = require('express');
const ImageKit = require('imagekit');
const cors = require('cors');

const app = express();
app.use(cors());

const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT
});

app.get('/auth', (req, res) => {
  const authParams = imagekit.getAuthenticationParameters();
  res.json({
    ...authParams,
    publicKey: process.env.IMAGEKIT_PUBLIC_KEY
  });
});

app.listen(process.env.PORT || 3001, () => {
  console.log(`Auth server running on port ${process.env.PORT || 3001}`);
});