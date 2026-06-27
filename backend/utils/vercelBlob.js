const { put, del } = require('@vercel/blob');
const path = require('path');

const uploadToBlob = async (fileBuffer, originalName, prefix = '') => {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.warn('BLOB_READ_WRITE_TOKEN is not set in environment variables. Upload might fail.');
  }
  
  const ext = path.extname(originalName);
  const base = path.basename(originalName, ext).replace(/[^a-zA-Z0-9-]/g, '_').substring(0, 50);
  const uniqueName = `${prefix}${Date.now()}-${Math.round(Math.random() * 1e5)}-${base}${ext}`;
  
  const blob = await put(uniqueName, fileBuffer, {
    access: 'public',
    token: process.env.BLOB_READ_WRITE_TOKEN
  });
  
  return blob;
};

const deleteFromBlob = async (url) => {
  if (!process.env.BLOB_READ_WRITE_TOKEN || !url) return;
  try {
    await del(url, { token: process.env.BLOB_READ_WRITE_TOKEN });
  } catch (err) {
    console.error(`Failed to delete blob at ${url}:`, err.message);
  }
};

module.exports = { uploadToBlob, deleteFromBlob };
