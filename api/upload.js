const { google } = require('googleapis');
const formidable = require('formidable-serverless');
const fs = require('fs');

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

    const form = new formidable.IncomingForm();
    form.parse(req, async (err, fields, files) => {
        if (err) {
            res.status(500).json({ error: 'Error parsing form data' });
            return;
        }
        const note = fields.note || '';
        const file = files.meme;
        if (!file) {
            res.status(400).json({ error: 'No file uploaded' });
            return;
        }
        try {
            const fileStream = fs.createReadStream(file.path);
            const driveResponse = await drive.files.create({
                requestBody: {
                    name: file.name,
                    parents: [FOLDER_ID],
                    description: note
                },
                media: {
                    mimeType: file.type,
                    body: fileStream
                }
            });
            res.status(200).json({ status: 'success', data: driveResponse.data });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });
};
