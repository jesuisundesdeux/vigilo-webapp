import m from 'mithril';
import navBar from './navBar';

export default {
  view: function(){
    return m('main', [
      m(navBar)
    ]);
  }
}