import m from 'mithril';
import M from 'materialize-css';

import template from '../component/pageIssueTemplate';
import scope from '../model/scope';

export default {
  oninit: scope.fetch,
  oncreate: function(vnode){
  },
  view: function(vnode){
    return m(template, [
      m("h1", "issue map"),
      m("a[href=/issue/detail/32]",{oncreate: m.route.link}, "Instance " + scope.data.display_name)
    ]);
  }
}
