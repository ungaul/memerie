$(document).ready(async function () {
    const searchBar = $("#searchBar");
    const queryDisplay = $("#query");
    const resultsDisplay = $("#results");
    const searchResults = $("#search-results");
    const uploadFile = $("#uploadFile");
    const uploadContainer = $("#upload");
    const uploadTitle = $("#upload-title");
    const uploadTags = $("#upload-tags");
    const uploadSubmit = $("#upload-submit");
    const notification = $("#notification");

    let memes = [];
    let selectedFile = null;

    const NETLIFY_BACKEND_URL = "/.netlify/functions/server";

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

    function normalizeText(text) {
        return typeof text === "string" ? text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase() : "";
    }

    searchBar.on("input", function () {
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

    const params = new URLSearchParams(window.location.search);
    if (params.has("query")) {
        const query = params.get("query");
        searchBar.val(query);
        queryDisplay.text(`#${query}`);
        updateSearchResults(normalizeText(query));
    }

    uploadFile.on("click", function () {
        let fileInput = $("<input>").attr({ type: "file", accept: "image/*,video/*,audio/*" });
        fileInput.on("change", function (event) {
            selectedFile = event.target.files[0];
            if (!selectedFile) return;

            let fileName = selectedFile.name.split(".")[0];
            uploadTitle.val(fileName);
            uploadContainer.addClass("active");
        });
        fileInput.trigger("click");
    });

    $(document).on("click", ".category", function () {
        $(this).toggleClass("active");
    });

    uploadSubmit.on("click", async function () {
        let selectedTags = [];
        $(".category.active").each(function () {
            selectedTags.push($(this).text());
        });
        let title = uploadTitle.val().trim();
        if (!title || selectedTags.length === 0) {
            alert("Please provide a title and at least one tag.");
            return;
        }

        if (!selectedFile) {
            alert("No file selected.");
            return;
        }

        if (selectedFile.size > 5 * 1024 * 1024) {
            alert("File too large! Max size is 5MB.");
            return;
        }

        let reader = new FileReader();
        reader.readAsDataURL(selectedFile);
        reader.onload = async function () {
            let base64File = reader.result.split(",")[1];

            let fileName = selectedFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");

            console.log("Uploading to Netlify Backend...");

            try {
                let response = await fetch(NETLIFY_BACKEND_URL, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ fileName, fileContent: base64File })
                });

                let result = await response.json();
                if (result.success) {
                    alert("Upload successful! File URL: " + result.url);
                    notification.addClass("active");
                    setTimeout(() => {
                        notification.removeClass("active");
                    }, 5000);
                } else {
                    throw new Error(result.error);
                }
            } catch (error) {
                console.error("Upload error: ", error);
                alert("Upload failed.");
            }
        };
    });
});
