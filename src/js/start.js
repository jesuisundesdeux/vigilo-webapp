import m from 'mithril';

import * as Utils from './utils';
import instance from './model/instance';
import category from './model/category';

import routing from './routing';

export default {
  loading_item: "",

  oninit: function(vnode){
    vnode.state.loading_item = "de la liste des serveurs";
    instance.fetchlist().then(function(){
      vnode.state.loading_item = "des catégories"
      return category.fetchlist()
    }).then(function(){
      routing();
    })
  },

  view: function(vnode){
    return m(".splash.yellow.darken-1",[
      m("h1","Vǐgǐlo"),
      m(".preloader-wrapper.active.big",
        m(".spinner-layer.spinner-red-only",[
          m(".circle-clipper.left",m(".circle")),
          m(".gap-patch", m(".circle")),
          m(".circle-clipper.right",m(".circle")),
        ])
      ),
      m(".grey-text#loading-message", "Chargement..." + vnode.state.loading_item + "...")
    ]);
  }

}
