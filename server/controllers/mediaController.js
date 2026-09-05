const { v4: uuidv4 } = require('uuid');
const { supabaseAdmin } = require('../config/supabase');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { stripAllHtml } = require('../utils/sanitize');
const { recordAudit } = require('../services/auditService');
const { ALLOWED_IMAGE_MIME_TYPES } = require('../middleware/upload');

function formatMedia(row) {
  if (!row) return null;
  return {
    id: row.id,
    fileName: row.file_name,
    fileUrl: row.file_url,
    fileType: row.file_type,
    mimeType: row.mime_type,
    fileSize: row.file_size,
    altText: row.alt_text,
    caption: row.caption,
    uploadedBy: row.uploaded_by,
    createdAt: row.created_at,
  };
}

function extensionOf(filename) {
  const idx = filename.lastIndexOf('.');
  return idx === -1 ? '' : filename.slice(idx).toLowerCase();
}

// Cached for the life of the process — avoids hitting the Storage API on
// every single upload just to re-check something that basically never
// changes after the first successful check.
let bucketReady = false;

/**
 * Ensures the configured Storage bucket exists before an upload is
 * attempted, creating it (as a public bucket, matching how
 * getPublicUrl() is used below) if it doesn't. This removes a common
 * first-run gotcha: previously, uploads failed with an opaque
 * "Bucket not found" error until someone manually created the bucket
 * in the Supabase dashboard.
 */
async function ensureBucketExists() {
  if (bucketReady) return;

  const { data: existing, error: getError } = await supabaseAdmin.storage.getBucket(env.supabase.mediaBucket);

  if (existing && !getError) {
    bucketReady = true;
    return;
  }

  const { error: createError } = await supabaseAdmin.storage.createBucket(env.supabase.mediaBucket, {
    public: true,
    // A plain byte count, not a shorthand string like '8MB' — the
    // string form isn't reliably supported across every
    // @supabase/supabase-js patch version, and a rejected/misparsed
    // value here would silently break every single upload.
    fileSizeLimit: env.uploads.maxSizeMb * 1024 * 1024,
  });

  if (createError) {
    const msg = (createError.message || '').toLowerCase();
    const looksLikeAlreadyExists = msg.includes('already exists') || msg.includes('duplicate') || createError.status === 409 || createError.statusCode === 409;

    if (!looksLikeAlreadyExists) {
      // Race-safety: before giving up, check one more time whether the
      // bucket exists anyway (e.g. another request created it a moment
      // ago, or the create call failed for a reason unrelated to
      // whether the bucket is actually there now).
      const { data: recheck } = await supabaseAdmin.storage.getBucket(env.supabase.mediaBucket);
      if (recheck) {
        bucketReady = true;
        return;
      }
      throw ApiError.internal(`Could not prepare storage bucket "${env.supabase.mediaBucket}": ${createError.message}`);
    }
  }

  bucketReady = true;
}

/**
 * POST /api/media
 * Requires: author, editor, admin, or super_admin (any staff who can
 * also create content — enforced in the route).
 *
 * The original filename is NEVER trusted for the storage path — a fresh
 * UUID-based name is generated server-side, so path traversal and
 * filename collisions aren't possible regardless of what the client sent.
 */
const uploadMedia = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw ApiError.badRequest('No file was uploaded');
  }

  await ensureBucketExists();

  const ext = extensionOf(req.file.originalname);
  const safeName = `${uuidv4()}${ext}`;
  const storagePath = `${new Date().toISOString().slice(0, 7)}/${safeName}`;

  const { error: uploadError } = await supabaseAdmin.storage
    .from(env.supabase.mediaBucket)
    .upload(storagePath, req.file.buffer, {
      contentType: req.file.mimetype,
      upsert: false,
    });

  if (uploadError) {
    throw ApiError.internal(`Upload failed: ${uploadError.message}`);
  }

  const { data: publicUrlData } = supabaseAdmin.storage.from(env.supabase.mediaBucket).getPublicUrl(storagePath);

  const fileType = ALLOWED_IMAGE_MIME_TYPES.has(req.file.mimetype) ? 'image' : 'document';

  const { data: created, error: insertError } = await supabaseAdmin
    .from('media')
    .insert({
      file_name: stripAllHtml(req.file.originalname).slice(0, 255),
      storage_path: storagePath,
      file_url: publicUrlData.publicUrl,
      file_type: fileType,
      mime_type: req.file.mimetype,
      file_size: req.file.size,
      alt_text: req.body.altText ? stripAllHtml(req.body.altText) : null,
      caption: req.body.caption ? stripAllHtml(req.body.caption) : null,
      uploaded_by: req.user.id,
    })
    .select('*')
    .single();

  if (insertError) {
    // Roll back the uploaded file if we couldn't record its metadata, so
    // Storage doesn't accumulate orphaned files with no DB row.
    await supabaseAdmin.storage.from(env.supabase.mediaBucket).remove([storagePath]);
    throw ApiError.internal(insertError.message);
  }

  res.status(201).json({ success: true, message: 'File uploaded', data: { media: formatMedia(created) } });
});

/**
 * GET /api/media
 * Staff — list/search/filter the media library.
 */
const listMedia = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const pageSize = parseInt(req.query.pageSize, 10) || 24;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabaseAdmin.from('media').select('*', { count: 'exact' }).order('created_at', { ascending: false }).range(from, to);

  if (req.query.type) query = query.eq('file_type', req.query.type);
  if (req.query.search) query = query.ilike('file_name', `%${req.query.search}%`);

  const { data, error, count } = await query;
  if (error) throw ApiError.internal(error.message);

  res.status(200).json({ success: true, data: { media: (data || []).map(formatMedia), total: count || 0, page, pageSize } });
});

/**
 * PUT /api/media/:id
 * Update alt text / caption.
 */
const updateMedia = asyncHandler(async (req, res) => {
  const update = {};
  if (req.body.altText !== undefined) update.alt_text = stripAllHtml(req.body.altText || '');
  if (req.body.caption !== undefined) update.caption = stripAllHtml(req.body.caption || '');

  const { data: updated, error } = await supabaseAdmin.from('media').update(update).eq('id', req.params.id).select('*').single();
  if (error || !updated) throw ApiError.notFound('Media not found');

  res.status(200).json({ success: true, message: 'Media updated', data: { media: formatMedia(updated) } });
});

/**
 * DELETE /api/media/:id
 * Removes both the Storage object and the metadata row.
 */
const deleteMedia = asyncHandler(async (req, res) => {
  const { data: existing, error: fetchError } = await supabaseAdmin
    .from('media')
    .select('id, storage_path, file_name')
    .eq('id', req.params.id)
    .single();

  if (fetchError || !existing) throw ApiError.notFound('Media not found');

  await supabaseAdmin.storage.from(env.supabase.mediaBucket).remove([existing.storage_path]);

  const { error: deleteError } = await supabaseAdmin.from('media').delete().eq('id', req.params.id);
  if (deleteError) throw ApiError.internal(deleteError.message);

  await recordAudit({
    userId: req.user.id,
    action: 'media_deleted',
    resourceType: 'media',
    resourceId: req.params.id,
    metadata: { fileName: existing.file_name },
    ipAddress: req.ip,
  });

  res.status(200).json({ success: true, message: 'Media deleted' });
});

module.exports = { uploadMedia, listMedia, updateMedia, deleteMedia };