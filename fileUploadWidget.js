class SACFileManager extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });

    this._apiBaseUrl = "https://file-widget-project-production.up.railway.app/api/files";
    this._uniqueFileKey = "";
    this._title = "File Manager";
    this._showSearch = true;
    this._maxHeight = 320;
    this._allFiles = [];

    this.render();
  }

  static get observedAttributes() {
    return ["title", "apibaseurl", "uniquefilekey", "showsearch", "maxheight"];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;

    if (name === "title") this._title = newValue || "File Manager";
    if (name === "apibaseurl") this._apiBaseUrl = newValue || this._apiBaseUrl;
    if (name === "uniquefilekey") this._uniqueFileKey = newValue || "";
    if (name === "showsearch") this._showSearch = newValue !== "false";
    if (name === "maxheight") this._maxHeight = parseInt(newValue || "320", 10);

    this.render();
    this.loadFiles();
  }

  connectedCallback() {
    this.loadFiles();
  }

  set uniqueFileKey(value) {
    this._uniqueFileKey = value || "";
  }

  get uniqueFileKey() {
    return this._uniqueFileKey;
  }

  setUniqueFileKey(key) {
    this._uniqueFileKey = key || "";
  }

  getUniqueFileKey() {
    return this._uniqueFileKey;
  }

  setApiBaseUrl(url) {
    this._apiBaseUrl = url || this._apiBaseUrl;
    this.loadFiles();
  }

  getApiBaseUrl() {
    return this._apiBaseUrl;
  }

  async uploadFile() {
    try {
      const fileInput = this.shadowRoot.getElementById("fileInput");
      const status = this.shadowRoot.getElementById("statusMessage");

      if (!this._uniqueFileKey || !this._uniqueFileKey.trim()) {
        this.showStatus("No SAC context ID was provided.", "error");
        return;
      }

      if (!fileInput.files.length) {
        this.showStatus("Please select a file first.", "error");
        return;
      }

      const formData = new FormData();
      formData.append("file", fileInput.files[0]);
      formData.append("uniqueFileKey", this._uniqueFileKey);

      const res = await fetch(`${this._apiBaseUrl}/upload`, {
        method: "POST",
        body: formData
      });

      const data = await res.json();

      if (!res.ok) {
        this.showStatus(data.message || "Upload failed.", "error");
        this.dispatchEvent(new CustomEvent("onUploadError", { detail: data }));
        return;
      }

      fileInput.value = "";
      this.showStatus(data.message || "File uploaded successfully.", "success");
      this.dispatchEvent(new CustomEvent("onUploadSuccess", { detail: data }));
      this.loadFiles();
    } catch (error) {
      this.showStatus("Something went wrong while uploading.", "error");
      this.dispatchEvent(new CustomEvent("onUploadError", { detail: error }));
    }
  }

  async loadFiles() {
    try {
      const res = await fetch(this._apiBaseUrl);
      const files = await res.json();

      this._allFiles = Array.isArray(files) ? files : [];
      this.renderFiles(this._allFiles);
      this.dispatchEvent(new CustomEvent("onFilesLoaded", { detail: this._allFiles }));
    } catch (error) {
      this.showStatus("Failed to load files.", "error");
    }
  }

  renderFiles(files) {
    const table = this.shadowRoot.getElementById("fileTable");
    const count = this.shadowRoot.getElementById("fileCount");
    if (!table || !count) return;

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
      const row = document.createElement("tr");
      const fileId = file.metadata?.uniqueFileKey || "-";

      row.innerHTML = `
        <td>${this.escapeHtml(fileId)}</td>
        <td>${this.formatFileSize(file.length || 0)}</td>
        <td>${this.formatDate(file.uploadDate)}</td>
        <td>
          <div class="actions">
            <button class="btn-download" data-id="${file._id}">Download</button>
            <button class="btn-delete" data-id="${file._id}" data-fileid="${this.escapeAttribute(fileId)}">Delete</button>
          </div>
        </td>
      `;

      table.appendChild(row);
    });

    table.querySelectorAll(".btn-download").forEach((btn) => {
      btn.addEventListener("click", () => this.downloadFile(btn.dataset.id));
    });

    table.querySelectorAll(".btn-delete").forEach((btn) => {
      btn.addEventListener("click", () => this.deleteFile(btn.dataset.id, btn.dataset.fileid));
    });
  }

  filterFiles() {
    const input = this.shadowRoot.getElementById("searchInput");
    const value = (input?.value || "").trim().toLowerCase();

    const filtered = this._allFiles.filter((file) => {
      const fileId = (file.metadata?.uniqueFileKey || "").toLowerCase();
      return fileId.includes(value);
    });

    this.renderFiles(filtered);
  }

  downloadFile(id) {
    window.open(`${this._apiBaseUrl}/${id}/download`, "_blank");
  }

  async deleteFile(id, fileId) {
    const confirmed = window.confirm(`Delete "${fileId}"?`);
    if (!confirmed) return;

    try {
      const res = await fetch(`${this._apiBaseUrl}/${id}`, {
        method: "DELETE"
      });

      const data = await res.json();

      if (!res.ok) {
        this.showStatus(data.message || "Delete failed.", "error");
        this.dispatchEvent(new CustomEvent("onDeleteError", { detail: data }));
        return;
      }

      this.showStatus(data.message || "File deleted successfully.", "success");
      this.dispatchEvent(new CustomEvent("onDeleteSuccess", { detail: data }));
      this.loadFiles();
    } catch (error) {
      this.showStatus("Something went wrong while deleting.", "error");
      this.dispatchEvent(new CustomEvent("onDeleteError", { detail: error }));
    }
  }

  showStatus(message, type = "success") {
    const status = this.shadowRoot.getElementById("statusMessage");
    if (!status) return;

    status.textContent = message;
    status.className = `status ${type}`;
    status.style.display = "block";
  }

  formatFileSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  formatDate(dateString) {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleString();
  }

  escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  escapeAttribute(value) {
    return String(value).replaceAll('"', "&quot;");
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        * {
          box-sizing: border-box;
          font-family: Arial, sans-serif;
        }

        body {
          margin: 0;
        }

        .container {
          width: 100%;
          color: #1f2937;
        }

        .card {
          background: #ffffff;
          border-radius: 16px;
          padding: 20px;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
          margin-bottom: 20px;
        }

        h1 {
          margin: 0 0 8px;
          font-size: 24px;
        }

        h2 {
          margin: 0;
          font-size: 20px;
        }

        p.subtitle {
          margin: 0 0 20px;
          color: #6b7280;
        }

        .upload-row {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          align-items: center;
        }

        input[type="file"] {
          padding: 10px;
          border: 1px solid #d1d5db;
          border-radius: 10px;
          background: #fff;
          min-width: 220px;
          flex: 1;
        }

        .search-row {
          display: ${this._showSearch ? "flex" : "none"};
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
          margin-top: 14px;
          margin-bottom: 12px;
        }

        .search-row input {
          min-width: 220px;
          flex: 1;
          padding: 10px;
          border: 1px solid #d1d5db;
          border-radius: 10px;
          background: #fff;
        }

        button {
          border: none;
          border-radius: 10px;
          padding: 10px 16px;
          cursor: pointer;
          font-weight: 600;
        }

        .btn-upload {
          background: #2563eb;
          color: white;
        }

        .btn-download {
          background: #10b981;
          color: white;
        }

        .btn-delete {
          background: #ef4444;
          color: white;
        }

        .status {
          margin-top: 14px;
          padding: 12px 14px;
          border-radius: 10px;
          font-size: 14px;
          display: none;
        }

        .status.success {
          background: #ecfdf5;
          color: #065f46;
          border: 1px solid #a7f3d0;
        }

        .status.error {
          background: #fef2f2;
          color: #991b1b;
          border: 1px solid #fecaca;
        }

        .table-scroll {
          max-height: ${this._maxHeight}px;
          overflow-y: auto;
          overflow-x: auto;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          min-width: 650px;
        }

        th, td {
          text-align: left;
          padding: 14px 12px;
          border-bottom: 1px solid #e5e7eb;
          vertical-align: middle;
        }

        th {
          background: #f9fafb;
          color: #374151;
          font-size: 14px;
          position: sticky;
          top: 0;
          z-index: 1;
        }

        td {
          font-size: 14px;
        }

        .actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .empty-state {
          text-align: center;
          padding: 28px 12px;
          color: #6b7280;
        }

        .badge {
          display: inline-block;
          padding: 4px 10px;
          border-radius: 999px;
          background: #eef2ff;
          color: #4338ca;
          font-size: 12px;
          font-weight: 600;
          white-space: nowrap;
        }

        .top-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
          margin-bottom: 8px;
        }
      </style>

      <div class="container">
        <div class="card">
          <h1>${this.escapeHtml(this._title)}</h1>
          <p class="subtitle">Upload, download, and delete files from MongoDB.</p>

          <div class="upload-row">
            <input type="file" id="fileInput" />
            <button class="btn-upload" id="uploadBtn">Upload File</button>
          </div>

          <div id="statusMessage" class="status"></div>
        </div>

        <div class="card">
          <div class="top-row">
            <h2>Stored Files</h2>
            <span class="badge" id="fileCount">0 files</span>
          </div>

          <div class="search-row">
            <input
              type="text"
              id="searchInput"
              placeholder="Search by File ID..."
            />
          </div>

          <div class="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>File ID</th>
                  <th>Size</th>
                  <th>Uploaded</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody id="fileTable"></tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    this.shadowRoot.getElementById("uploadBtn")?.addEventListener("click", () => this.uploadFile());
    this.shadowRoot.getElementById("searchInput")?.addEventListener("input", () => this.filterFiles());
  }
}

customElements.define("file_actions", file-actions-manager);
