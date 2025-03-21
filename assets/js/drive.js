function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

var currentFolderId = '';
var folderStack = [];
const BACKEND_URL = "https://memerie.vercel.app";

function loadFolder(folderId) {
    const url = BACKEND_URL + '/api/list' + (folderId ? '?folderId=' + folderId : '');
    $.getJSON(url, function (response) {
        if (response.status === 'success') {
            var files = response.files;
            files.sort(function (a, b) {
                var isFolderA = (a.mimeType === "application/vnd.google-apps.folder");
                var isFolderB = (b.mimeType === "application/vnd.google-apps.folder");
                if (isFolderA && !isFolderB) return -1;
                if (!isFolderA && isFolderB) return 1;
                return (a.name || '').localeCompare(b.name || '');
            });
            var container = $('#drive-rows');
            container.empty();
            if (folderStack.length > 0) {
                var backRow = $(`
            <div class="drive-row back">
              <div class="drive-col title"><ion-icon name="return-up-back-outline"></ion-icon></div>
              <div class="drive-col keywords"></div>
              <div class="drive-col lastmodified"></div>
              <div class="drive-col dimensions"></div>
              <div class="drive-col path"></div>
              <div class="drive-col filesize"></div>
            </div>
          `);
                backRow.on('click', function () {
                    currentFolderId = folderStack.pop();
                    loadFolder(currentFolderId);
                });
                container.append(backRow);
            }
            files.forEach(function (file) {
                var row = $('<div class="drive-row"></div>');
                var icon = (file.mimeType === "application/vnd.google-apps.folder")
                    ? '<ion-icon name="folder-outline"></ion-icon> '
                    : '<ion-icon name="document-outline"></ion-icon> ';
                var formattedDate = file.modifiedTime ? new Date(file.modifiedTime).toLocaleString(undefined, { hour12: false }) : '-';
                var formattedSize = file.size ? formatBytes(parseInt(file.size, 10)) : '-';
                var filePath = (file.appProperties && file.appProperties.path) || '-';
                var fileDimensions = (file.appProperties && file.appProperties.dimensions) || '-';
                row.append('<div class="drive-col title">' + icon + (file.name || '') + '</div>');
                row.append('<div class="drive-col keywords">' + ((file.appProperties && file.appProperties.keywords) || '-') + '</div>');
                row.append('<div class="drive-col lastmodified">' + formattedDate + '</div>');
                row.append('<div class="drive-col dimensions">' + fileDimensions + '</div>');
                row.append('<div class="drive-col path">' + filePath + '</div>');
                row.append('<div class="drive-col filesize">' + formattedSize + '</div>');
                if (file.mimeType === "application/vnd.google-apps.folder") {
                    row.addClass('folder');
                    row.on('click', function () {
                        folderStack.push(currentFolderId);
                        currentFolderId = file.id;
                        loadFolder(currentFolderId);
                    });
                } else {
                    row.on('click', function () {
                        var imageUrl = "https://drive.google.com/thumbnail?id=" + file.id + "&sz=w1000";
                        var downloadUrl = "https://drive.google.com/uc?export=download&id=" + file.id;
                        $("#player").html('<img src="' + imageUrl + '" alt="' + file.name + '" data-download="' + downloadUrl + '">');
                        $("#player-container").addClass("active");
                    });
                }
                container.append(row);
            });
        } else {
            console.error("API error: " + response.message);
        }
    });
}

function performSearch(query) {
    query = query.toLowerCase().trim();
    if (!query) {
        loadFolder(currentFolderId);
        return;
    }
    $('#drive-rows .drive-row').each(function () {
        if ($(this).hasClass('back') || $(this).hasClass('pending')) return;
        var rowText = $(this).text().toLowerCase();
        if (rowText.indexOf(query) !== -1) {
            $(this).show();
        } else {
            $(this).hide();
        }
    });
}

