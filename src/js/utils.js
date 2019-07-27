import m from 'mithril';

export function getParam(name){
  return m.parseQueryString(document.location.search)[name];
}

export function removeParam(name){
  var params = m.parseQueryString(document.location.search);
  delete params[name];
  window.history.pushState({}, '', window.location.toString().replace(document.location.search, "?"+m.buildQueryString(params)))
}