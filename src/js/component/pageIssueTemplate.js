import m from 'mithril';
import M from 'materialize-css';
import pageTemplate from './pageTemplate';
import instance from '../model/instance';

export default {
  view: function (vnode) {
    return m(pageTemplate,
      m(".row", [
        m("ul.tabs",
          [
            m("li.tab.col.s6", m("a" + (m.route.get().indexOf("/issue/list") != -1 ? ".active" : "") + "[href=/"+instance.current.key+"/issue/list]", { oncreate: m.route.link }, "Liste")),
            m("li.tab.col.s6", m("a" + (m.route.get().indexOf("/issue/map") != -1 ? ".active" : "") + "[href=/"+instance.current.key+"/issue/map]", { oncreate: m.route.link }, "Carte")),
          ]
        ),
        m(".col.s12", vnode.children)
      ])
    );
  }
}
