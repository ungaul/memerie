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

async function getAllFilesRecursively(folderId) {
  let files = [];

  async function listFolder(id) {
    const response = await drive.files.list({
      q: `'${id}' in parents and trashed = false`,
      fields: 'files(id, name, mimeType, parents, size, modifiedTime, appProperties, imageMediaMetadata)',
      pageSize: 1000
    });

    for (const file of response.data.files) {
      if (file.mimeType === 'application/vnd.google-apps.folder') {
        await listFolder(file.id);
      } else {
        files.push(file);
      }
    }
  }

  await listFolder(folderId);
  return files;
}

async function computePath(file) {
  if (!file.parents || file.parents.length === 0 || file.parents[0] === DEFAULT_FOLDER_ID || file.parents[0] === 'root') {
    return "Home";
  }
  const parentId = file.parents[0];
  const parentResponse = await drive.files.get({
    fileId: parentId,
    fields: 'id, name, parents'
  });
  const parentData = parentResponse.data;
  const parentPath = await computePath(parentData);
  return parentPath + " > " + parentData.name;
}

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ status: 'error', message: 'Method not allowed' });
  }

  const query = (req.query.q || '').toLowerCase();
  if (!query) {
    return res.status(400).json({ status: 'error', message: 'Missing search query' });
  }

  try {
    const allFiles = await getAllFilesRecursively(DEFAULT_FOLDER_ID);

    const matched = allFiles.filter(file =>
      (file.name || '').toLowerCase().includes(query)
    );

    const enriched = await Promise.all(matched.map(async file => {
      if (file.imageMediaMetadata?.width && file.imageMediaMetadata?.height) {
        file.dimensions = `${file.imageMediaMetadata.width} x ${file.imageMediaMetadata.height}`;
      } else {
        file.dimensions = "-";
      }
      try {
        file.path = await computePath(file);
      } catch {
        file.path = "-";
      }
      return file;
    }));

    res.status(200).json({ status: 'success', files: enriched });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};
