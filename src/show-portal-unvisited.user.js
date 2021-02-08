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

window.plugin.portalUnvisited.highlightUnvisited = function(data)  {
  if(map.getZoom() < 15) {
    return;
  }
  
  var ent = data.portal.options.ent;
  var style = {
    fillColor: data.portal.fillColor,
    fillOpacity: 1.0
  };

  if(ent && ent[2] && ent[2][18]) {

    if(ent[2][18] === 1) { // visited = uncaptured
      style.fillColor = 'red';

    }else if(ent[2][18] === 3){ // captured
      style.opacity = 0.5;
      style.fillOpacity = 0.00;
    }

  }else{ // unvisited
    style.fillColor = 'purple';
  }
  
  data.portal.setStyle(style);
};


var setup =  function() {
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
