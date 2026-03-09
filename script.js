const API = "https://file-widget-project-production.up.railway.app/api/files";
let allFiles = [];

function showStatus(message, type = "success") {
  const status = document.getElementById("statusMessage");
  status.textContent = message;
  status.className = `status ${type}`;
  status.style.display = "block";
}

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateString) {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleString();
}

async function uploadFile() {
  try {
    const input = document.getElementById("fileInput");

    if (!input.files.length) {
      showStatus("Please select a file first.", "error");
      return;
    }

    const formData = new FormData();
    formData.append("file", input.files[0]);
    formData.append("uniqueFileKey", Date.now().toString());

    const res = await fetch(`${API}/upload`, {
      method: "POST",
      body: formData
    });

    const data = await res.json();

    if (!res.ok) {
      showStatus(data.message || "Upload failed.", "error");
      return;
    }

    showStatus(data.message || "File uploaded successfully.", "success");

    input.value = "";   // clear file input
    loadFiles();        // refresh list
  } catch (error) {
    console.error(error);
    showStatus("Something went wrong while uploading.", "error");
  }
}

async function loadFiles() {
  try {
    const res = await fetch(API);
    const files = await res.json();
    allFiles = files;
    renderFiles(allFiles);
  } catch (error) {
    showStatus("Failed to load files.", "error");
  }
}

function renderFiles(files) {
  const table = document.getElementById("fileTable");
  const count = document.getElementById("fileCount");

  table.innerHTML = "";
  count.textContent = `${files.length} file${files.length !== 1 ? "s" : ""}`;

  if (!files.length) {
    table.innerHTML = `
      <tr>
        <td colspan="4" class="empty-state">No files found.</td>
      </tr>
    `;
    return;
  }

  files.forEach((file) => {
    const fileId = file.metadata?.uniqueFileKey || "-";
    const safeFileId = fileId.replace(/'/g, "\\'");

    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${fileId}</td>
      <td>${formatFileSize(file.length || 0)}</td>
      <td>${formatDate(file.uploadDate)}</td>
      <td>
        <div class="actions">
          <button class="btn-download" onclick="downloadFile('${file._id}')">Download</button>
          <button class="btn-delete" onclick="deleteFile('${file._id}', '${safeFileId}')">Delete</button>
        </div>
      </td>
    `;

    table.appendChild(row);
  });
}

function filterFiles() {
  const searchValue = document.getElementById("searchInput").value.trim().toLowerCase();

  const filtered = allFiles.filter((file) => {
    const fileId = (file.metadata?.uniqueFileKey || "").toLowerCase();
    return fileId.includes(searchValue);
  });

  renderFiles(filtered);
}

function downloadFile(id) {
  window.open(`${API}/${id}/download`, "_blank");
}

async function deleteFile(id, fileId) {
  const confirmed = confirm(`Delete "${fileId}"?`);
  if (!confirmed) return;

  try {
    const res = await fetch(`${API}/${id}`, {
      method: "DELETE"
    });

    const data = await res.json();

    if (!res.ok) {
      showStatus(data.message || "Delete failed.", "error");
      return;
    }

    showStatus(data.message || "File deleted successfully.", "success");
    loadFiles();
  } catch (error) {
    showStatus("Something went wrong while deleting.", "error");
  }
}

loadFiles();
