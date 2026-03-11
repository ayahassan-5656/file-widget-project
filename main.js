/*
-------------------------------------------------------
FileActionsManager - SAC Custom Widget
-------------------------------------------------------
*/

(function () {

  const template = document.createElement("template");

  template.innerHTML = `
  <style>

    :host {
      display:block;
      font-family:Arial, sans-serif;
      direction:rtl;
    }

    .card {
      border:1px solid #d9d9d9;
      border-radius:12px;
      padding:16px;
      background:white;
    }

    h3 {
      text-align:center;
      margin-bottom:12px;
    }

    .section {
      margin-bottom:12px;
    }

    /* Upload row */
    .upload-row {
      display:grid;
      grid-template-columns:1fr auto auto;
      gap:8px;
      align-items:center;
      margin-bottom:8px;
    }

    /* Search row - same style as upload row */
    .search-row {
      display:grid;
      grid-template-columns:1fr auto auto;
      gap:8px;
      align-items:center;
    }

    input[type="text"] {
      width:100%;
      min-width:0;
      padding:8px;
      border-radius:8px;
      border:1px solid #ccc;
      box-sizing:border-box;
    }

    input[readonly] {
      background:#f9fafb;
    }

    button {
      border:none;
      padding:8px 12px;
      border-radius:8px;
      cursor:pointer;
      font-weight:600;
      min-width:110px;
      white-space:nowrap;
    }

    .upload {
      background:#2563eb;
      color:white;
    }

    .download {
      background:#10b981;
      color:white;
    }

    .delete {
      background:#ef4444;
      color:white;
    }

    /* Hide buttons by default */
    #downloadBtn, #deleteBtn {
      display: none;
    }

    .status {
      margin-top:10px;
      padding:8px;
      border-radius:6px;
      font-size:13px;
      display:none;
    }

    .success {
      background:#ecfdf5;
      border:1px solid #a7f3d0;
      color:#065f46;
    }

    .error {
      background:#fef2f2;
      border:1px solid #fecaca;
      color:#991b1b;
    }

    .result {
      margin-top:8px;
      font-size:13px;
      color:#444;
    }

  </style>

  <div class="card">

    <h3>ادارة المرفقات</h3>

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

        <input type="file" id="fileInput" style="display:none;" />

      </div>
    </div>

    <div class="section">

      <div class="search-row">

        <input
          id="searchInput"
          type="text"
          placeholder="ابحث عن ملف لتحميله أو حذفه"
        />

        <button class="download" id="downloadBtn">تحميل</button>
        <button class="delete" id="deleteBtn">حذف</button>

      </div>

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

      this.attachShadow({mode:"open"});
      this.shadowRoot.appendChild(template.content.cloneNode(true));
    }

    connectedCallback(){

      const chooseBtn = this.shadowRoot.getElementById("chooseBtn");
      const uploadBtn = this.shadowRoot.getElementById("uploadBtn");
      const fileInput = this.shadowRoot.getElementById("fileInput");
      const downloadBtn = this.shadowRoot.getElementById("downloadBtn");
      const deleteBtn = this.shadowRoot.getElementById("deleteBtn");
      const searchInput = this.shadowRoot.getElementById("searchInput");

      chooseBtn.onclick = () => fileInput.click();

      uploadBtn.onclick = () => this.uploadFile();

      fileInput.onchange = () => {

        const display = this.shadowRoot.getElementById("fileKeyDisplay");

        if(this._uniqueFileKey && this._uniqueFileKey.trim() !== ""){
          display.value = this._uniqueFileKey;
        }else{
          display.value = "اختر خلية من الجدول أولاً";
        }
      };

      downloadBtn.onclick = () => this.downloadSelectedFile();
      deleteBtn.onclick = () => this.deleteSelectedFile();

      searchInput.oninput = () => this.handleSearch();

      this.refreshFiles();
    }

    updateActionsVisibility(show){
      const downloadBtn = this.shadowRoot.getElementById("downloadBtn");
      const deleteBtn = this.shadowRoot.getElementById("deleteBtn");
      
      if (show) {
        downloadBtn.style.display = "block";
        deleteBtn.style.display = "block";
      } else {
        downloadBtn.style.display = "none";
        deleteBtn.style.display = "none";
      }
    }

    setUniqueFileKey(key){

      this._uniqueFileKey = key || "";

      const searchInput = this.shadowRoot.getElementById("searchInput");
      const display = this.shadowRoot.getElementById("fileKeyDisplay");

      if(searchInput) searchInput.value = this._uniqueFileKey;
      if(display) display.value = this._uniqueFileKey || "";

      this.handleSearch();
    }

    getUniqueFileKey(){
      return this._uniqueFileKey || "";
    }

    setApiBaseUrl(url){
      this._apiBaseUrl = url || this._apiBaseUrl;
      this.refreshFiles();
    }

    getApiBaseUrl(){
      return this._apiBaseUrl;
    }

    showStatus(message,type="success"){

      const status = this.shadowRoot.getElementById("statusMessage");

      status.textContent = message;
      status.className = "status " + type;
      status.style.display = "block";
    }

    updateSearchResult(message){
      this.shadowRoot.getElementById("searchResult").textContent = message;
    }

    async uploadFile(){

      const input = this.shadowRoot.getElementById("fileInput");

      if(!input.files.length){
        this.showStatus("الرجاء اختيار ملف أولاً","error");
        return;
      }

      if(!this._uniqueFileKey || this._uniqueFileKey.trim()===""){
        this.showStatus("الرجاء اختيار خلية من الجدول أولاً","error");
        return;
      }

      const formData = new FormData();
      formData.append("file",input.files[0]);
      formData.append("uniqueFileKey",this._uniqueFileKey);

      try{

        const res = await fetch(`${this._apiBaseUrl}/upload`,{
          method:"POST",
          body:formData
        });

        const data = await res.json();

        if(!res.ok){
          this.showStatus(data.message || "فشل رفع الملف","error");
          return;
        }

        this.showStatus(`تم رفع الملف بنجاح برقم: ${this._uniqueFileKey}`,"success");

        input.value="";

        await this.refreshFiles();
        this.handleSearch();

      }catch{
        this.showStatus("حدث خطأ أثناء رفع الملف","error");
      }
    }

    async refreshFiles(){

      try{

        const res = await fetch(this._apiBaseUrl);
        const data = await res.json();

        this._allFiles = Array.isArray(data) ? data : [];

      }catch{

        this._allFiles = [];
        this.showStatus("فشل تحميل الملفات","error");

      }
    }

    handleSearch(){

      const value = this.shadowRoot.getElementById("searchInput").value.trim();

      if(!value){

        this._selectedFile = null;
        this.updateActionsVisibility(false);
        this.updateSearchResult("لا يوجد ملف محدد");
        return;
      }

      const match = this._allFiles.find(
        f => (f.metadata?.uniqueFileKey || "") === value
      );

      if(!match){

        this._selectedFile = null;
        this.updateActionsVisibility(false);
        this.updateSearchResult("لم يتم العثور على ملف");
        return;
      }

      this._selectedFile = match;
      this.updateActionsVisibility(true);
      this.updateSearchResult(`رقم الملف المحدد: ${match.metadata?.uniqueFileKey}`);
    }

    async downloadSelectedFile(){

      if(!this._selectedFile){
        this.showStatus("الرجاء البحث عن ملف أولاً","error");
        return;
      }

      try{

        const res = await fetch(`${this._apiBaseUrl}/${this._selectedFile._id}/download`);

        if(!res.ok){
          this.showStatus("فشل تحميل الملف","error");
          return;
        }

        const blob = await res.blob();
        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        
        // FIXED: Use the uniqueFileKey from MongoDB as the filename, not the original name
        // This ensures the downloaded file has the SAC ID as its filename
        const fileExtension = this._selectedFile.metadata?.originalName?.split('.').pop() || '';
        const fileName = fileExtension ? 
          `${this._selectedFile.metadata?.uniqueFileKey}.${fileExtension}` : 
          this._selectedFile.metadata?.uniqueFileKey || "download";
        
        a.download = fileName;

        document.body.appendChild(a);
        a.click();
        a.remove();

        URL.revokeObjectURL(url);

        this.showStatus(`تم تحميل الملف بنجاح: ${fileName}`,"success");

      }catch(error){
        console.error("Download error:", error);
        this.showStatus("حدث خطأ أثناء تحميل الملف","error");
      }
    }

    async deleteSelectedFile(){

      if(!this._selectedFile){
        this.showStatus("الرجاء البحث عن ملف أولاً","error");
        return;
      }

      const confirmed = window.confirm(
        `هل تريد حذف الملف رقم "${this._selectedFile.metadata?.uniqueFileKey}"؟`
      );

      if(!confirmed) return;

      try{

        const res = await fetch(`${this._apiBaseUrl}/${this._selectedFile._id}`,{
          method:"DELETE"
        });

        const data = await res.json();

        if(!res.ok){
          this.showStatus(data.message || "فشل حذف الملف","error");
          return;
        }

        this.showStatus("تم حذف الملف بنجاح","success");

        this.shadowRoot.getElementById("searchInput").value="";
        this._selectedFile=null;

        this.updateActionsVisibility(false);
        this.updateSearchResult("لا يوجد ملف محدد");

        await this.refreshFiles();

      }catch{
        this.showStatus("حدث خطأ أثناء حذف الملف","error");
      }
    }
  }

  customElements.define("file-actions-manager",FileActionsManager);

})();
