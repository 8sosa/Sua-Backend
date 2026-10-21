const mongoose = require('mongoose');
const multer = require('multer');

// Files are kept in MongoDB GridFS so uploads survive redeploys (the host's disk is ephemeral).
const BUCKET = 'portalFiles';
const MAX_BYTES = 25 * 1024 * 1024;

const bucket = () => new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: BUCKET });

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_BYTES, files: 1 } });

// Wraps multer so oversized or malformed uploads get a JSON error instead of an HTML stack trace.
const singleFile = (field) => (req, res, next) =>
  upload.single(field)(req, res, (err) => {
    if (!err) return next();
    const tooBig = err.code === 'LIMIT_FILE_SIZE';
    res.status(tooBig ? 413 : 400).json({ message: tooBig ? 'Files must be 25 MB or smaller.' : 'Could not read the uploaded file.' });
  });

const saveFile = (file) =>
  new Promise((resolve, reject) => {
    const stream = bucket().openUploadStream(file.originalname, { contentType: file.mimetype });
    stream.on('error', reject);
    stream.on('finish', () => resolve(stream.id));
    stream.end(file.buffer);
  });

const deleteFile = async (id) => {
  if (!id) return;
  try {
    await bucket().delete(new mongoose.Types.ObjectId(id));
  } catch {
    // Already gone.
  }
};

const sendFile = (res, { fileId, fileName, mimeType }) => {
  res.setHeader('Content-Type', mimeType || 'application/octet-stream');
  res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`);
  bucket()
    .openDownloadStream(new mongoose.Types.ObjectId(fileId))
    .on('error', () => {
      if (!res.headersSent) res.status(404).json({ message: 'File not found.' });
      else res.end();
    })
    .pipe(res);
};

module.exports = { singleFile, saveFile, deleteFile, sendFile, MAX_BYTES };
