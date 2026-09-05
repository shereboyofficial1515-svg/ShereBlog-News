const multer = require('multer');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');

// In-memory storage: files are streamed straight to Supabase Storage in
// the controller, never written to local disk (no local-file cleanup to
// forget, no path-traversal surface on this server).
const storage = multer.memoryStorage();

const ALLOWED_IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const ALLOWED_DOCUMENT_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);
// Non-standard-but-real-world MIME strings some browsers/OS file pickers
// report for otherwise-legitimate files (e.g. older Windows tools report
// "image/jpg" instead of the correct "image/jpeg"). These are only ever
// treated as equivalent to a "real" allowed type when the file extension
// ALSO matches — a mismatched extension is still rejected either way, so
// this doesn't loosen the actual security check, just its tolerance for
// how differently browsers spell the same file type.
const MIME_ALIASES = new Set([
  'image/jpg', 'image/pjpeg', 'image/x-png',
  'application/x-pdf', 'text/pdf',
  'application/octet-stream', // generic "unknown binary" fallback some OSes use
]);
const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.pdf', '.doc', '.docx']);

function extensionOf(filename) {
  const idx = filename.lastIndexOf('.');
  return idx === -1 ? '' : filename.slice(idx).toLowerCase();
}

function fileFilter(req, file, cb) {
  const ext = extensionOf(file.originalname);
  const extAllowed = ALLOWED_EXTENSIONS.has(ext);
  const mimeAllowed =
    ALLOWED_IMAGE_MIME_TYPES.has(file.mimetype) ||
    ALLOWED_DOCUMENT_MIME_TYPES.has(file.mimetype) ||
    (extAllowed && MIME_ALIASES.has(file.mimetype));

  if (!mimeAllowed || !extAllowed) {
    cb(ApiError.badRequest(`Unsupported file type ("${file.mimetype || 'unknown'}", "${ext || 'no extension'}"). Allowed: JPG, PNG, WEBP, PDF, DOC, DOCX.`));
    return;
  }
  cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: env.uploads.maxSizeMb * 1024 * 1024,
    files: 1,
  },
});

/**
 * Wraps multer's single-file middleware so its errors (file too large,
 * rejected type) come out as our standard JSON error shape instead of
 * multer's raw error, and so a filter rejection reaches the centralized
 * error handler via next() instead of crashing the request.
 */
function singleFileUpload(fieldName) {
  const mw = upload.single(fieldName);
  return (req, res, next) => {
    mw(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return next(ApiError.badRequest(`File is too large. Maximum size is ${env.uploads.maxSizeMb}MB.`));
        }
        return next(ApiError.badRequest(err.message));
      }
      if (err) return next(err);
      next();
    });
  };
}

module.exports = { singleFileUpload, ALLOWED_IMAGE_MIME_TYPES, ALLOWED_DOCUMENT_MIME_TYPES };