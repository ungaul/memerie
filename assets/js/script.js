$(document).ready(async function() {
    const searchBar = $("#searchBar");
    const searchResultsContainer = $("#search-results");
    const queryDisplay = $("#query");
    const resultsDisplay = $("#results");
    const searchResults = $("#search-results");

    let memes = [];

    // Fetch the index.json file from GitHub
    async function fetchMemes() {
        try {
            const response = await $.getJSON("https://raw.githubusercontent.com/ungaul/memerie/main/memes/index.json");
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
            if (meme.url.replace('/memes/main/', '/main/memes/').replace('/main/', '/memes/').replace('/memes/main/', '/main/memes/').replace('/main/', '/memes/').endsWith(".mp4") || meme.url.endsWith(".webm") || meme.url.endsWith(".mkv")) {
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
});
