import mongoose from 'mongoose';
import { ObjectId } from 'mongodb';

// ---------------------------------------------------------
// DB access — reuses the existing Mongoose connection (see utils/db.js)
// rather than opening a second connection/pool. mongoose.connection.db is a
// plain native MongoDB driver Db instance, so every function below talks to
// collections directly, with no Mongoose model/schema involved.
// ---------------------------------------------------------
export function getDB() {
  if (mongoose.connection.readyState !== 1) {
    throw new Error('Database not connected. Call connectDB() first.');
  }
  return mongoose.connection.db;
}

const isObjectIdString = (v) => typeof v === 'string' && /^[0-9a-fA-F]{24}$/.test(v);

/** Convert a single id (string or ObjectId) to ObjectId; passthrough if it isn't a valid id string. */
export function toObjectId(id) {
  if (id == null || id instanceof ObjectId) return id;
  return isObjectIdString(id) ? new ObjectId(id) : id;
}

/**
 * Convert string id fields to ObjectId. There's no app-wide default field
 * list (collections vary too much) — pass the field names that apply to the
 * document/filter you're working with; '_id' is covered automatically by
 * fetchData/executeData already.
 */
export function objectId(data, fields = []) {
  try {
    if (Array.isArray(data)) return data.map((doc) => objectId(doc, fields));
    if (typeof data !== 'object' || data === null) return data;

    const converted = { ...data };
    for (const field of fields) {
      const value = converted[field];
      if (value == null || value instanceof ObjectId) continue;
      if (isObjectIdString(value)) converted[field] = new ObjectId(value);
    }
    return converted;
  } catch (error) {
    console.error('objectId error:', error);
    return data;
  }
}

function errorCodeFromStatus(status) {
  const map = {
    400: 'BAD_REQUEST', 401: 'UNAUTHORIZED', 403: 'FORBIDDEN', 404: 'NOT_FOUND',
    409: 'CONFLICT', 413: 'PAYLOAD_TOO_LARGE', 422: 'VALIDATION_ERROR',
    429: 'RATE_LIMITED', 500: 'SERVER_ERROR', 502: 'BAD_GATEWAY', 503: 'SERVICE_UNAVAILABLE',
  };
  const s = parseInt(status, 10);
  if (!s || Number.isNaN(s)) return 'UNKNOWN_ERROR';
  return map[s] || `HTTP_${s}`;
}

// Fields that must never reach the error log, whatever the request body shape.
const SENSITIVE_KEYS = [
  'password', 'currentPassword', 'newPassword', 'confirmPassword',
  'token', 'accessToken', 'refreshToken',
  'resetPasswordToken', 'otp',
];

function redactPayload(payload) {
  if (!payload || typeof payload !== 'object') return payload;
  const clean = { ...payload };
  for (const key of SENSITIVE_KEYS) {
    if (key in clean) clean[key] = '[REDACTED]';
  }
  return clean;
}

/** Logs to the `errorlogs` collection. Never throws — a logging failure must not break the request. */
export async function logError(errorInfo) {
  try {
    await getDB().collection('errorlogs').insertOne({
      route: errorInfo.route || '',
      backend_route: errorInfo.backend_route || '',
      payload: redactPayload(errorInfo.payload) || {},
      error_message: errorInfo.error_message || '',
      error_code: errorInfo.error_code || errorCodeFromStatus(errorInfo.http_status),
      http_status: errorInfo.http_status ?? null,
      ip_address: errorInfo.ip_address || '',
      createdAt: new Date(),
    });
  } catch (err) {
    console.error('Failed to log error:', err);
  }
}

/**
 * Apply defaults/validation from a plain-object schema — NOT a Mongoose
 * schema: { fieldName: { default, required, enum } }. Used by executeData
 * for the flat, relation-free collections that bypass Mongoose entirely.
 */
function applySchema(data, schema, isUpdate = false) {
  if (!schema) return data;

  const processDocument = (doc) => {
    if (typeof doc !== 'object' || doc === null) return doc;
    const processed = { ...doc };

    for (const [fieldName, fieldSchema] of Object.entries(schema)) {
      const fieldValue = processed[fieldName];
      if (fieldValue !== undefined && fieldValue !== null) {
        if (fieldSchema.enum && !fieldSchema.enum.includes(fieldValue)) {
          console.warn(`Schema warning: ${fieldName} value "${fieldValue}" not in enum [${fieldSchema.enum.join(', ')}]`);
        }
        continue;
      }
      if (isUpdate) continue;
      if (fieldSchema.default !== undefined) {
        processed[fieldName] = typeof fieldSchema.default === 'function' ? fieldSchema.default() : fieldSchema.default;
      }
      if (fieldSchema.required && processed[fieldName] === undefined) {
        console.warn(`Schema warning: required field "${fieldName}" is missing`);
      }
    }
    return processed;
  };

  return Array.isArray(data) ? data.map(processDocument) : processDocument(data);
}

/**
 * Insert / update / delete on a raw collection, bypassing Mongoose. Only for
 * flat CRUD entities with no relations — anything needing joins (.populate()
 * territory) stays on its Mongoose model instead.
 *
 * @param {string} collectionName
 * @param {Object|Array} data - document(s) to insert, or the update payload
 * @param {'i'|'u'|'d'} operation
 * @param {Object|null} schema - plain-object schema (see applySchema), optional
 * @param {Object|null} filter - required for update/delete
 * @param {Object} options - { many, force, hardDelete, deletedBy, objectIdFields }
 */
