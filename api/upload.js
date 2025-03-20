const { google } = require('googleapis');
const { PassThrough } = require('stream');

const SCOPES = ['https://www.googleapis.com/auth/drive.file'];
const FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;

const auth = new google.auth.JWT(
  process.env.GOOGLE_CLIENT_EMAIL,
  null,
  process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  SCOPES
);
const drive = google.drive({ version: 'v3', auth });

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  let data;
  try {
    data = req.body;
  } catch (error) {
    res.status(400).json({ error: 'Invalid JSON payload' });
    return;
  }
  const { note, categories, fileName, fileContent, mimeType } = data;
  if (!fileName || !fileContent || !mimeType) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }
  try {
    const buffer = Buffer.from(fileContent, 'base64');
    const stream = new PassThrough();
    stream.end(buffer);

    const driveResponse = await drive.files.create({
      requestBody: {
        name: fileName,
        parents: [FOLDER_ID],
        description: Array.isArray(categories) ? categories.join(', ') : ''
      },
      media: {
        mimeType,
        body: stream
      }
    });
    res.status(200).json({ status: 'success', data: driveResponse.data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
