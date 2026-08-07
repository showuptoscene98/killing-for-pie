const { contextBridge, ipcRenderer } = require('electron');

/**
 * Renderer-facing desktop API.
 * Live game runs from Netlify; LAN coop relay still starts in main for local friends.
 */
contextBridge.exposeInMainWorld('kfpDesktop', {
  isDesktop: true,
  getInfo: () => ipcRenderer.invoke('desktop:getInfo'),
  reloadGame: () => ipcRenderer.invoke('desktop:reloadGame'),
  openInBrowser: () => ipcRenderer.invoke('desktop:openInBrowser'),
  steam: {
    isAvailable: () => ipcRenderer.invoke('steam:isAvailable'),
    createLobby: (opts) => ipcRenderer.invoke('steam:createLobby', opts),
    joinLobby: (lobbyId) => ipcRenderer.invoke('steam:joinLobby', lobbyId),
    leaveLobby: () => ipcRenderer.invoke('steam:leaveLobby'),
    sendP2P: (steamId, payload) =>
      ipcRenderer.invoke('steam:sendP2P', { steamId, payload }),
  },
});