export async function executeData(collectionName, data, operation, schema = null, filter = null, options = {}) {
  if (!collectionName) throw new Error('collectionName is required');
  const op = operation.toLowerCase();
  if (!['i', 'u', 'd'].includes(op)) throw new Error('operation must be "i" (insert), "u" (update), or "d" (delete)');

  const collection = getDB().collection(collectionName);

  if (op === 'i') {
    if (!data) throw new Error('data is required for insert operation');
    const withDefaults = schema ? applySchema(data, schema, false) : data;
    const converted = objectId(withDefaults, options.objectIdFields || []);
    const now = new Date();

    if (Array.isArray(converted)) {
      const docs = converted.map((d) => ({ ...d, createdAt: now, updatedAt: now }));
      const result = await collection.insertMany(docs, options);
      return { success: true, data: result, insertedCount: result.insertedCount };
    }
    const doc = { ...converted, createdAt: now, updatedAt: now };
    const result = await collection.insertOne(doc, options);
    return { success: true, data: { ...doc, _id: result.insertedId } };
  }

  if (op === 'u') {
    if (!data) throw new Error('data is required for update operation');
    const updateFilter = objectId(filter || options.filter || {}, ['_id']);
    if (Object.keys(updateFilter).length === 0 && !options.force) {
      throw new Error('filter is required for update operation (5th param or options.filter)');
    }

    const hasOperators = typeof data === 'object' && Object.keys(data).some((k) => k.startsWith('$'));
    const updateData = hasOperators
      ? { ...data, $set: { ...(data.$set || {}), updatedAt: new Date() } }
      : { $set: { ...(schema ? applySchema(data, schema, true) : data), updatedAt: new Date() } };

    if (options.many) {
      const result = await collection.updateMany(updateFilter, updateData, options);
      return { success: true, matchedCount: result.matchedCount, modifiedCount: result.modifiedCount };
    }
    const result = await collection.updateOne(updateFilter, updateData, options);
    if (result.matchedCount === 0) return { success: false, message: 'No document found matching the filter', data: null };
    const updatedDoc = await collection.findOne(updateFilter);
    return { success: true, data: updatedDoc };
  }

  // op === 'd'
  const deleteFilter = objectId(filter || options.filter || {}, ['_id']);
  if (Object.keys(deleteFilter).length === 0 && !options.force) {
    throw new Error('filter is required for delete operation (5th param, options.filter, or options.force = true)');
  }

  if (options.hardDelete) {
    if (options.many) {
      const result = await collection.deleteMany(deleteFilter, options);
      return { success: true, deletedCount: result.deletedCount };
    }
    const result = await collection.findOneAndDelete(deleteFilter, options);
    return { success: true, data: result ?? null };
  }

  // Soft delete — matches the `isDeleted` convention every schema in this app already uses.
  const softDelete = {
    $set: {
      isDeleted: true,
      updatedAt: new Date(),
      ...(options.deletedBy && { updatedBy: options.deletedBy }),
    },
  };
  if (options.many) {
    const result = await collection.updateMany(deleteFilter, softDelete, options);
    return { success: true, modifiedCount: result.modifiedCount };
  }
  // Driver v7 default (includeResultMetadata: false): the document comes back
  // directly, or null if nothing matched — not wrapped in `{ value }`.
  const result = await collection.findOneAndUpdate(deleteFilter, softDelete, { returnDocument: 'after', ...options });
  if (!result) return { success: false, message: 'No document found matching the filter', data: null };
  return { success: true, data: result };
}

/**
 * Read from a raw collection with projection/filter/sort/limit/skip. Only for
 * flat CRUD entities with no relations — anything needing joins stays on its
 * Mongoose model + .populate() instead.
 */
export async function fetchData(collectionName, projection = {}, filter = {}, options = {}) {
  if (!collectionName) throw new Error('collectionName is required');
  const collection = getDB().collection(collectionName);
  const queryFilter = objectId(filter, ['_id']);

  let query = collection.find(queryFilter);
  if (projection && Object.keys(projection).length > 0) query = query.project(projection);
  if (options.sort) query = query.sort(options.sort);
  if (options.skip) query = query.skip(parseInt(options.skip, 10));
  if (options.limit) query = query.limit(parseInt(options.limit, 10));

  const data = await query.toArray();
  const count = options.count ? await collection.countDocuments(queryFilter) : data.length;
  return { success: true, data, count };
}

/**
 * Response middleware — every controller sets
 *   res.locals.responseData = { success, message, data, status, error, code }
 * and calls next(); this formats and sends the HTTP response, logging
 * failures to `errorlogs`. Thrown ApiErrors bypass this (they go straight to
 * the global error handler in index.js), which also calls logError.
 */
export async function responsedata(req, res, next) {
  if (res.headersSent) return;
  const responseData = res.locals.responseData;

  if (responseData?.success) {
    res.status(responseData.status || 200).json({
      success: true,
      message: responseData.message || 'Success',
      data: responseData.data ?? null,
    });
    return;
  }

  const httpStatus = responseData?.status || 500;
  res.status(httpStatus).json({
    success: false,
    message: responseData?.message || 'Operation failed',
    error: responseData?.error || responseData?.message || 'Unknown error',
  });

  logError({
    route: req.originalUrl,
    backend_route: req.path,
    payload: req.body || {},
    error_message: responseData?.error || responseData?.message || 'Unknown error',
    error_code: responseData?.code,
    http_status: httpStatus,
    ip_address: req.ip || req.socket?.remoteAddress || '',
  });
}
