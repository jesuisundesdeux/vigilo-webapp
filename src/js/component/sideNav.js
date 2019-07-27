import m from 'mithril';
import M from 'materialize-css';

import instance from '../model/instance';

import imgPisteCycl from '../../img/pistes-cyclables.jpeg';
import imgVigilo from '../../img/vigilo.png';
const VERSION = require('../../../package.json').version;

var inst;

function close() {
  inst.close();
}

export default {
  oncreate: function (vnode) {
    var elems = document.querySelectorAll('.sidenav');
    inst = M.Sidenav.init(elems)[0];
  },
  view: function () {
    return m("ul.sidenav#sidenav", [
      m("li", [
        m(".user-view", [
          m(".background", [
            m("img[src=" + imgPisteCycl + "]")
          ]),
          m("img.circle[src=" + imgVigilo + "]"),
          m("a.white-text[href='https://vigilo.city'][target=_blank]", [
            m("i.material-icons.tiny", "open_in_new"),
            " https://vigilo.city"
          ]),
        ])
      ]),
      m("li", m("a.waves-effect.grey-text[href=/"+instance.current.key+"/issue/list]", { oncreate: m.route.link, onclick: close }, [m("i.material-icons", "directions_bike"), "Les signalements"])),
      m("li", m("a.waves-effect.grey-text[href=/stats]", { oncreate: m.route.link, onclick: close }, [m("i.material-icons", "pie_chart"), "Statistiques"])),
      m("li", m("a.waves-effect.grey-text[href=/settings/zone]", { oncreate: m.route.link, onclick: close }, [m("i.material-icons", "settings"), "Zone géographique"])),
      m("li", m(".divider")),
      m("li", m("a.waves-effect.grey-text[href=https://www.jesuisundesdeux.org][target=_blank]", { onclick: close }, [m("i.material-icons", "open_in_new"), "#JeSuisUnDesDeux"])),
      m("li", m("a.waves-effect.grey-text[href=https://github.com/jesuisundesdeux/vigilo-webapp/issues/new?template=bug.md][target=_blank]", { onclick: close }, [m("i.material-icons", "bug_report"), "Signaler un bug"])),
      
      m("li.center-align#version", m("a.grey-text[href=https://github.com/jesuisundesdeux/vigilo-webapp/releases/tag/v"+VERSION+"][target=_blank]", "Version : "+VERSION))
    ]);
  }
}

/*
  <li id="version" class="center-align"><a
      href="https://github.com/jesuisundesdeux/vigilo-webapp/releases/tag/v${require('../../package.json').version}"
      target="_blank" class="grey-text">Version : ${require('../../package.json').version}</a></li>
*/