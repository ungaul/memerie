function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

var currentFolderId = '';
var currentFolderName = "Home";
var folderStack = [];
const BACKEND_URL = "https://memerie.onrender.com";

var currentSortColumn = "title";
var currentSortDirection = 1;

function getURLParam(name) {
    const params = new URLSearchParams(window.location.search);
    return params.get(name);
}
function updateURLParam(key, value) {
    let url = new URL(window.location.href);
    if (value === "") {
        url.searchParams.delete(key);
    } else {
        url.searchParams.set(key, value);
    }
    window.history.replaceState({}, '', url);
}

function updateLocation() {
    let breadcrumbs = [];
    breadcrumbs.push({ dotPath: "", name: "Home", id: "" });
    folderStack.forEach(item => {
        breadcrumbs.push(item);
    });
    if (currentFolderName !== "Home" || currentFolderId) {
        breadcrumbs.push({ dotPath: dotPathFromStackAndCurrent(), name: currentFolderName, id: currentFolderId });
    }
    let html = "";
    breadcrumbs.forEach((crumb, index) => {
        html += `<div class="location" data-dotpath="${crumb.dotPath}" data-folderid="${crumb.id}">${crumb.name}</div>`;
        if (index < breadcrumbs.length - 1) {
            html += ' <ion-icon name="chevron-forward-outline"></ion-icon> ';
        }
    });
    $("#location").html(html);
    $("#location .location").on("click", function () {
        let dotPath = $(this).data("dotpath");
        navigateDotPath(dotPath);
    });
}

function dotPathFromStackAndCurrent() {
    let segments = folderStack.map(item => item.name);
    if (currentFolderName !== "Home") {
        segments.push(currentFolderName);
    }
    return segments.join(".");
}

async function navigateDotPath(dotPath) {
    let result = await getFolderIdFromDotPath(dotPath);
    currentFolderId = result.id;
    currentFolderName = result.name || "Home";
    updateURLParam("folder", dotPath);
    await loadFolder(currentFolderId);
    updateLocation();
}

function dotPathToArray(dotPath) {
    if (!dotPath) return [];
    return dotPath.split(".");
}

async function getFolderIdFromDotPath(dotPath) {
    let segments = dotPathToArray(dotPath);
    let parentId = "";
    let parentName = "Home";
    folderStack = [];
    for (let i = 0; i < segments.length; i++) {
        let segment = segments[i].trim();
        if (!segment) break;
        let subfolder = await findSubfolderByName(parentId, segment);
        if (!subfolder) break;
        if (parentName !== "Home" || parentId) {
            folderStack.push({ id: parentId, name: parentName, dotPath: segments.slice(0, i).join(".") });
        }
        parentId = subfolder.id;
        parentName = subfolder.name;
    }
    return { id: parentId, name: parentName };
}

async function findSubfolderByName(parentId, folderName) {
    let listUrl = BACKEND_URL + "/list";
    if (parentId) {
        listUrl += "?folderId=" + parentId;
    }
    const response = await fetch(listUrl);
    const data = await response.json();
    if (data.status !== "success") return null;
    let children = data.files || [];
    return children.find(f => f.mimeType === "application/vnd.google-apps.folder" && f.name === folderName) || null;
}

