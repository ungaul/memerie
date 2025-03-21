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
  const folderId = req.query.folderId || DEFAULT_FOLDER_ID;
  try {
    const response = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: 'files(id, name, size, modifiedTime, mimeType, parents, appProperties)',
      pageSize: 100,
    });

    const files = response.data.files.map(file => ({
      id: file.id,
      title: file.name,
      filesize: file.size,
      lastmodified: file.modifiedTime,
      keywords: file.appProperties ? file.appProperties.keywords : null,
      mimeType: file.mimeType,
      parents: file.parents,
    }));

    res.status(200).json({ status: 'success', files });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};
