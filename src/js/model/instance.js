const CITYLIST_URL = "https://vigilo-bf7f2.firebaseio.com/citylist.json";

import m from 'mithril';
import { getParam } from '../utils';

var Instance = {
  _list: {},

  fetchlist: function () {
    return m.request({
      method: "GET",
      url: CITYLIST_URL,
    }).then(function (items) {
      items["Developpemet"] = {
        prod: false,
        scope: "develop",
        api_path: "https://dev-vigilo.alwaysdata.net"
      }
      for (var key in items) {
        items[key].key = key;
        items[key].api_path = decodeURIComponent(items[key].api_path);
      };
      Instance._list = items;
    })
  },

  set beta(b){
    localStorage.setItem("vigilo-beta", b?"true":"false");
  },

  get beta() {
    return localStorage.getItem("vigilo-beta")=="true";
  },

  get list() {
    var items = Object.assign({}, Instance._list);
    
    for (var key in items) {
      if (!Instance.beta && !items[key].prod) {
        delete items[key];
      }
    }
    return items;
  },

  get current() {
    var stored = JSON.parse(localStorage.getItem("vigilo-instance"));
    if (stored === null || stored.key === undefined || Instance.list[stored.key] === undefined) {
      return {};
    }
    return Instance.list[stored.key];
  },

  set current(arg) {
    if (arg === null || Instance.list[arg] === undefined) {
      return null;
    }
    localStorage.setItem("vigilo-instance", JSON.stringify(Instance.list[arg]));

  }

}

export default Instance;
