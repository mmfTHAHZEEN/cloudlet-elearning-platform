/**
 * S3 object storage helper for course videos and materials.
 *
 * Demonstrates the "cloud object storage" requirement (Part 4) plus
 * generates time-limited signed URLs instead of making the bucket public -
 * this is your evidence for the "access control policies" and
 * "encryption in transit" rubric items.
 */

const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const REGION = process.env.AWS_REGION || 'us-east-1';
const BUCKET = process.env.VIDEO_BUCKET || 'elearning-course-videos';

const s3 = new S3Client({ region: REGION });

// Generate a presigned URL the frontend can PUT a file directly to (no
// file passes through your Lambda, so no 6MB API Gateway payload limit).
async function getUploadUrl(key, contentType) {
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType,
    ServerSideEncryption: 'AES256' // encryption at rest - Part 6 requirement
  });
  return getSignedUrl(s3, command, { expiresIn: 300 }); // 5 minute upload window
}

// Generate a presigned URL for playback/download - expires so links can't
// be shared indefinitely (access control policy, Part 4).
async function getPlaybackUrl(key) {
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  return getSignedUrl(s3, command, { expiresIn: 3600 }); // 1 hour
}

module.exports = { getUploadUrl, getPlaybackUrl, BUCKET };