function loadFolder(folderId) {
    return new Promise((resolve, reject) => {
        let container = $("#drive-rows");
        container.empty();

        let listUrl = BACKEND_URL + "/list";
        if (folderId) {
            listUrl += "?folderId=" + folderId;
        }

        $.getJSON(listUrl, (response) => {
            if (response.status !== "success") {
                console.error("API error:", response.message);
                reject(response.message);
                return;
            }

            let files = response.files;
            files.sort(function (a, b) {
                let isFolderA = (a.mimeType === "application/vnd.google-apps.folder");
                let isFolderB = (b.mimeType === "application/vnd.google-apps.folder");
                if (isFolderA && !isFolderB) return -1;
                if (!isFolderA && isFolderB) return 1;
                let valueA, valueB;
                switch (currentSortColumn) {
                    case "title":
                        valueA = a.name || "";
                        valueB = b.name || "";
                        break;
                    case "keywords":
                        valueA = (a.appProperties && a.appProperties.keywords) || "";
                        valueB = (b.appProperties && b.appProperties.keywords) || "";
                        break;
                    case "lastmodified":
                        valueA = a.modifiedTime || "";
                        valueB = b.modifiedTime || "";
                        break;
                    case "dimensions":
                        valueA = (a.appProperties && a.appProperties.dimensions) || "";
                        valueB = (b.appProperties && b.appProperties.dimensions) || "";
                        break;
                    case "path":
                        valueA = (a.appProperties && a.appProperties.path) || "";
                        valueB = (b.appProperties && b.appProperties.path) || "";
                        break;
                    case "filesize":
                        valueA = a.size ? parseInt(a.size, 10) : 0;
                        valueB = b.size ? parseInt(b.size, 10) : 0;
                        break;
                    default:
                        valueA = a.name || "";
                        valueB = b.name || "";
                }
                if (currentSortColumn === "lastmodified") {
                    return currentSortDirection * (new Date(valueA) - new Date(valueB));
                }
                if (currentSortColumn === "filesize") {
                    return currentSortDirection * (valueA - valueB);
                }
                return currentSortDirection * valueA.localeCompare(valueB);
            });

            if (folderStack.length > 0) {
                let backRow = $(`
                    <div class="drive-row back">
                      <div class="drive-col title"><ion-icon name="return-up-back-outline"></ion-icon></div>
                      <div class="drive-col keywords"></div>
                      <div class="drive-col lastmodified"></div>
                      <div class="drive-col dimensions"></div>
                      <div class="drive-col path"></div>
                      <div class="drive-col filesize"></div>
                    </div>
                `);
                backRow.on("click", async function () {
                    let last = folderStack.pop();
                    currentFolderId = last.id;
                    currentFolderName = last.name;
                    let newDotPath = dotPathFromStackAndCurrent();
                    updateURLParam("folder", newDotPath);
                    await loadFolder(currentFolderId);
                    updateLocation();
                });
                container.append(backRow);
            }

            files.forEach((file) => {
                let row = $('<div class="drive-row"></div>');
                let icon = (file.mimeType === "application/vnd.google-apps.folder")
                    ? '<ion-icon name="folder-outline"></ion-icon> '
                    : '<ion-icon name="document-outline"></ion-icon> ';
                let formattedDate = file.modifiedTime ? new Date(file.modifiedTime).toLocaleString(undefined, { hour12: false }) : '-';
                let formattedSize = file.size ? formatBytes(parseInt(file.size, 10)) : '-';
                let filePath = (file.appProperties && file.appProperties.path) || '-';
                let fileDimensions = (file.appProperties && file.appProperties.dimensions) || '-';
                row.append('<div class="drive-col title">' + icon + (file.name || '') + '</div>');
                row.append('<div class="drive-col keywords">' + ((file.appProperties && file.appProperties.keywords) || '-') + '</div>');
                row.append('<div class="drive-col lastmodified">' + formattedDate + '</div>');
                row.append('<div class="drive-col dimensions">' + fileDimensions + '</div>');
                row.append('<div class="drive-col path">' + filePath + '</div>');
                row.append('<div class="drive-col filesize">' + formattedSize + '</div>');

                if (file.mimeType === "application/vnd.google-apps.folder") {
                    row.addClass("folder");
                    row.on("click", async function () {
                        if (currentFolderName !== "Home" || currentFolderId) {
                            folderStack.push({ id: currentFolderId, name: currentFolderName, dotPath: dotPathFromStackAndCurrent() });
                        }
                        currentFolderId = file.id;
                        currentFolderName = file.name;
                        let newDotPath = dotPathFromStackAndCurrent();
                        updateURLParam("folder", newDotPath);
                        await loadFolder(currentFolderId);
                        updateLocation();
                    });
                } else {
                    row.click(() => {
                        let downloadUrl = `https://drive.google.com/uc?export=download&id=${file.id}`;
                        if (file.mimeType.startsWith("video")) {
                            window.location.href = downloadUrl;
                        } else {
                            $("#player").html(`<img src="https://drive.google.com/thumbnail?id=${file.id}&sz=w1000" alt="${file.name}" data-download="${downloadUrl}">`);
                            $("#player-container").addClass("active");
                        }
                    });
                }
                container.append(row);
            });

            updateLocation();

            let q = getURLParam("q");
            if (q) performSearch(q);

            resolve();
        }).fail((xhr, status, error) => {
            console.error("AJAX error:", error);
            reject(error);
        });
    });
}

