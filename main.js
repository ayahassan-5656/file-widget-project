/*
-------------------------------------------------------
FileActionsManager - SAC Custom Widget
-------------------------------------------------------

This script defines a custom Web Component used inside
SAP Analytics Cloud (SAC).

Purpose:
- Upload files
- Search files by unique key
- Download files
- Delete files

It communicates with a backend API built using:
Node.js + Express + MongoDB GridFS.

NOTE:
The `index.html` file in this project was used only for
local API testing and debugging. It is NOT used inside
SAC. This file contains the actual widget logic.
-------------------------------------------------------
*/

(function () {

  // Create HTML template that will be attached to the widget's shadow DOM
  const template = document.createElement("template");

  template.innerHTML = `
  <style>
    /* Root widget styling */
    :host {
      display: block;
      font-family: Arial, sans-serif;
      direction: rtl; /* Arabic layout */
    }

    /* Main container */
    .card {
      border: 1px solid #d9d9d9;
      border-radius: 12px;
      padding: 16px;
      background: white;
    }

    /* Widget title */
    h3 {
      text-align: center;
      margin-bottom: 12px;
    }

    /* Shared section spacing */
    .section {
      margin-bottom: 12px;
    }

    /* Generic row layout */
    .row {
      display: flex;
      gap: 8px;
      margin-bottom: 10px;
      align-items: center;
      flex-wrap: wrap;
    }

    /* Upload row keeps items on one line when possible */
    .upload-row {
      display: flex;
      gap: 8px;
      margin-bottom: 10px;
      align-items: center;
      flex-wrap: nowrap;
    }

    /* Search input wrapper takes full width */
    .search-input-wrap {
      width: 100%;
      display: block;
    }

    /* Base text input styling */
    input[type="text"] {
      width: 100%;
      min-width: 0;
      padding: 8px;
      border-radius: 8px;
      border: 1px solid #ccc;
      box-sizing: border-box;
    }

    /* Upload display field */
    #fileKeyDisplay {
      flex: 1;
      min-width: 220px;
    }

    /* Search field made intentionally wide */
    #searchInput {
      width: 100%;
      min-width: 420px;
      display: block;
    }

    /* Read-only input style */
    input[readonly] {
      background: #f9fafb;
    }

    /* Button styling */
    button {
      border: none;
      padding: 8px 12px;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 600;
      white-space: nowrap;
    }

    /* Upload button */
    .upload {
      background: #2563eb;
      color: white;
    }

    /* Download button */
    .download {
      background: #10b981;
      color: white;
    }

    /* Delete button */
    .delete {
      background: #ef4444;
      color: white;
    }

    /* Action buttons row (hidden until file exists) */
    .actions-row {
      display: none;
      gap: 8px;
      margin-top: 8px;
      width: 100%;
      justify-content: flex-start;
    }

    .actions-row button {
      min-width: 110px;
    }

    /* Status message box */
    .status {
      margin-top: 10px;
      padding: 8px;
      border-radius: 6px;
      font-size: 13px;
      display: none;
    }

    /* Success message style */
    .success {
      background: #ecfdf5;
      border: 1px solid #a7f3d0;
      color: #065f46;
    }

    /* Error message style */
    .error {
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: #991b1b;
    }

    /* Search result text */
    .result {
      margin-top: 8px;
      font-size: 13px;
      color: #444;
    }
  </style>

  <div class="card">
    <h3>ادارة المرفقات</h3>

    <!-- Upload section -->
    <div class="section">
      <div class="upload-row">
        <input
          type="text"
          id="fileKeyDisplay"
          readonly
          placeholder="اختر خلية من الجدول أولاً"
        />
        <button class="upload" id="chooseBtn">اختيار ملف</button>
        <button class="upload" id="uploadBtn">رفع ملف</button>

        <!-- Hidden file selector -->
        <input type="file" id="fileInput" style="display:none;" />
      </div>
    </div>

    <!-- Search / download / delete section -->
    <div class="section">
      <div class="search-input-wrap">
        <input id="searchInput" placeholder="ابحث عن ملف لتحميله أو حذفه" />
      </div>

      <div class="actions-row" id="actionsRow">
        <button class="download" id="downloadBtn">تحميل</button>
        <button class="delete" id="deleteBtn">حذف</button>
      </div>
    </div>

    <!-- Search result display -->
    <div id="searchResult" class="result">لا يوجد ملف محدد</div>

    <!-- Status messages -->
    <div id="statusMessage" class="status"></div>
  </div>
  `;

  /*
  -------------------------------------------------------
  Custom Web Component Class
  -------------------------------------------------------
  */
  class FileActionsManager extends HTMLElement {

    constructor() {
      super();

      // Base URL of the backend API
      this._apiBaseUrl = "https://file-widget-project-production.up.railway.app/api/files";

      // Unique key used to link files to SAC table cells
      this._uniqueFileKey = "";

      // Cached list of files retrieved from API
      this._allFiles = [];

      // Currently selected file
      this._selectedFile = null;

      // Create shadow DOM
      this.attachShadow({ mode: "open" });

      // Attach template to shadow DOM
      this.shadowRoot.appendChild(template.content.cloneNode(true));
    }

    /*
    Called when widget is added to the DOM
    */
    connectedCallback() {

      const chooseBtn = this.shadowRoot.getElementById("chooseBtn");
      const uploadBtn = this.shadowRoot.getElementById("uploadBtn");
      const fileInput = this.shadowRoot.getElementById("fileInput");
      const downloadBtn = this.shadowRoot.getElementById("downloadBtn");
      const deleteBtn = this.shadowRoot.getElementById("deleteBtn");
      const searchInput = this.shadowRoot.getElementById("searchInput");

      // Open file picker
      chooseBtn.onclick = () => fileInput.click();

      // Upload file
      uploadBtn.onclick = () => this.uploadFile();

      // Display selected key instead of local filename
      fileInput.onchange = () => {
        const display = this.shadowRoot.getElementById("fileKeyDisplay");

        if (this._uniqueFileKey && this._uniqueFileKey.trim() !== "") {
          display.value = this._uniqueFileKey;
        } else {
          display.value = "اختر خلية من الجدول أولاً";
        }
      };

      // Download file
      downloadBtn.onclick = () => this.downloadSelectedFile();

      // Delete file
      deleteBtn.onclick = () => this.deleteSelectedFile();

      // Search input
      searchInput.oninput = () => this.handleSearch();

      // Load files from API
      this.refreshFiles();
    }

    /*
    Show or hide action buttons depending on whether a file exists
    */
    updateActionsVisibility(show) {
      const actionsRow = this.shadowRoot.getElementById("actionsRow");
      actionsRow.style.display = show ? "flex" : "none";
    }

    /*
    Set unique key from SAC table selection
    */
    setUniqueFileKey(key) {

      this._uniqueFileKey = key || "";

      const searchInput = this.shadowRoot.getElementById("searchInput");
      const display = this.shadowRoot.getElementById("fileKeyDisplay");

      if (searchInput) {
        searchInput.value = this._uniqueFileKey;
      }

      if (display) {
        display.value = this._uniqueFileKey || "";
      }

      this.handleSearch();
    }

    getUniqueFileKey() {
      return this._uniqueFileKey || "";
    }

    /*
    Change API URL dynamically
    */
    setApiBaseUrl(url) {
      this._apiBaseUrl = url || this._apiBaseUrl;
      this.refreshFiles();
    }

    getApiBaseUrl() {
      return this._apiBaseUrl;
    }

    /*
    Show success or error message
    */
    showStatus(message, type = "success") {

      const status = this.shadowRoot.getElementById("statusMessage");

      status.textContent = message;
      status.className = "status " + type;
      status.style.display = "block";
    }

    /*
    Update search result label
    */
    updateSearchResult(message) {
      this.shadowRoot.getElementById("searchResult").textContent = message;
    }

    /*
    Upload file to backend
    */
    async uploadFile() {

      const input = this.shadowRoot.getElementById("fileInput");

      if (!input.files.length) {
        this.showStatus("الرجاء اختيار ملف أولاً", "error");
        return;
      }

      if (!this._uniqueFileKey || this._uniqueFileKey.trim() === "") {
        this.showStatus("الرجاء اختيار خلية من الجدول أولاً", "error");
        return;
      }

      const formData = new FormData();
      formData.append("file", input.files[0]);
      formData.append("uniqueFileKey", this._uniqueFileKey);

      try {

        const res = await fetch(`${this._apiBaseUrl}/upload`, {
          method: "POST",
          body: formData
        });

        const data = await res.json();

        if (!res.ok) {
          this.showStatus(data.message || "فشل رفع الملف", "error");
          return;
        }

        this.showStatus(`تم رفع الملف بنجاح برقم: ${this._uniqueFileKey}`, "success");

        input.value = "";

        await this.refreshFiles();
        this.handleSearch();

      } catch {
        this.showStatus("حدث خطأ أثناء رفع الملف", "error");
      }
    }

    /*
    Fetch all files from API
    */
    async refreshFiles() {

      try {

        const res = await fetch(this._apiBaseUrl);
        const data = await res.json();

        this._allFiles = Array.isArray(data) ? data : [];

      } catch {

        this._allFiles = [];
        this.showStatus("فشل تحميل الملفات", "error");

      }
    }

    /*
    Search for file by unique key
    */
    handleSearch() {

      const value = this.shadowRoot.getElementById("searchInput").value.trim();

      if (!value) {
        this._selectedFile = null;
        this.updateActionsVisibility(false);
        this.updateSearchResult("لا يوجد ملف محدد");
        return;
      }

      const match = this._allFiles.find(
        (f) => (f.metadata?.uniqueFileKey || "") === value
      );

      if (!match) {
        this._selectedFile = null;
        this.updateActionsVisibility(false);
        this.updateSearchResult("لم يتم العثور على ملف");
        return;
      }

      this._selectedFile = match;
      this.updateActionsVisibility(true);
      this.updateSearchResult(`رقم الملف المحدد: ${match.metadata?.uniqueFileKey || "-"}`);
    }

    /*
    Download selected file
    */
    async downloadSelectedFile() {

      if (!this._selectedFile) {
        this.showStatus("الرجاء البحث عن ملف أولاً", "error");
        return;
      }

      try {

        const res = await fetch(`${this._apiBaseUrl}/${this._selectedFile._id}/download`);

        if (!res.ok) {
          this.showStatus("فشل تحميل الملف", "error");
          return;
        }

        const blob = await res.blob();
        const url = URL.createObjectURL(blob);

        const fileId = this._selectedFile.metadata?.uniqueFileKey || "download";
        const originalName = this._selectedFile.metadata?.originalName || "";

        const extension =
          originalName.lastIndexOf(".") !== -1
            ? originalName.slice(originalName.lastIndexOf("."))
            : "";

        const safeBaseName = String(fileId)
          .replace(/\|/g, "_")
          .replace(/\s+/g, "_")
          .replace(/[<>:"/\\?*]/g, "")
          .trim();

        const downloadName = `${safeBaseName}${extension}`;

        const a = document.createElement("a");
        a.href = url;
        a.download = downloadName;

        document.body.appendChild(a);
        a.click();
        a.remove();

        URL.revokeObjectURL(url);

      } catch {
        this.showStatus("حدث خطأ أثناء تحميل الملف", "error");
      }
    }

    /*
    Delete selected file
    */
    async deleteSelectedFile() {

      if (!this._selectedFile) {
        this.showStatus("الرجاء البحث عن ملف أولاً", "error");
        return;
      }

      const confirmed = window.confirm(
        `هل تريد حذف الملف رقم "${this._selectedFile.metadata?.uniqueFileKey || "-"}"؟`
      );

      if (!confirmed) return;

      try {

        const res = await fetch(`${this._apiBaseUrl}/${this._selectedFile._id}`, {
          method: "DELETE"
        });

        const data = await res.json();

        if (!res.ok) {
          this.showStatus(data.message || "فشل حذف الملف", "error");
          return;
        }

        this.showStatus("تم حذف الملف بنجاح", "success");

        this.shadowRoot.getElementById("searchInput").value = "";
        this._selectedFile = null;
        this.updateActionsVisibility(false);
        this.updateSearchResult("لا يوجد ملف محدد");

        await this.refreshFiles();

      } catch {
        this.showStatus("حدث خطأ أثناء حذف الملف", "error");
      }
    }
  }

  /*
  Register the custom element
  Usage in HTML:
  <file-actions-manager></file-actions-manager>
  */
  customElements.define("file-actions-manager", FileActionsManager);

})();
