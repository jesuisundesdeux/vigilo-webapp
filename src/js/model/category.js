const CATEGORIES_URL = "https://vigilo-bf7f2.firebaseio.com/categorieslist.json";

import m from 'mithril';

var Category = {
  list: [],
  idToString: {},

  fetchlist: function () {
    return m.request({
      method: "GET",
      url: CATEGORIES_URL,
    }).then(function (items) {
      Category.list = items;
      for (var i in items){
        Category.idToString[items[i].catid] = items[i].catname;
      }
    })
  },

}

export default Category;
