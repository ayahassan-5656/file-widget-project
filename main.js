{
  "id": "file_actions",
  "version": "1.0.0",
  "name": "File Actions Manager",
  "newInstancePrefix": "FileActionsManager",
  "description": "File upload manager",
  "webcomponents": [
    {
      "kind": "main",
      "tag": "file-actions-manager",
      "url": "/main.js",
      "integrity": "",
      "ignoreIntegrity": true
    }
  ],
  "properties": {
    "apiBaseUrl": {
      "type": "string",
      "default": ""
    }
  },
  "methods": {
    "refreshFiles": {
      "description": "Reload files"
    }
  },
  "events": {}
}
