$(document).ready(function () {
    const BACKEND_URL = "https://memerie.vercel.app";
    let memes = [];
    let selectedFile = null;

    async function fetchMemes() {
        try {
            const response = await fetch(`${BACKEND_URL}/api/list`);
            const result = await response.json();
            if (result.status === "success") {
                memes = result.data;
            } else {
                console.error("Error loading memes:", result.error);
            }
        } catch (error) {
            console.error("Error fetching memes: ", error);
        }
    }

    // Toggle active class on each category when clicked
    $(document).on("click", ".category", function () {
        $(this).toggleClass("active");
    });

    $("#uploadFile").on("click", function () {
        let fileInput = $("<input>", { type: "file", accept: "image/*,video/*,audio/*" });
        fileInput.on("change", function (event) {
            selectedFile = event.target.files[0];
            if (!selectedFile) return;
            const fileName = selectedFile.name.split(".")[0];
            $("#upload-title").val(fileName);
            $("#upload").addClass("active");
        });
        fileInput.trigger("click");
    });

    $("#upload-form").on("submit", async function (e) {
        e.preventDefault();
        const title = $("#upload-title").val().trim();
        if (!title) {
            alert("Please provide a title.");
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

        // Gather selected categories (keywords) from .category.active elements.
        let selectedCategories = [];
        $(".category.active").each(function () {
            selectedCategories.push($(this).text());
        });
        if (selectedCategories.length === 0) {
            alert("Please select at least one category.");
            return;
        }

        const reader = new FileReader();
        reader.onload = async function () {
            const base64File = reader.result.split(",")[1];
            const fileName = selectedFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
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
                    alert("Upload successful! File ID: " + result.data.id);
                    $("#upload-form")[0].reset();
                    selectedFile = null;
                    fetchMemes(); // Refresh meme list
                } else {
                    throw new Error(result.error);
                }
            } catch (error) {
                console.error("Upload error:", error);
                alert("Upload failed.");
            }
        };
        reader.readAsDataURL(selectedFile);
    });

    $("#searchBar").on("input", function () {
        const query = $(this).val().toLowerCase();
        $("#query").text(`#${query}`);
        const filtered = memes.filter(meme =>
            meme.name.toLowerCase().includes(query) ||
            (meme.description && meme.description.toLowerCase().includes(query))
        );
        $("#results").text(filtered.length + " results found");
        $("#search-results").empty();
        filtered.slice(0, 10).forEach(meme => {
            const thumbUrl = `https://drive.google.com/thumbnail?id=${meme.id}&sz=w1000`;
            const resultElement = $(`
          <div class="search-result">
            <img src="${thumbUrl}" alt="${meme.name}">
            <div class="metadata"><p>${meme.name}</p></div>
          </div>
        `);
            $("#search-results").append(resultElement);
        });
    });

    fetchMemes();
});
