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
              <div class="drive-col filesize"></div>
              <div class="drive-col lastmodified"></div>
              <div class="drive-col keywords"></div>
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
                var formattedDate = file.modifiedTime ? new Date(file.modifiedTime).toLocaleString() : '-';
                var formattedSize = file.size ? formatBytes(parseInt(file.size, 10)) : '-';
                row.append('<div class="drive-col title">' + icon + (file.name || '') + '</div>');
                row.append('<div class="drive-col filesize">' + formattedSize + '</div>');
                row.append('<div class="drive-col lastmodified">' + formattedDate + '</div>');
                row.append('<div class="drive-col keywords">' + ((file.appProperties && file.appProperties.keywords) || '-') + '</div>');
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
        let fileInput = $("<input>", { type: "file", accept: "image/*,video/*,audio/*" });
        fileInput.on("change", function (e) {
            var file = e.target.files[0];
            if (!file) return;
            var fileNameWithoutExtension = file.name.replace(/\.[^/.]+$/, "");
            $("#upload-title").val(fileNameWithoutExtension);
            selectedFile = file;
            $("#upload-container").show();
        });
        fileInput.trigger("click");
    });

    $("#upload-form").on("submit", function (e) {
        e.preventDefault();
        var title = $("#upload-title").val().trim();
        if (!title || !selectedFile) return;
        if (selectedFile.size > 5 * 1024 * 1024) return;
        var reader = new FileReader();
        reader.onload = function (e) {
            var base64File = e.target.result.split(",")[1];
            var payload = {
                note: title,
                fileName: title,
                fileContent: base64File,
                mimeType: selectedFile.type,
                folderId: currentFolderId
            };
            $.ajax({
                url: BACKEND_URL + '/api/upload',
                type: 'POST',
                contentType: 'application/json',
                data: JSON.stringify(payload),
                success: function (response) {
                    if (response.status === 'success') {
                        $("#upload-form")[0].reset();
                        selectedFile = null;
                        $("#upload-container").hide();
                        loadFolder(currentFolderId);
                    }
                },
                error: function (xhr, status, error) { }
            });
        };
        reader.readAsDataURL(selectedFile);
    });
});