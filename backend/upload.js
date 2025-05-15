const { google } = require('googleapis');
const { PassThrough } = require('stream');

const rateLimitMap = {};

function canUpload(ip) {
  const now = Date.now();
  const ONE_HOUR = 60 * 60 * 1000;
  const cutoff = now - ONE_HOUR;

  if (!rateLimitMap[ip]) {
    rateLimitMap[ip] = [];
  }
  rateLimitMap[ip] = rateLimitMap[ip].filter(ts => ts > cutoff);

  if (rateLimitMap[ip].length >= 10) {
    return false;
  }
  rateLimitMap[ip].push(now);
  return true;
}

const SCOPES = ['https://www.googleapis.com/auth/drive.file'];
const DEFAULT_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID || 'root';

const auth = new google.auth.JWT(
  process.env.GOOGLE_CLIENT_EMAIL,
  null,
  process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  SCOPES
);
const drive = google.drive({ version: 'v3', auth });

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ status: 'error', message: 'Method not allowed' });
  }

  const data = req.body;
  if (!data) {
    return res.status(400).json({ status: 'error', message: 'Invalid JSON payload' });
  }

  const { note, fileName, fileContent, mimeType, folderId, path, dimensions } = data;
  if (!fileName || !fileContent || !mimeType) {
    return res.status(400).json({ status: 'error', message: 'Missing required fields' });
  }

  const ip = (req.headers['x-forwarded-for'] || req.connection.remoteAddress || '').split(',')[0].trim();
  if (!canUpload(ip)) {
    return res.status(429).json({
      status: 'error',
      message: 'Rate limit: You have exceeded 10 uploads in the last hour.'
    });
  }

  const buffer = Buffer.from(fileContent, 'base64');
  if (buffer.length > 20 * 1024 * 1024) {
    return res.status(400).json({
      status: 'error',
      message: 'File too large. The limit is 20 MB.'
    });
  }

  const stream = new PassThrough();
  stream.end(buffer);

  try {
    const driveResponse = await drive.files.create({
      requestBody: {
        name: fileName,
        parents: [folderId || DEFAULT_FOLDER_ID],
        description: note,
        appProperties: {
          path: path || '',
          dimensions: dimensions || ''
        }
      },
      media: {
        mimeType,
        body: stream
      }
    });
    res.status(200).json({ status: 'success', data: driveResponse.data });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};
