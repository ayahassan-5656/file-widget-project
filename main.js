(function () {
  const template = document.createElement("template");

  template.innerHTML = `
  <style>
    :host {
      display: block;
      font-family: Arial, sans-serif;
      direction: rtl;
    }

    .card {
      border: 1px solid #d9d9d9;
      border-radius: 12px;
      padding: 16px;
      background: white;
    }

    h3 {
      text-align: center;
      margin-bottom: 12px;
    }

    .row {
      display: flex;
      gap: 8px;
      margin-bottom: 10px;
      align-items: center;
    }

    input[type="text"] {
      flex: 1;
      padding: 8px;
      border-radius: 8px;
      border: 1px solid #ccc;
      box-sizing: border-box;
    }

    input[readonly] {
      background: #f9fafb;
    }

    button {
      border: none;
      padding: 8px 12px;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 600;
    }

    .upload { background: #2563eb; color: white; }
    .download { background: #10b981; color: white; }
    .delete { background: #ef4444; color: white; }

    .status {
      margin-top: 10px;
      padding: 8px;
      border-radius: 6px;
      font-size: 13px;
      display: none;
    }

    .success {
      background: #ecfdf5;
      border: 1px solid #a7f3d0;
      color: #065f46;
    }

    .error {
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: #991b1b;
    }

    .result {
      margin-top: 8px;
      font-size: 13px;
      color: #444;
    }
  </style>

  <div class="card">
    <h3>ادارة المرفقات</h3>

    <div class="row">
      <input type="text" id="fileKeyDisplay" readonly placeholder="اختر خلية من الجدول أولاً" />
      <button class="upload" id="chooseBtn">اختيار ملف</button>
      <button class="upload" id="uploadBtn">رفع ملف</button>
      <input type="file" id="fileInput" style="display:none;" />
    </div>

    <div class="row">
      <input id="searchInput" placeholder="ابحث برقم الملف" />
      <button class="download" id="downloadBtn">تحميل</button>
      <button class="delete" id="deleteBtn">حذف</button>
    </div>

    <div id="searchResult" class="result">لا يوجد ملف محدد</div>
    <div id="statusMessage" class="status"></div>
  </div>
  `;

  class FileActionsManager extends HTMLElement {
    constructor() {
      super();

      this._apiBaseUrl = "https://file-widget-project-production.up.railway.app/api/files";
      this._uniqueFileKey = "";
      this._allFiles = [];
      this._selectedFile = null;
      this.attachShadow({ mode: "open" });
      this.shadowRoot.appendChild(template.content.cloneNode(true));
    }

    connectedCallback() {
  const chooseBtn = this.shadowRoot.getElementById("chooseBtn");
  const uploadBtn = this.shadowRoot.getElementById("uploadBtn");
  const fileInput = this.shadowRoot.getElementById("fileInput");
  const downloadBtn = this.shadowRoot.getElementById("downloadBtn");
  const deleteBtn = this.shadowRoot.getElementById("deleteBtn");
  const searchInput = this.shadowRoot.getElementById("searchInput");

  chooseBtn.onclick = () => {
    fileInput.click();
  };

  uploadBtn.onclick = () => {
    this.uploadFile();
  };

  fileInput.onchange = () => {
    const display = this.shadowRoot.getElementById("fileKeyDisplay");
    if (this._uniqueFileKey && this._uniqueFileKey.trim() !== "") {
      display.value = this._uniqueFileKey;
    } else {
      display.value = "اختر خلية من الجدول أولاً";
    }
  };

  downloadBtn.onclick = () => {
    this.downloadSelectedFile();
  };

  deleteBtn.onclick = () => {
    this.deleteSelectedFile();
  };

  searchInput.oninput = () => {
    this.handleSearch();
  };

  this.refreshFiles();
}

    setUniqueFileKey(key) {
      this._uniqueFileKey = key || "";

      const searchInput = this.shadowRoot.getElementById("searchInput");
      if (searchInput) {
        searchInput.value = this._uniqueFileKey;
      }

      const display = this.shadowRoot.getElementById("fileKeyDisplay");
      if (display) {
        display.value = this._uniqueFileKey || "";
      }

      this.handleSearch();
    }

    getUniqueFileKey() {
      return this._uniqueFileKey || "";
    }

    setApiBaseUrl(url) {
      this._apiBaseUrl = url || this._apiBaseUrl;
      this.refreshFiles();
    }

    getApiBaseUrl() {
      return this._apiBaseUrl;
    }

    showStatus(message, type = "success") {
      const status = this.shadowRoot.getElementById("statusMessage");
      status.textContent = message;
      status.className = "status " + type;
      status.style.display = "block";
    }

    updateSearchResult(message) {
      this.shadowRoot.getElementById("searchResult").textContent = message;
    }

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
      } catch (e) {
        this.showStatus("حدث خطأ أثناء رفع الملف", "error");
      }
    }

    async refreshFiles() {
      try {
        const res = await fetch(this._apiBaseUrl);
        const data = await res.json();
        this._allFiles = Array.isArray(data) ? data : [];
      } catch (e) {
        this._allFiles = [];
        this.showStatus("فشل تحميل الملفات", "error");
      }
    }

    handleSearch() {
      const value = this.shadowRoot.getElementById("searchInput").value.trim();

      if (!value) {
        this._selectedFile = null;
        this.updateSearchResult("لا يوجد ملف محدد");
        return;
      }

      const match = this._allFiles.find((item) => {
        const fileId = item.metadata?.uniqueFileKey || "";
        return fileId === value;
      });

      if (!match) {
        this._selectedFile = null;
        this.updateSearchResult("لم يتم العثور على ملف");
        return;
      }

      this._selectedFile = match;

      const displayId = match.metadata?.uniqueFileKey || "-";
      this.updateSearchResult(`رقم الملف المحدد: ${displayId}`);
    }

    async downloadSelectedFile() {

  if (!this._selectedFile) {
    this.showStatus("الرجاء البحث عن ملف أولاً", "error");
    return;
  }

  try {

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

    const res = await fetch(`${this._apiBaseUrl}/${this._selectedFile._id}/download`);

    if (!res.ok) {
      this.showStatus("فشل تحميل الملف", "error");
      return;
    }

    const blob = await res.blob();
    const blobUrl = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = downloadName;

    document.body.appendChild(a);
    a.click();
    a.remove();

    window.URL.revokeObjectURL(blobUrl);

  } catch (e) {
    this.showStatus("حدث خطأ أثناء تحميل الملف", "error");
  }
}

    async deleteSelectedFile() {
      if (!this._selectedFile) {
        this.showStatus("الرجاء البحث عن ملف أولاً", "error");
        return;
      }

      const fileId = this._selectedFile.metadata?.uniqueFileKey || "-";
      const confirmed = window.confirm(`هل تريد حذف الملف رقم "${fileId}"؟`);

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

        this.showStatus(data.message || "تم حذف الملف بنجاح", "success");

        this.shadowRoot.getElementById("searchInput").value = "";
        this._selectedFile = null;
        this.updateSearchResult("لا يوجد ملف محدد");

        await this.refreshFiles();
      } catch (e) {
        this.showStatus("حدث خطأ أثناء حذف الملف", "error");
      }
    }
  }

  customElements.define("file-actions-manager", FileActionsManager);
})();
