// ==UserScript==
// @id             iitc-plugin-show-portal-unvisited
// @name           IITC plugin: show portal unvisited
// @category       Highlighter
// @version        0.0.2.20210208.18214
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

window.plugin.portalUnvisited.STORAGE_KEY_PREFIX = 
  `plugin-show-portal-unvisited/${window.PLAYER.nickname}/`;


window.plugin.portalUnvisited.highlightUnvisited = function(data)  {
  if(map.getZoom() < 15) {
    return;
  }
  
  var ent = data.portal.options.ent;

  var history = {
    visited: false,
    captured: false
  };
  if(ent && ent[2] && ent[2][18]) {
    history.visited = !!(ent[2][18] & 1);
    history.captured = !!(ent[2][18] & 2);
  }

  if(!history.visited) {
    data.portal.setStyle({
      fillColor: 'purple',
      fillOpacity: 1
    });
  }else if(!history.captured){
    data.portal.setStyle({
      fillColor: 'red',
      fillOpacity: 1
    });
  }else{
    data.portal.setStyle({
      opacity: 0.5,
      fillOpacity: 0
    });
  }

};


window.plugin.portalUnvisited.enableCaching = false;


window.plugin.portalUnvisited.showOption = function() {

  const html = `
    <div>
      <center>
        <label id="enable-caching-toggle">
          <input type="checkbox" name="enable-caching"
          onchange="window.plugin.portalUnvisited.enableCaching = 
                    !window.plugin.portalUnvisited.enableCaching; return false;"
          ${window.plugin.portalUnvisited.enableCaching ? "checked" : ""} />
          Enable caching history on your browser
        </label>
        <br />
        <a onclick="window.plugin.drawTools.optCopy();" tabindex="0">Reset Cached History</a>
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
  })

};


var setup =  function() {

  const enableCachingString = 
    window.localStorage.getItem(window.plugin.portalUnvisited.STORAGE_KEY_PREFIX + 'enable-caching');
  if(enableCachingString && enableCachingString === "true") {
    window.plugin.portalUnvisited.enableCaching = true;
  }

  $('<a>')
    .html('PortalUnvisited Opt')
    .attr('title','[x]')
    .click(window.plugin.portalUnvisited.showOption)
    .appendTo('#toolbox');

  
  window.addPortalHighlighter('Portal Unvisited', window.plugin.portalUnvisited.highlightUnvisited);
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
