// electron/preload.js  —  v0.3 scene fix patch
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Google Docs
  isAuthorized: ()      => ipcRenderer.invoke('google:isAuthorized'),
  authorize:    ()      => ipcRenderer.invoke('google:authorize'),
  getDoc:       (docId) => ipcRenderer.invoke('google:getDoc', docId),

  // Spotify
  spotify: {
    isAuthorized: ()    => ipcRenderer.invoke('spotify:isAuthorized'),
    authorize:    ()    => ipcRenderer.invoke('spotify:authorize'),
    getPlaylists: ()    => ipcRenderer.invoke('spotify:getPlaylists'),
    play:         (uri) => ipcRenderer.invoke('spotify:play', uri),
    resume:       ()    => ipcRenderer.invoke('spotify:resume'),       // ← NEW
    pause:        ()    => ipcRenderer.invoke('spotify:pause'),
    skip:         ()    => ipcRenderer.invoke('spotify:skip'),
    previous:     ()    => ipcRenderer.invoke('spotify:previous'),     // ← NEW
    currentTrack: ()    => ipcRenderer.invoke('spotify:currentTrack'),
  },

  // Nanoleaf
  nanoleaf: {
    isConfigured:  ()                   => ipcRenderer.invoke('nanoleaf:isConfigured'),
    getConfig:     ()                   => ipcRenderer.invoke('nanoleaf:getConfig'),
    getDevices:    ()                   => ipcRenderer.invoke('nanoleaf:getDevices'),  // ← NEW
    setup:         (ip, port, label)    => ipcRenderer.invoke('nanoleaf:setup', { ip, port, label }),
    removeDevice:  (deviceId)           => ipcRenderer.invoke('nanoleaf:removeDevice', deviceId),   // ← NEW
    updateLabel:   (deviceId, label)    => ipcRenderer.invoke('nanoleaf:updateLabel', { deviceId, label }), // ← NEW
    verifyDevice:  (deviceId)           => ipcRenderer.invoke('nanoleaf:verifyDevice', deviceId),   // ← NEW
    getScenes:     ()                   => ipcRenderer.invoke('nanoleaf:getScenes'),
    setScene:      (scene)              => ipcRenderer.invoke('nanoleaf:setScene', scene),
    setBrightness: (val)                => ipcRenderer.invoke('nanoleaf:setBrightness', val),
    setPower:      (on)                 => ipcRenderer.invoke('nanoleaf:setPower', on),
    getState:      ()                   => ipcRenderer.invoke('nanoleaf:getState'),
  },

  // TV Display
  tv: {
    open:       ()        => ipcRenderer.invoke('tv:open'),
    close:      ()        => ipcRenderer.invoke('tv:close'),
    pushImage:  (p)       => ipcRenderer.invoke('tv:pushImage', p),
    clear:      ()        => ipcRenderer.invoke('tv:clear'),
    isOpen:     ()        => ipcRenderer.invoke('tv:isOpen'),
    pickFolder: ()        => ipcRenderer.invoke('tv:pickFolder'),
    thumbnail:  (p)       => ipcRenderer.invoke('tv:thumbnail', p),
  },

  // Monsters / Encounters
  monsters: {
    load:         ()        => ipcRenderer.invoke('monsters:load'),
    saveCustom:   (monster) => ipcRenderer.invoke('monsters:saveCustom', monster),
    deleteCustom: (id)      => ipcRenderer.invoke('monsters:deleteCustom', id),
  },

  // DND Wizard
  wizard: {
    ready: ()                   => ipcRenderer.invoke('wizard:ready'),
    chat:  (messages, question) => ipcRenderer.invoke('wizard:chat', { messages, question }),
  },
});
