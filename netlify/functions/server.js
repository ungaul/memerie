const fetch = require("node-fetch");

exports.handler = async function (event) {
    console.log("🔹 Checking GitHub Token:", process.env.GITHUB_TOKEN ? "Exists ✅" : "Missing ❌");

    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: JSON.stringify({ error: "Method Not Allowed" }) };
    }

    try {
        const { fileName, fileContent } = JSON.parse(event.body);

        if (!fileName || !fileContent) {
            console.error("❌ Missing parameters:", { fileName, fileContent });
            return { statusCode: 400, body: JSON.stringify({ error: "Missing parameters" }) };
        }

        console.log(`✅ Uploading ${fileName} to GitHub...`);

        // Upload to GitHub
        const githubApiUrl = `https://api.github.com/repos/ungaul/memerie/contents/tmp/${fileName}`;
        const response = await fetch(githubApiUrl, {
            method: "PUT",
            headers: {
                "Authorization": `token ${process.env.GITHUB_TOKEN}`,
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
            console.error("❌ GitHub API Error:", result);
            throw new Error(result.message);
        }

        console.log("✅ Upload successful:", result);

        return {
            statusCode: 200,
            body: JSON.stringify({ success: true, url: result.content.download_url })
        };

    } catch (error) {
        console.error("❌ Server error:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};
