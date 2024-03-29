// ==UserScript==
// @id             iitc-plugin-show-portal-unvisited
// @name           IITC plugin: show portal unvisited
// @category       Highlighter
// @version        0.0.4.20210904.00239
// @namespace      https://github.com/nikola-f/iitc-plugins
// @downloadURL    https://github.com/nikola-f/iitc-plugins/raw/master/src/show-portal-unvisited.user.js
// @updateURL      https://github.com/nikola-f/iitc-plugins/raw/master/src/show-portal-unvisited.user.js
// @homepageURL    https://github.com/nikola-f/iitc-plugins
// @description Use the fill color of the portals to show if the portal is unvisited or uncaptured.
// @author nikola-f
// @include        https://intel.ingress.com/*
// @include        http://intel.ingress.com/*
// @match          https://intel.ingress.com/*
// @match          http://intel.ingress.com/*
// @grant          none
// ==/UserScript==


function wrapper(plugin_info) {
// ensure plugin framework is there, even if iitc is not yet loaded
if(typeof window.plugin !== 'function') window.plugin = function() {};



// PLUGIN START ////////////////////////////////////////////////////////

// use own namespace for plugin
window.plugin.portalUnvisited = function() {};

window.plugin.portalUnvisited.HIGHLIGHTER_NAME = 'Portal Unvisited';
window.plugin.portalUnvisited.STORAGE_KEY_PREFIX = 
  `plugin-show-portal-unvisited/${window.PLAYER.nickname}/`;

window.plugin.portalUnvisited.db = null;
window.plugin.portalUnvisited.enableCaching = true;


window.plugin.portalUnvisited.pluginLoaded = async function() {
  if(!window.indexedDB){
    console.warn('Show portal unvisited: indexedDB not supported');
    return;
  }
  try {
    await Promise.all([
      async function() {
        return new Promise(function (resolve, reject) {
          $.getScript('https://cdnjs.cloudflare.com/ajax/libs/dexie/3.0.3/dexie.min.js')
          .done(function() {resolve()})
          .fail(function(err) {reject(err)});
        });
      }(),
      async function() {
        return new Promise(function (resolve, reject) {
          $.getScript('https://cdn.jsdelivr.net/npm/js-md5@0.7.3/src/md5.min.js')
          .done(function() {resolve()})
          .fail(function(err) {reject(err)});
        });
      }()
    ]);
  }catch(err){
    console.error(err);
    return;
  }
  window.plugin.portalUnvisited.db = new Dexie('portalUnvisited/' + window.PLAYER.nickname);
  window.plugin.portalUnvisited.db.version(1).stores({
    history: 'g'
  });
};




window.plugin.portalUnvisited.highlightUnvisited = async function(data)  {
  if(map.getZoom() < 15) {
    return;
  }
  
  const history = {
    v: 0,
    visited: false,
    captured: false
  };

  if(data.portal.options.ent?.[2]?.[18]) {
    history.v = data.portal.options.ent[2][18];
  }else if(window.plugin.portalUnvisited.enableCaching === true &&
           window.plugin.portalUnvisited.db?.history){
    const cached = await window.plugin.portalUnvisited.loadHistory(data.portal.options.guid);
    if(cached?.v) {
      history.v = cached.v;
      console.debug('hit:', data.portal.options.data.title || data.portal.options.guid);
    }
  }
  history.visited = !!(history.v & 1);
  history.captured = !!(history.v & 2);

  if(!history.visited) {
    data.portal.setStyle({
      fillColor: 'purple',
      fillOpacity: 0.8
    });
  }else if(!history.captured){
    data.portal.setStyle({
      fillColor: 'red',
      fillOpacity: 0.8
    });
  }else{
    data.portal.setStyle({
      opacity: 0.5,
      fillOpacity: 0
    });
  }

};



window.plugin.portalUnvisited.toHash = function(guids) {

  if(Array.isArray(guids)) {  
    return guids.map(function(guid) {
      return md5.arrayBuffer(guid);
    });
  }else{
    return md5.arrayBuffer(guids);
  }
};


window.plugin.portalUnvisited.loadHistory = async function(guids) {

  if(Array.isArray(guids)) {
    const histories = await window.plugin.portalUnvisited.db.history.bulkGet(
      window.plugin.portalUnvisited.toHash(guids)
    );
    return histories.filter(function(aHistory) {return !!aHistory});
  }else{
    return await window.plugin.portalUnvisited.db.history.get(
      window.plugin.portalUnvisited.toHash(guids)
    );
  }

};


window.plugin.portalUnvisited.saveHistory = async function(histories) {

  try {

    if(Array.isArray(histories)) {
      await window.plugin.portalUnvisited.db.history.bulkPut(
        histories.map(function(history) {
          return {
            "g": window.plugin.portalUnvisited.toHash(history.g),
            "v": history.v
          };
        })
      );
    }else{
      await window.plugin.portalUnvisited.db.history.put({
        "g": window.plugin.portalUnvisited.toHash(histories.g),
        "v": histories.v
      });
    }
  }catch(err){
    console.error(err);
  }  
};




window.plugin.portalUnvisited.mapDataRefreshEnd = async function() {

  if(map.getZoom() < 15 ||
     window.plugin.portalUnvisited.enableCaching !== true ||
     window._current_highlighter !== window.plugin.portalUnvisited.HIGHLIGHTER_NAME ||
     !window.plugin.portalUnvisited.db?.history) {
    return;
  }

  const intelHistory = [];
  for(const guid in window.portals) {
    if(window.portals[guid].options.ent?.[2]?.[18]) {
      intelHistory[guid] = window.portals[guid].options.ent?.[2]?.[18];
      intelHistory.push({
        "g": guid,
        "v": window.portals[guid].options.ent[2][18]
      });
    }
  }
  console.debug(Object.keys(intelHistory).length + ' history found.');

  await window.plugin.portalUnvisited.saveHistory(intelHistory);
};



window.plugin.portalUnvisited.portalDetailLoaded = async function(data) {
  
  if(window.plugin.portalUnvisited.enableCaching !== true ||
     window._current_highlighter !== window.plugin.portalUnvisited.HIGHLIGHTER_NAME ||
     !window.plugin.portalUnvisited.db?.history ||
     !data.ent?.[2]?.[18]) {
    return;
  }

  try {
    const cached = await window.plugin.portalUnvisited.loadHistory(data.guid);
    // console.debug('portalDetailLoaded:', data.guid);

    if(!cached || cached.v < data.ent[2][18]) {
      await window.plugin.portalUnvisited.saveHistory({"g": data.guid, "v": data.ent[2][18]});
      console.debug('selection cached:', data.details.title);
    }
  }catch(err){
    console.error(err);
  }

};




window.plugin.portalUnvisited.showOption = async function() {

  let cachedCount = 0;
  if(window.plugin.portalUnvisited.db?.history) {
    try {
      cachedCount = await window.plugin.portalUnvisited.db.history.count();
    }catch(err){
      console.error(err);
    }
  }

  const html = `
    <div>
      <center>
        <label id="enable-caching-toggle">
          <input type="checkbox" name="enable-caching"
          onchange="window.plugin.portalUnvisited.enableCaching = 
                    !window.plugin.portalUnvisited.enableCaching; return false;"
          ${window.plugin.portalUnvisited.enableCaching ? "checked" : ""} />
          Enable caching history
        </label>
        <br /><br />
        <a onclick="window.plugin.portalUnvisited.resetCachedHistory();" tabindex="0"
           style="display:block; color:#ffce00; border:1px solid #ffce00; padding:3px 0; margin:10px auto; width:80%; text-align:center;">
          Reset ${cachedCount} cached history
        </a>
      </center>
    </div>
  `;

  dialog({
    html: html,
    id: 'plugin-show-portal-unvisited-option',
    title: 'Portal Unvisited Options',
    close: function() {
      window.localStorage.setItem(
        window.plugin.portalUnvisited.STORAGE_KEY_PREFIX + 'enable-caching',
        window.plugin.portalUnvisited.enableCaching
      );
    }
  });

};


window.plugin.portalUnvisited.resetCachedHistory = async function() {
  if(window.confirm('Do you really want to reset all cached history?') &&
     window.plugin.portalUnvisited.db?.history) {
    await window.plugin.portalUnvisited.db.history.clear();
  }
};


var setup =  function() {

  const enableCachingString = 
    window.localStorage.getItem(window.plugin.portalUnvisited.STORAGE_KEY_PREFIX + 'enable-caching');
  if(enableCachingString && enableCachingString === "false") {
    window.plugin.portalUnvisited.enableCaching = false;
  }

  $('<a>')
    .html('PortalUnvisited Opt')
    .attr('title','[x]')
    .click(window.plugin.portalUnvisited.showOption)
    .appendTo('#toolbox');

  
  window.addHook('iitcLoaded', window.plugin.portalUnvisited.pluginLoaded);
  window.addHook('mapDataRefreshEnd', window.plugin.portalUnvisited.mapDataRefreshEnd);
  window.addHook('portalDetailLoaded', window.plugin.portalUnvisited.portalDetailLoaded);

  window.addPortalHighlighter(window.plugin.portalUnvisited.HIGHLIGHTER_NAME, window.plugin.portalUnvisited.highlightUnvisited);

};
// PLUGIN END //////////////////////////////////////////////////////////


setup.info = plugin_info; //add the script info data to the function as a property
if(!window.bootPlugins) window.bootPlugins = [];
window.bootPlugins.push(setup);
// if IITC has already booted, immediately run the 'setup' function
if(window.iitcLoaded && typeof setup === 'function') setup();
} // wrapper end

// inject code into site context
var script = document.createElement('script');
var info = {};
if (typeof GM_info !== 'undefined' && GM_info && GM_info.script) info.script = { version: GM_info.script.version, name: GM_info.script.name, description: GM_info.script.description };
script.appendChild(document.createTextNode('('+ wrapper +')('+JSON.stringify(info)+');'));
(document.body || document.head || document.documentElement).appendChild(script);