function performSearch(query) {
    return new Promise((resolve, reject) => {
        query = query.toLowerCase().trim();
        if (!query) {
            loadFolder(currentFolderId).then(resolve).catch(reject);
            return;
        }

        let container = $("#drive-rows");
        container.empty();

        let searchUrl = `${BACKEND_URL}/search?q=${encodeURIComponent(query)}`;
        $.getJSON(searchUrl, function (response) {
            if (response.status === "success") {
                let files = response.files;
                container.empty();

                if (files.length === 0) {
                    container.append('<div class="drive-row no-results">No results found.</div>');
                    resolve();
                    return;
                }

                files.forEach(file => {
                    let row = $('<div class="drive-row"></div>');
                    let icon = file.mimeType === "application/vnd.google-apps.folder"
                        ? '<ion-icon name="folder-outline"></ion-icon> '
                        : '<ion-icon name="document-outline"></ion-icon> ';

                    let formattedDate = file.modifiedTime
                        ? new Date(file.modifiedTime).toLocaleString(undefined, { hour12: false })
                        : '-';
                    let formattedSize = file.size ? formatBytes(parseInt(file.size, 10)) : '-';
                    let filePath = (file.appProperties && file.appProperties.path) || '-';
                    let fileDimensions = (file.appProperties && file.appProperties.dimensions) || '-';

                    row.append('<div class="drive-col title">' + icon + (file.name || '') + '</div>');
                    row.append('<div class="drive-col keywords">' + ((file.appProperties && file.appProperties.keywords) || '-') + '</div>');
                    row.append('<div class="drive-col lastmodified">' + formattedDate + '</div>');
                    row.append('<div class="drive-col dimensions">' + fileDimensions + '</div>');
                    row.append('<div class="drive-col path">' + filePath + '</div>');
                    row.append('<div class="drive-col filesize">' + formattedSize + '</div>');

                    if (file.mimeType === "application/vnd.google-apps.folder") {
                        row.addClass("folder");
                        row.on("click", async function () {
                            await navigateDotPath(filePath.replace(/ > /g, "."));
                        });
                    } else {
                        row.on("click", function () {
                            let downloadUrl = `https://drive.google.com/uc?export=download&id=${file.id}`;
                            if (file.mimeType.startsWith("video")) {
                                window.location.href = downloadUrl;
                            } else {
                                $("#player").html(`<img src="https://drive.google.com/thumbnail?id=${file.id}&sz=w1000" alt="${file.name}" data-download="${downloadUrl}">`);
                                $("#player-container").addClass("active");
                            }
                        });
                    }

                    container.append(row);
                });

                updateLocation();
                resolve();
            } else {
                console.error("API error:", response.message);
                reject(response.message);
            }
        }).fail((xhr, status, error) => {
            console.error("AJAX error:", error);
            reject(error);
        });
    });
}

function checkUploadAllowed(file) {
    const maxSize = 20 * 1024 * 1024;
    if (file.size > maxSize) {
        $("#notification").html('<ion-icon name="close-outline"></ion-icon><p>File too large. Limit is 20 MB.</p>').addClass("enabled");
        setTimeout(() => { $("#notification").removeClass("enabled"); }, 4000);
        return false;
    }
    let uploads = JSON.parse(localStorage.getItem("uploadTimestamps") || "[]");
    const now = Date.now();
    const oneHourAgo = now - 3600000;
    uploads = uploads.filter(ts => ts > oneHourAgo);
    if (uploads.length >= 10) {
        $("#notification").html('<ion-icon name="close-outline"></ion-icon><p>Upload limit reached. Please wait before uploading more files.</p>').addClass("enabled");
        setTimeout(() => { $("#notification").removeClass("enabled"); }, 4000);
        return false;
    }
    uploads.push(now);
    localStorage.setItem("uploadTimestamps", JSON.stringify(uploads));
    return true;
}

