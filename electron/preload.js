// electron/preload.js  —  v0.3 scene fix patch
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
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

  // Stat Block window
  statblock: {
    open: (monster) => ipcRenderer.invoke('statblock:open', monster),
  },

  // TV Display
  tv: {
    open:        ()                                    => ipcRenderer.invoke('tv:open'),
    close:       ()                                    => ipcRenderer.invoke('tv:close'),
    pushImage:   (p)                                   => ipcRenderer.invoke('tv:pushImage', p),
    clear:       ()                                    => ipcRenderer.invoke('tv:clear'),
    isOpen:      ()                                    => ipcRenderer.invoke('tv:isOpen'),
    pickFolder:  ()                                    => ipcRenderer.invoke('tv:pickFolder'),
    thumbnail:   (p)                                   => ipcRenderer.invoke('tv:thumbnail', p),
    readImage:   (p)                                   => ipcRenderer.invoke('tv:readImage', p),
    syncFog:     (fogDataUrl)                          => ipcRenderer.invoke('tv:syncFog', fogDataUrl),
    brushStroke: (nx, ny, radius)                      => ipcRenderer.send('tv:brushStroke', { nx, ny, radius }),
    syncPins:    (pins, hideAllNpcs, hideAllMonsters)  => ipcRenderer.invoke('tv:syncPins', { pins, hideAllNpcs, hideAllMonsters }),
    syncGrid:    (enabled, size)                       => ipcRenderer.invoke('tv:syncGrid', { enabled, size }),
    syncOverlay: (state)                               => ipcRenderer.invoke('tv:syncOverlay', state),
  },

  // Map States (presets)
  mapStates: {
    load:   ()        => ipcRenderer.invoke('mapStates:load'),
    save:   (state)   => ipcRenderer.invoke('mapStates:save', state),
    delete: (id)      => ipcRenderer.invoke('mapStates:delete', id),
  },

  // Monsters / Encounters
  monsters: {
    loadSrd:      ()        => ipcRenderer.invoke('monsters:loadSrd'),
    load:         ()        => ipcRenderer.invoke('monsters:load'),
    saveCustom:   (monster) => ipcRenderer.invoke('monsters:saveCustom', monster),
    deleteCustom: (id)      => ipcRenderer.invoke('monsters:deleteCustom', id),
  },

  // DND Wizard
  wizard: {
    ready: ()                   => ipcRenderer.invoke('wizard:ready'),
    chat:  (messages, question) => ipcRenderer.invoke('wizard:chat', { messages, question }),
  },

  // Characters seed (from characters.json in project root)
  characters: {
    loadSeed: () => ipcRenderer.invoke('characters:loadSeed'),
  },

  // Karma
  karma: {
    load: ()     => ipcRenderer.invoke('karma:load'),
    save: (data) => ipcRenderer.invoke('karma:save', data),
  },

  // Scene Presets
  presets: {
    load: ()         => ipcRenderer.invoke('presets:load'),
    save: (presets)  => ipcRenderer.invoke('presets:save', presets),
  },

  // Documentation
  docs: {
    getTree:     ()                          => ipcRenderer.invoke('docs:getTree'),
    getFile:     (filePath)                  => ipcRenderer.invoke('docs:getFile', filePath),
    saveFile:    (filePath, data)            => ipcRenderer.invoke('docs:saveFile', { filePath, data }),
    createFile:  (folderPath, title)         => ipcRenderer.invoke('docs:createFile', { folderPath, title }),
    createFolder:(parentPath, name)          => ipcRenderer.invoke('docs:createFolder', { parentPath, name }),
    rename:      (oldPath, newName)          => ipcRenderer.invoke('docs:rename', { oldPath, newName }),
    delete:      (targetPath)               => ipcRenderer.invoke('docs:delete', targetPath),
    pickImage:   ()                          => ipcRenderer.invoke('docs:pickImage'),
    importImage: (sourcePath)               => ipcRenderer.invoke('docs:importImage', { sourcePath }),
    readImage:   (relativePath)             => ipcRenderer.invoke('docs:readImage', relativePath),
  },
});
