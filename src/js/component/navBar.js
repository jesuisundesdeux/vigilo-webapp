import m from 'mithril';

import scope from '../model/scope';

export default {
  view: function(){
    return m(".navbar-fixed", [
      m("nav.nav-extended",
        m(".nav-wrapper",[
          m("a.brand-logo.center.black-text[href=/settings/zone]", {oncreate: m.route.link}, "Vǐgǐlo " + (scope.data.display_name || '')),
          m("a.show-on-medium-and-up.black-text.sidenav-trigger[data-target=sidenav]",
            m("i.material-icons", "menu")
          )
        ])
      ),
      m(".nav-content")
    ]);
  }
}