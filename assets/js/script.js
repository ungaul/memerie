async function loadMemes() {
    try {
        const response = await fetch("memes/index.json");
        const memes = await response.json();
        displayMemes(memes);
    } catch (error) {
        console.error("Erreur de chargement des mèmes :", error);
    }
}

function displayMemes(memes) {
    const container = document.getElementById("meme-container");
    container.innerHTML = "";

    memes.forEach(meme => {
        const img = document.createElement("img");
        img.src = `memes/${meme.file}`;
        img.alt = meme.tags.join(", ");
        container.appendChild(img);
    });
}

document.getElementById("searchBar").addEventListener("input", async function (event) {
    const query = event.target.value.toLowerCase();
    const response = await fetch("memes/index.json");
    const memes = await response.json();

    const filteredMemes = memes.filter(meme =>
        meme.tags.some(tag => tag.includes(query))
    );

    displayMemes(filteredMemes);
});

async function uploadMeme() {
    const fileInput = document.getElementById("uploadFile");
    const file = fileInput.files[0];

    if (!file) {
        alert("Sélectionne un fichier d'abord !");
        return;
    }

    // Ajout du fichier localement (en dev uniquement)
    const fileName = file.name;
    const reader = new FileReader();

    reader.onload = async function (event) {
        // Simuler un enregistrement en local
        const response = await fetch("memes/index.json");
        const memes = await response.json();

        const newMeme = {
            file: fileName,
            tags: []  // Ajoute manuellement les tags si besoin
        };

        memes.push(newMeme);

        // Mettre à jour le fichier JSON (simulé)
        console.log("Nouvel index.json :", JSON.stringify(memes, null, 2));
        alert("Mème ajouté ! (Ne fonctionne qu'en local, il faudra push à GitHub manuellement)");
    };

    reader.readAsDataURL(file);
}

window.onload = loadMemes;
