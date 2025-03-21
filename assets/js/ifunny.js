$(document).ready(function () {
    const BACKEND_URL = "https://memerie.vercel.app";
    let memes = [];
    let selectedFile = null;

    $("#middle *").hide();

    async function fetchMemes() {
        try {
            const response = await fetch(`${BACKEND_URL}/api/list`);
            const result = await response.json();
            if (result.status === "success") {
                memes = result.data;
                updateHashtagLists();
                const urlQuery = getQueryParameter("q");
                if (urlQuery && urlQuery.trim().length > 0) {
                    $("#searchBar").val(urlQuery);
                    $("#query").text(`#${urlQuery}`);
                    const filtered = filterMemes(urlQuery);
                    displayMemes(filtered);
                    $("#middle #search, #middle #search-results").show();
                } else {
                    displayMemes(memes);
                    $("#middle #search, #middle #search-results").hide();
                }
            } else {
                console.error("Error loading memes:", result.error);
            }
        } catch (error) {
            console.error("Error fetching memes: ", error);
        }
    }

    function updateHashtagLists() {
        const tagCount = {};
        memes.forEach(meme => {
            if (meme.description) {
                meme.description.split(',').forEach(tag => {
                    tag = tag.trim();
                    if (tag) {
                        tagCount[tag] = (tagCount[tag] || 0) + 1;
                    }
                });
            }
        });
        const topTags = Object.keys(tagCount).slice(0, 15);
        const topTagsAlphabetical = topTags.sort((a, b) => a.localeCompare(b));
        const topTagsByCount = Object.keys(tagCount)
            .sort((a, b) => tagCount[b] - tagCount[a])
            .slice(0, 15);

        $('#meme-list').empty();
        topTagsAlphabetical.forEach(tag => {
            $('#meme-list').append(`<p class="hashtag">${tag}</p>`);
        });

        $('#categories').empty();
        topTagsAlphabetical.forEach(tag => {
            $('#categories').append(`<div class="category hashtag">${tag}</div>`);
        });
        $('#categories').append(`<div class="category new-cat"><input type="text" class="new-cat-input" placeholder="New Category" /></div>`);

        $('#search-categories').empty();
        topTagsByCount.forEach(tag => {
            $('#search-categories').append(`<div class="category hashtag">${tag} (${tagCount[tag]})</div>`);
        });
    }

    function getQueryParameter(name) {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(name);
    }

    function filterMemes(query) {
        const lowerQuery = query.toLowerCase();
        return memes.filter(meme =>
            meme.name.toLowerCase().includes(lowerQuery) ||
            (meme.description && meme.description.toLowerCase().includes(lowerQuery))
        );
    }

    $(document).on("click", "#meme-list .hashtag", function () {
        const clickedTag = $(this).text();
        history.replaceState(null, "", `?q=${encodeURIComponent(clickedTag)}`);
        const filtered = memes.filter(meme =>
            meme.description &&
            meme.description.split(',').map(tag => tag.trim().toLowerCase()).includes(clickedTag.toLowerCase())
        );
        $("#searchBar").val(clickedTag);
        $("#query").text(`#${clickedTag}`);
        displayMemes(filtered);
        $("#middle #search, #middle #search-results").show();
    });

    $(document).on("click", "#categories .category:not(.new-cat)", function () {
        $(this).toggleClass("active");
    });

    $(document).on("blur", ".new-cat-input", function () {
        const newCategory = $(this).val().trim();
        const parent = $(this).closest(".new-cat");
        if (newCategory.length > 0) {
            parent.replaceWith(`<div class="category hashtag active">${newCategory}</div>`);
        } else {
            parent.html(`<input type="text" class="new-cat-input" placeholder="New Category" />`);
        }
        if ($('#categories .new-cat').length === 0) {
            $('#categories').append(`<div class="category new-cat"><input type="text" class="new-cat-input" placeholder="New Category" /></div>`);
        }
    });

    function displayMemes(memeArray) {
        $("#search-results").empty();
        $("#results").text(memeArray.length + " results found");
        memeArray.slice(0, 10).forEach(meme => {
            const thumbUrl = `https://drive.google.com/thumbnail?id=${meme.id}&sz=w1000`;
            const resultElement = $(`
                <div class="search-result">
                    <img src="${thumbUrl}" alt="${meme.name}">
                    <div class="metadata"><p>${meme.name}</p></div>
                </div>
            `);
            $("#search-results").append(resultElement);
        });
    }

    $(document).on("click", "#upload", function (e) {
        if (!$(e.target).closest("#upload-content").length) {
            $("#upload").removeClass("active");
        }
    });

    $("#uploadFile").on("click", function () {
        let fileInput = $("<input>", { type: "file", accept: "image/*,video/*,audio/*" });
        fileInput.on("change", function (event) {
            selectedFile = event.target.files[0];
            if (!selectedFile) return;
            const fileName = selectedFile.name.replace(/\.[^/.]+$/, "");
            $("#upload-title").val(fileName);
            $("#upload").addClass("active");
        });
        fileInput.trigger("click");
    });

    $("#upload-form").on("submit", async function (e) {
        e.preventDefault();
        const title = $("#upload-title").val().trim();
        if (!title) {
            console.error("No title provided.");
            return;
        }
        if (!selectedFile) {
            console.error("No file selected.");
            return;
        }
        if (selectedFile.size > 5 * 1024 * 1024) {
            console.error("File too large!");
            return;
        }
        let selectedCategories = [];
        $("#categories .category.active").each(function () {
            selectedCategories.push($(this).text());
        });
        if (selectedCategories.length === 0) {
            console.error("No categories selected.");
            return;
        }
        const reader = new FileReader();
        reader.onload = async function () {
            const base64File = reader.result.split(",")[1];
            const fileName = title;
            try {
                const response = await fetch(`${BACKEND_URL}/api/upload`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        note: title,
                        categories: selectedCategories,
                        fileName: fileName,
                        fileContent: base64File,
                        mimeType: selectedFile.type
                    })
                });
                const result = await response.json();
                if (result.status === "success") {
                    $("#upload").removeClass("active");
                    $("#upload-form")[0].reset();
                    selectedFile = null;
                    fetchMemes();
                } else {
                    throw new Error(result.error);
                }
            } catch (error) {
                console.error("Upload error:", error);
            }
        };
        reader.readAsDataURL(selectedFile);
    });

    $("#searchBar").on("input", function () {
        const query = $(this).val().toLowerCase();
        history.replaceState(null, "", `?q=${encodeURIComponent(query)}`);
        $("#query").text(`#${query}`);
        const filtered = filterMemes(query);
        $("#results").text(filtered.length + " results found");
        displayMemes(filtered);
        if (query.trim().length > 0) $("#middle *").show();
        else $("#middle *").hide();
    });

    fetchMemes();

    $('.search-result img').on('click', function () {
        let imageUrl = $(this).attr('src');
        let fileName = imageUrl.split('/').pop();

        let a = document.createElement('a');
        a.href = imageUrl;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    });
});
