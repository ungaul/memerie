const { google } = require('googleapis');
const { PassThrough } = require('stream');

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
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ status: 'error', message: 'Method not allowed' });
    return;
  }

  let data;
  try {
    data = req.body;
  } catch (err) {
    res.status(400).json({ status: 'error', message: 'Invalid JSON payload' });
    return;
  }

  const { note, fileName, fileContent, mimeType, folderId, path, dimensions } = data;
  if (!fileName || !fileContent || !mimeType) {
    res.status(400).json({ status: 'error', message: 'Missing required fields' });
    return;
  }

  const buffer = Buffer.from(fileContent, 'base64');
  const stream = new PassThrough();
  stream.end(buffer);

  try {
    const driveResponse = await drive.files.create({
      requestBody: {
        name: fileName,
        parents: [ folderId || DEFAULT_FOLDER_ID ],
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
