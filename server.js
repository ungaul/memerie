const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "5mb" }));

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO_NAME = process.env.REPO_NAME;

// Route pour uploader un fichier vers GitHub
app.post("/upload", async (req, res) => {
    try {
        const { fileName, fileContent } = req.body;
        if (!fileName || !fileContent) {
            return res.status(400).json({ error: "Missing parameters" });
        }

        // URL GitHub pour ajouter le fichier dans tmp/
        const githubApiUrl = `https://api.github.com/repos/${REPO_NAME}/contents/tmp/${fileName}`;

        const response = await fetch(githubApiUrl, {
            method: "PUT",
            headers: {
                "Authorization": `token ${GITHUB_TOKEN}`,
                "Accept": "application/vnd.github.v3+json",
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                message: `Upload ${fileName} via Railway`,
                content: fileContent,
                branch: "main"
            })
        });

        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.message);
        }

        res.json({ success: true, url: result.content.download_url });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
