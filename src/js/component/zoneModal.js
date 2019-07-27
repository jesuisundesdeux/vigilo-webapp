import m from 'mithril';
import instance from '../model/instance';

var modal;
var openning = false;
var click_count = 0;

var zoneModal = {
  open: function () {
    if (modal) {
      modal.open();
    } else {
      // Save request for open
      openning = true;
    }
  },
  setInstance: function (key) {
    instance.current = decodeURIComponent(key);
    modal.close();
  },
  oncreate: function (vnode) {
    modal = M.Modal.init(vnode.dom);
    if (openning) {
      modal.open();
    }
  },
  view: function (vnode) {
    return m(".modal.modal-fixed-footer", [
      m(".modal-content", [
        m("h5", {onclick: zoneModal.clickTitle}, "Zone géographique"),
        m(".collection",
          Object.values(instance.list).map(function (item) {
            return m("a.collection-item" + (instance.current.key == item.key ? ".active" : ""), { key: item.key, href: "/settings/zone/" + item.key, oncreate: m.route.link }, item.key);
          })
        )
      ]),
      m(".modal-footer", m("a.modal-close.waves-effect.waves-light.btn", m("i.material-icons", "close")))
    ]);
  },
  clickTitle: function(){
    click_count++;
    if (click_count == 5){
      instance.beta = !instance.beta;
      click_count=0;
    }
  }
}

export default zoneModal;