const { google } = require('googleapis');

const SCOPES = ['https://www.googleapis.com/auth/drive.readonly'];
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

  const folderId = req.query.folderId || DEFAULT_FOLDER_ID;
  try {
    const response = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      corpora: 'user',
      orderBy: 'folder,name',
      fields: 'nextPageToken, files(id, name, mimeType, parents, size, modifiedTime, appProperties, imageMediaMetadata)',
      pageSize: 100,
    });

    const files = response.data.files;
    files.forEach(file => {
      if (file.imageMediaMetadata && file.imageMediaMetadata.width && file.imageMediaMetadata.height) {
        file.dimensions = file.imageMediaMetadata.width + " x " + file.imageMediaMetadata.height;
      } else {
        file.dimensions = "-";
      }
    });

    res.status(200).json({ status: 'success', files });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};
