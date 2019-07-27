import m from 'mithril';
import navBar from './navBar';
import sideNav from './sideNav';
import zoneModal from './zoneModal';
import issueDetail from './issueDetail';


export default {
  view: function(vnode){
    return m('main', [
      m(navBar),
      m(sideNav),
      m(zoneModal),
      m(issueDetail),
      m("section", vnode.children)
    ]);
  }
}