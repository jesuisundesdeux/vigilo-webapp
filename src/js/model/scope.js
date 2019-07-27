import m from 'mithril';
import instance from './instance';

var Scope = {
  _data: {},

  fetch: function () {
    if (instance.current.key === undefined){
      return;
    }
    if (Scope._data == undefined || instance.current.scope != Scope._data.scope) {
      return m.request({
        method: "GET",
        url: instance.current.api_path + "/get_scope.php?scope=" + instance.current.scope,
      }).then(function (items) {
        items.scope = instance.current.scope;
        Scope._data = items;
      })
    }
  },

  get data(){
    if (Scope._data == undefined || instance.current.scope != Scope._data.scope) {
      Scope.fetch();
    }
    return Scope._data;
  }

}

export default Scope;
