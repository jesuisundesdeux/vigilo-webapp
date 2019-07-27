import m from 'mithril';

import instance from './instance';

var Issue = {
  _data: {},
  _bykey: {},

  fetch: function () {
    if (instance.current.key === undefined){
      return;
    }
    if (Issue._data[instance.current.key] === undefined) {
      Issue._data[instance.current.key] = {};
      Issue._bykey[instance.current.key] = {};
      return m.request({
        method: "GET",
        url: instance.current.api_path + "/get_issues.php?scope=" + instance.current.scope,
      }).then(function (items) {
        for (var i in items){
          items[i].zone = instance.current.key;
          items[i].date = new Date(parseInt(items[i].time) * 1000);
          Issue._bykey[instance.current.key][items[i].token] = items[i];
        }
        Issue._data[instance.current.key] = items;
      })
    }
  },

  get data(){
    if (Issue._data[instance.current.key] === undefined) {
      Issue.fetch();
    }
    return Issue._data[instance.current.key] || [];
  },
  byToken: function(token){
    try {
      return Issue._bykey[instance.current.key][token];
    } catch (e){}
  }

}

export default Issue;
