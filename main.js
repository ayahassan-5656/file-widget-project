const template = document.createElement("template");
template.innerHTML = `
<style>
:host {
  display:block;
  font-family: Arial;
}

button{
  padding:8px 14px;
}
</style>

<div>
  <h3>File Manager Widget</h3>
  <button id="refresh">Refresh Files</button>
</div>
`;

class FileActionsManager extends HTMLElement {

  constructor(){
    super();

    this.attachShadow({mode:"open"});
    this.shadowRoot.appendChild(template.content.cloneNode(true));

    this.shadowRoot.getElementById("refresh")
      .addEventListener("click", () => {
        this.refreshFiles();
      });

    this._apiBaseUrl = "";
  }

  set apiBaseUrl(value){
    this._apiBaseUrl = value;
  }

  get apiBaseUrl(){
    return this._apiBaseUrl;
  }

  refreshFiles(){
    console.log("Refreshing files from:", this._apiBaseUrl);
  }

}

customElements.define("file-actions-manager", FileActionsManager);
