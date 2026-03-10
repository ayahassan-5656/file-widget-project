class SACFileManager extends HTMLElement {
  constructor() {
    super();
    const root = this.attachShadow({ mode: "open" });
    root.innerHTML = `
      <div style="padding:16px;font-family:Arial,sans-serif;">
        <h3 style="margin:0 0 8px 0;">File Actions Manager</h3>
        <div>Widget loaded successfully.</div>
      </div>
    `;
  }

  setUniqueFileKey(key) {
    this._uniqueFileKey = key || "";
  }

  getUniqueFileKey() {
    return this._uniqueFileKey || "";
  }

  setApiBaseUrl(url) {
    this._apiBaseUrl = url || "";
  }

  getApiBaseUrl() {
    return this._apiBaseUrl || "";
  }

  refreshFiles() {
    // no-op for now
  }
}

customElements.define("file-actions-manager", SACFileManager);
