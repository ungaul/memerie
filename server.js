import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();
const app = express();
app.use(express.json());
app.use(cors());

const GITHUB_REPO = "YOUR_GITHUB_USERNAME/YOUR_REPO";
const GITHUB_BRANCH = "memes";
const FOLDER_PATH = "memes_folder";
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

app.post("/upload", async (req, res) => {
    try {
        const { fileName, fileContent } = req.body;

        if (!fileName || !fileContent) {
            return res.status(400).json({ error: "Missing fileName or fileContent" });
        }

        const filePath = `${FOLDER_PATH}/${fileName}`;
        const apiUrl = `https://api.github.com/repos/${GITHUB_REPO}/contents/${filePath}`;

        const response = await fetch(apiUrl, {
            method: "PUT",
            headers: {
                "Authorization": `token ${GITHUB_TOKEN}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                message: `Upload ${fileName}`,
                content: fileContent,
                branch: GITHUB_BRANCH,
            }),
        });

        const result = await response.json();

        if (response.ok) {
            res.json({ success: true, url: result.content.download_url });
        } else {
            res.status(400).json({ error: result.message });
        }
    } catch (error) {
        console.error("Upload failed:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
