$(document).ready(async function() {
    const searchBar = $("#searchBar");
    const searchResultsContainer = $("#search-results");
    const queryDisplay = $("#query");
    const resultsDisplay = $("#results");
    const searchResults = $("#search-results");
    const uploadFile = $("#uploadFile");
    const uploadContainer = $("#upload");
    const uploadTitle = $("#upload-title");
    const uploadTags = $("#upload-tags");
    const uploadSubmit = $("#upload-submit");

    let memes = [];

    // Fetch the index.json file from GitHub
    async function fetchMemes() {
        try {
            const response = await $.getJSON("index.json");
            if (Array.isArray(response)) {
                memes = response;
            } else {
                console.error("Invalid JSON structure: Expected an array");
            }
        } catch (error) {
            console.error("Error fetching memes: ", error);
        }
    }

    await fetchMemes();

    // Normalize search input (remove accents, make lowercase)
    function normalizeText(text) {
        return typeof text === "string" ? text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase() : "";
    }

    // Handle search bar input
    searchBar.on("input", function() {
        const query = normalizeText($(this).val());
        queryDisplay.text(`#${query}`);
        updateSearchResults(query);
    });

    function updateSearchResults(query) {
        searchResults.empty();
        let filteredMemes = memes.filter(meme =>
            normalizeText(meme.title).includes(query) ||
            (Array.isArray(meme.hashtags) && meme.hashtags.some(tag => normalizeText(tag).includes(query)))
        );

        resultsDisplay.text(`${filteredMemes.length} results found`);

        filteredMemes.slice(0, 10).forEach(meme => {
            const resultElement = $("<div>").addClass("search-result");

            let mediaElement;
            if (meme.url.endsWith(".mp4") || meme.url.endsWith(".webm") || meme.url.endsWith(".mkv")) {
                mediaElement = $("<video>").attr({ src: meme.url, controls: true, autoplay: true, muted: true });
            } else if (meme.url.endsWith(".mp3") || meme.url.endsWith(".ogg") || meme.url.endsWith(".wav")) {
                mediaElement = $("<audio>").attr({ src: meme.url, controls: true });
            } else {
                mediaElement = $("<img>").attr({ src: meme.url, alt: meme.title });
            }

            const metadataDiv = $("<div>").addClass("metadata").html(`<p>${meme.title}</p>`);

            const categoriesDiv = $("<div>").addClass("categories");
            if (Array.isArray(meme.hashtags)) {
                meme.hashtags.forEach(tag => {
                    categoriesDiv.append($("<div>").addClass("category").text(tag));
                });
            }
            metadataDiv.append(categoriesDiv);

            resultElement.append(mediaElement, metadataDiv);
            searchResults.append(resultElement);
        });
    }

    // Handle URL parameters for search query
    const params = new URLSearchParams(window.location.search);
    if (params.has("query")) {
        const query = params.get("query");
        searchBar.val(query);
        queryDisplay.text(`#${query}`);
        updateSearchResults(normalizeText(query));
    }

    // Handle file selection for upload
    uploadFile.on("click", function() {
        let fileInput = $("<input>").attr({ type: "file", accept: "image/*,video/*,audio/*" });
        fileInput.on("change", function(event) {
            let file = event.target.files[0];
            if (!file) return;

            let fileName = file.name.split(".")[0]; // Remove extension
            uploadTitle.val(fileName);
            uploadContainer.addClass("active");
        });
        fileInput.trigger("click");
    });

    // Toggle active class for selected tags
    $(document).on("click", "#upload-tags .tag", function() {
        $(this).toggleClass("active");
    });

    // Handle upload submission to GitHub
    uploadSubmit.on("click", async function() {
        let selectedTags = [];
        $("#upload-tags .tag.active").each(function() {
            selectedTags.push($(this).text());
        });
        let title = uploadTitle.val().trim();
        if (!title || selectedTags.length === 0) {
            alert("Please provide a title and at least one tag.");
            return;
        }

        let fileInput = $("<input>").attr({ type: "file", accept: "image/*,video/*,audio/*" });
        let file = fileInput.prop("files")[0];
        if (!file) {
            alert("No file selected.");
            return;
        }

        let reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = async function() {
            let base64File = reader.result.split(",")[1];

            let githubApiUrl = "https://api.github.com/repos/ungaul/memerie/contents/memes_folder/" + file.name;

            let response = await fetch(githubApiUrl, {
                method: "PUT",
                headers: {
                    "Authorization": "token YOUR_GITHUB_TOKEN",
                    "Accept": "application/vnd.github.v3+json",
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    message: "Uploading new file: " + file.name,
                    content: base64File,
                    branch: "memes"
                })
            });

            let result = await response.json();
            if (response.ok) {
                alert("Upload successful!");
            } else {
                alert("Upload failed: " + result.message);
            }
        };
    });
});
