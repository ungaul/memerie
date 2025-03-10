const fetch = require("node-fetch");

exports.handler = async function (event) {
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: "Method Not Allowed" };
    }

    try {
        const { fileName, fileContent } = JSON.parse(event.body);
        if (!fileName || !fileContent) {
            return { statusCode: 400, body: "Missing parameters" };
        }

        // Upload to GitHub (TMP folder, then move via GitHub Actions)
        const githubApiUrl = `https://api.github.com/repos/ungaul/memerie/contents/tmp/${fileName}`;
        const response = await fetch(githubApiUrl, {
            method: "PUT",
            headers: {
                "Authorization": `token ${process.env.GITHUB_TOKEN}`, // ✅ SECURE
                "Accept": "application/vnd.github.v3+json",
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                message: `Upload ${fileName} via Netlify`,
                content: fileContent,
                branch: "main"
            })
        });

        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.message);
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ success: true, url: result.content.download_url })
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};
