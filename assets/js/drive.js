// Global variables for folder navigation
var currentFolderId = 'root';
var folderStack = [];

// Constant for your backend endpoint
const BACKEND_URL = "https://memerie.vercel.app";

// Function to load the content of a folder via the API
function loadFolder(folderId) {
  const url = BACKEND_URL + '/api/list?folderId=' + folderId;
  $.getJSON(url, function(response) {
    if (response.status === 'success') {
      var files = response.files;
      // Sort: folders first, then files, sorted by title
      files.sort(function(a, b) {
        var isFolderA = (a.mimeType === "application/vnd.google-apps.folder");
        var isFolderB = (b.mimeType === "application/vnd.google-apps.folder");
        if (isFolderA && !isFolderB) return -1;
        if (!isFolderA && isFolderB) return 1;
        return a.title.localeCompare(b.title);
      });

      var container = $('#drive-rows');
      container.empty();

      // Add a back ("../") row if we are not in the root folder
      if (folderStack.length > 0) {
        var backRow = $('<div class="drive-row back"><div class="drive-col title">../</div><div class="drive-col filesize"></div><div class="drive-col lastmodified"></div><div class="drive-col keywords"></div></div>');
        backRow.on('click', function() {
          currentFolderId = folderStack.pop();
          loadFolder(currentFolderId);
        });
        container.append(backRow);
      }

      // Create a row for each file or folder
      files.forEach(function(file) {
        var row = $('<div class="drive-row"></div>');
        var titleDiv = $('<div class="drive-col title"></div>').text(file.title);
        var filesizeDiv = $('<div class="drive-col filesize"></div>').text(file.filesize ? file.filesize : '-');
        var lastModifiedDiv = $('<div class="drive-col lastmodified"></div>').text(file.lastmodified ? file.lastmodified : '-');
        var keywordsDiv = $('<div class="drive-col keywords"></div>').text(file.keywords ? file.keywords : '-');

        row.append(titleDiv, filesizeDiv, lastModifiedDiv, keywordsDiv);

        // If it's a folder, make the row clickable to navigate inside
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

// Initialize folder listing when document is ready
$(document).ready(function() {
  loadFolder(currentFolderId);
});