$(document).ready(function () {
    loadFolder(currentFolderId);

    $("#player-container").on("click", function (e) {
        if (e.target === this) {
            $("#player-container").removeClass("active");
        }
    });

    $(document).on("click", "#player img", function (e) {
        e.stopPropagation();
        var downloadUrl = $(this).attr("data-download");
        var a = document.createElement("a");
        a.href = downloadUrl;
        a.download = $(this).attr("alt");
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    });

    var selectedFile = null;

    $("#upload-button").on("click", function () {
        var fileInput = $("<input>", { type: "file", accept: "image/*,video/*,audio/*" });
        fileInput.on("change", function (e) {
            var file = e.target.files[0];
            if (!file) return;
            var fullName = file.name;
            var baseName = fullName.replace(/\.[^/.]+$/, "");
            var extension = (fullName.match(/\.[^/.]+$/) || [""])[0];
            var pendingRow = $(`
          <div class="drive-row pending">
            <div class="drive-col title">
              <ion-icon name="document-outline"></ion-icon>
              <input type="text" class="pending-input" value="` + fullName + `" data-extension="` + extension + `" autofocus>
              <ion-icon name="checkmark-outline" class="pending-check"></ion-icon>
            </div>
            <div class="drive-col lastmodified">-</div>
            <div class="drive-col keywords">-</div>
            <div class="drive-col filesize">` + formatBytes(file.size) + `</div>
            <div class="drive-col path">` + (folderStack.length > 0 ? folderStack.map(item => item.name).join(" > ") : "Home") + `</div>
            <div class="drive-col dimensions">-</div>
          </div>
        `);
            pendingRow.data("file", file);
            $("#drive-rows").append(pendingRow);
            var inputField = pendingRow.find(".pending-input");
            inputField.focus();
            var val = inputField.val();
            var ext = inputField.attr("data-extension");
            var pos = val.lastIndexOf(ext);
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
        var pendingRow = $(this).closest(".pending");
        var file = pendingRow.data("file");
        if (!file) return;
        var inputField = pendingRow.find(".pending-input");
        var fullInput = inputField.val().trim();
        var extension = inputField.attr("data-extension") || "";
        if (!fullInput.endsWith(extension)) {
            fullInput += extension;
        }
        var finalName = fullInput;
        var reader = new FileReader();
        reader.onload = function (e) {
            var base64File = e.target.result.split(",")[1];
            var payload = {
                note: finalName,
                fileName: finalName,
                fileContent: base64File,
                mimeType: file.type,
                folderId: currentFolderId,
                path: (folderStack.length > 0 ? folderStack.map(item => item.name).join(" > ") : "Home"),
                dimensions: "-"
            };
            $.ajax({
                url: BACKEND_URL + '/api/upload',
                type: 'POST',
                contentType: 'application/json',
                data: JSON.stringify(payload),
                success: function (response) {
                    if (response.status === 'success') {
                        var uploadedFile = response.data;
                        var icon = '<ion-icon name="document-outline"></ion-icon> ';
                        var formattedDate = uploadedFile.modifiedTime ? new Date(uploadedFile.modifiedTime).toLocaleString(undefined, { hour12: false }) : '-';
                        var formattedSize = uploadedFile.size ? formatBytes(parseInt(uploadedFile.size, 10)) : '-';
                        var newRow = $('<div class="drive-row"></div>');
                        newRow.append('<div class="drive-col title">' + icon + (uploadedFile.name || '') + '</div>');
                        newRow.append('<div class="drive-col lastmodified">' + formattedDate + '</div>');
                        newRow.append('<div class="drive-col keywords">' + ((uploadedFile.appProperties && uploadedFile.appProperties.keywords) || '-') + '</div>');
                        newRow.append('<div class="drive-col filesize">' + formattedSize + '</div>');
                        newRow.append('<div class="drive-col path">' + ((uploadedFile.appProperties && uploadedFile.appProperties.path) || '-') + '</div>');
                        newRow.append('<div class="drive-col dimensions">' + ((uploadedFile.appProperties && uploadedFile.appProperties.dimensions) || '-') + '</div>');
                        newRow.on('click', function () {
                            var imageUrl = "https://drive.google.com/thumbnail?id=" + uploadedFile.id + "&sz=w1000";
                            var downloadUrl = "https://drive.google.com/uc?export=download&id=" + uploadedFile.id;
                            $("#player").html('<img src="' + imageUrl + '" alt="' + uploadedFile.name + '" data-download="' + downloadUrl + '">');
                            $("#player-container").addClass("active");
                        });
                        var container = $('#drive-rows');
                        var inserted = false;
                        var fileRows = container.find('.drive-row').filter(function () {
                            return !$(this).hasClass('pending') && !$(this).hasClass('back') && !$(this).hasClass('folder');
                        });
                        if (fileRows.length > 0) {
                            fileRows.each(function () {
                                var existingName = $(this).find('.drive-col.title').text().trim();
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
                            var folderRows = container.find('.drive-row.folder');
                            if (folderRows.length > 0) {
                                folderRows.last().after(newRow);
                            } else {
                                container.append(newRow);
                            }
                        }
                        pendingRow.remove();
                        $("#notification").addClass("active");
                        setTimeout(() => {
                            $("#notification").removeClass("active");
                        }, 2000);
                    }
                },
                error: function (xhr, status, error) { }
            });
        };
        reader.readAsDataURL(file);
    });

    $("#searchbar").on("keyup", function (e) {
        var query = $(this).val().toLowerCase().trim();
        if (query === "") {
            loadFolder(currentFolderId);
            return;
        }
        $("#drive-rows .drive-row").each(function () {
            if ($(this).hasClass('back') || $(this).hasClass('pending')) {
                $(this).show();
                return;
            }
            var rowText = $(this).text().toLowerCase();
            if (rowText.indexOf(query) !== -1) {
                $(this).show();
            } else {
                $(this).hide();
            }
        });
    });
});