$(document).ready(async function () {
    let dotPath = getURLParam("folder") || "";
    let result = await getFolderIdFromDotPath(dotPath);
    currentFolderId = result.id;
    currentFolderName = result.name || "Home";

    let urlSort = getURLParam("sort");
    let urlDirection = getURLParam("direction");
    if (urlSort) {
        currentSortColumn = urlSort;
    }
    if (urlDirection) {
        currentSortDirection = (urlDirection.toLowerCase() === "asc" ? 1 : -1);
    }

    let urlQuery = getURLParam("q");
    $("#searchbar").val(urlQuery || "");
    if (urlQuery) await performSearch(urlQuery);

    await loadFolder(currentFolderId);

    $(".drive-header .drive-col").on("click", async function () {
        let sortKey = $(this).attr("class").split(" ")[1];
        if (currentSortColumn === sortKey) {
            currentSortDirection = -currentSortDirection;
        } else {
            currentSortColumn = sortKey;
            currentSortDirection = 1;
        }
        let icon = $(this).find(".sortingOrder");
        if (currentSortDirection === -1) {
            icon.addClass("reversed");
        } else {
            icon.removeClass("reversed");
        }
        updateURLParam("sort", currentSortColumn);
        updateURLParam("direction", currentSortDirection === 1 ? "asc" : "desc");
        await loadFolder(currentFolderId);
    });

    $("#searchbar").on("keydown", async function (e) {
        if (e.key === "Enter") {
            e.preventDefault();
            let query = $(this).val();
            updateURLParam("q", query);
            await performSearch(query);
        }
    });
    $("#searchbar").on("blur", async function () {
        let query = $(this).val().trim();
        if (query !== "") {
            updateURLParam("q", query);
            await performSearch(query);
        } else {
            updateURLParam("q", "");
            await loadFolder(currentFolderId);
        }
    });
    $("#searchbar").on("keyup", async function (e) {
        let query = $(this).val().trim();
        if (query === "") {
            await loadFolder(currentFolderId);
        }
    });

    $("#player-container").on("click", function (e) {
        if (e.target === this) {
            $("#player-container").removeClass("active");
        }
    });

    $(document).on("click", "#player *", function (e) {
        e.stopPropagation();
        let downloadUrl = $(this).attr("data-download");
        let a = document.createElement("a");
        a.href = downloadUrl;
        a.download = $(this).attr("alt");
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    });

    $("#upload-button").on("click", function () {
        let fileInput = $("<input>", { type: "file", accept: "image/*,video/*,audio/*" });
        fileInput.on("change", function (e) {
            let file = e.target.files[0];
            if (!file) return;
            if (!checkUploadAllowed(file)) return;
            let fullName = file.name;
            let extension = (fullName.match(/\.[^/.]+$/) || [""])[0];
            let pendingRow = $(`
          <div class="drive-row pending">
            <div class="drive-col title">
              <ion-icon name="document-outline"></ion-icon>
              <input type="text" class="pending-input" value="${fullName}" data-extension="${extension}" autofocus>
              <ion-icon name="checkmark-outline" class="pending-check"></ion-icon>
            </div>
            <div class="drive-col dimensions">-</div>
            <div class="drive-col keywords">-</div>
            <div class="drive-col lastmodified">-</div>
            <div class="drive-col path">${(folderStack.length > 0 ? folderStack.map(item => item.name).join(" > ") : "Home")}</div>
            <div class="drive-col filesize">${formatBytes(file.size)}</div>
          </div>
        `);
            pendingRow.data("file", file);
            $("#drive-rows").append(pendingRow);
            let inputField = pendingRow.find(".pending-input");
            inputField.focus();
            let val = inputField.val();
            let pos = val.lastIndexOf(extension);
            if (pos < 0) pos = val.length;
            inputField[0].setSelectionRange(0, pos);
        });
        fileInput.trigger("click");
    });

    $(document).on("keydown", ".pending-input", function (e) {
        if (e.key === "Enter") {
            $(this).closest(".pending").find(".pending-check").click();
        } else if (e.key === "Escape") {
            $(this).closest(".pending").remove();
        }
    });

    $(document).on("click", ".pending-check", function (e) {
        e.stopPropagation();
        let pendingRow = $(this).closest(".pending");
        let file = pendingRow.data("file");
        if (!file) return;
        let inputField = pendingRow.find(".pending-input");
        let fullInput = inputField.val().trim();
        let extension = inputField.attr("data-extension") || "";
        if (!fullInput.endsWith(extension)) {
            fullInput += extension;
        }
        let finalName = fullInput;
        let reader = new FileReader();
        reader.onload = function (evt) {
            let base64File = evt.target.result.split(",")[1];
            let payload = {
                note: finalName,
                fileName: finalName,
                fileContent: base64File,
                mimeType: file.type,
                folderId: currentFolderId,
                path: (folderStack.length > 0 ? folderStack.map(item => item.name).join(" > ") : "Home"),
                dimensions: "-"
            };
            $.ajax({
                url: BACKEND_URL + '/upload',
                type: 'POST',
                contentType: 'application/json',
                data: JSON.stringify(payload),
                success: function (response) {
                    if (response.status === 'success') {
                        let uploadedFile = response.data;
                        let icon = '<ion-icon name="document-outline"></ion-icon> ';
                        let formattedDate = uploadedFile.modifiedTime
                            ? new Date(uploadedFile.modifiedTime).toLocaleString(undefined, { hour12: false })
                            : '-';
                        let formattedSize = uploadedFile.size ? formatBytes(parseInt(uploadedFile.size, 10)) : '-';
                        let newRow = $('<div class="drive-row"></div>');
                        newRow.append('<div class="drive-col title">' + icon + (uploadedFile.name || '') + '</div>');
                        newRow.append('<div class="drive-col lastmodified">' + formattedDate + '</div>');
                        newRow.append('<div class="drive-col keywords">' + ((uploadedFile.appProperties && uploadedFile.appProperties.keywords) || '-') + '</div>');
                        newRow.append('<div class="drive-col filesize">' + formattedSize + '</div>');
                        newRow.append('<div class="drive-col path">' + ((uploadedFile.appProperties && uploadedFile.appProperties.path) || '-') + '</div>');
                        newRow.append('<div class="drive-col dimensions">' + ((uploadedFile.appProperties && uploadedFile.appProperties.dimensions) || '-') + '</div>');

                        let container = $('#drive-rows');
                        let inserted = false;
                        let fileRows = container.find('.drive-row').filter(function () {
                            return !$(this).hasClass('pending') && !$(this).hasClass('back') && !$(this).hasClass('folder');
                        });

                        if (fileRows.length > 0) {
                            fileRows.each(function () {
                                let existingName = $(this).find('.drive-col.title').text().trim();
                                if ((uploadedFile.name || '').localeCompare(existingName) < 0) {
                                    $(this).before(newRow);
                                    inserted = true;
                                    return false;
                                }
                            });
                            if (!inserted) {
                                container.append(newRow);
                            }
                        } else {
                            let folderRows = container.find('.drive-row.folder');
                            if (folderRows.length > 0) {
                                folderRows.last().after(newRow);
                            } else {
                                container.append(newRow);
                            }
                        }

                        pendingRow.remove();
                        $("#notification").html('<ion-icon name="checkmark-outline"></ion-icon><p>Upload successful.</p>').addClass("active");
                        loadFolder(currentFolderId);
                        setTimeout(() => {
                            $("#notification").removeClass("active");
                        }, 2000);
                    }
                },
                error: function (xhr, status, error) {
                    let msg = "Upload failed.";
                    try {
                        let resp = JSON.parse(xhr.responseText);
                        if (resp.message) msg = resp.message;
                    } catch (e) { }
                    $("#notification").html('<ion-icon name="close-outline"></ion-icon><p>' + msg + '</p>').addClass("enabled");
                    setTimeout(() => { $("#notification").removeClass("enabled"); }, 4000);
                }
            });
        };
        reader.readAsDataURL(file);
    });

    $("#search").on("keydown", async function (e) {
        if (e.key === "Enter") {
            e.preventDefault();
            await performSearch($(this).val());
        }
    });
    $("#search").on("blur", async function () {
        let query = $(this).val().trim();
        if (query !== "") {
            await performSearch(query);
        } else {
            await loadFolder(currentFolderId);
        }
    });
    $("#search").on("keyup", async function (e) {
        let query = $(this).val().trim();
        if (query === "") {
            await loadFolder(currentFolderId);
        }
    });
    $("#reload").on("click", async function (e) {
        await loadFolder(currentFolderId);
    });
});
