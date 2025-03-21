var currentFolderId = 'root';
var folderStack = [];
const BACKEND_URL = "https://memerie.vercel.app";

function loadFolder(folderId) {
  const url = BACKEND_URL + '/api/list?folderId=' + folderId;
  $.getJSON(url, function(response) {
    if (response.status === 'success') {
      var files = response.files;
      files.sort(function(a, b) {
        var isFolderA = (a.mimeType === "application/vnd.google-apps.folder");
        var isFolderB = (b.mimeType === "application/vnd.google-apps.folder");
        if (isFolderA && !isFolderB) return -1;
        if (!isFolderA && isFolderB) return 1;
        return (a.name || '').localeCompare(b.name || '');
      });
      var container = $('#drive-rows');
      container.empty();
      if (folderStack.length > 0) {
        var backRow = $('<div class="drive-row back"><div class="drive-col title">../</div><div class="drive-col filesize"></div><div class="drive-col lastmodified"></div><div class="drive-col keywords"></div></div>');
        backRow.on('click', function() {
          currentFolderId = folderStack.pop();
          loadFolder(currentFolderId);
        });
        container.append(backRow);
      }
      files.forEach(function(file) {
        var row = $('<div class="drive-row"></div>');
        row.append('<div class="drive-col title">' + (file.name || '') + '</div>');
        row.append('<div class="drive-col filesize">' + (file.size || '') + '</div>');
        row.append('<div class="drive-col lastmodified">' + (file.modifiedTime || '') + '</div>');
        row.append('<div class="drive-col keywords">' + ((file.appProperties && file.appProperties.keywords) || '') + '</div>');
        if (file.mimeType === "application/vnd.google-apps.folder") {
          row.addClass('folder');
          row.on('click', function() {
            folderStack.push(currentFolderId);
            currentFolderId = file.id;
            loadFolder(currentFolderId);
          });
        }
        container.append(row);
      });
    } else {
      console.error("API error: " + response.message);
    }
  });
}

$(document).ready(function() {
  loadFolder(currentFolderId);
});
