import m from 'mithril';
import M from 'materialize-css';

import template from '../component/pageIssueTemplate';
import issue from '../model/issue';
import instance from '../model/instance';
import issueCard from '../component/issueCard';

var Issue = {
  oninit: issue.fetch,
  oncreate: function(){
    window.addEventListener("scroll", Issue.onscroll);
    Issue.onupdate();
  },
  onupdate: function(){
    if (Issue.cards.length == 0){
      var nb = 30;
      while (nb > 0){
        Issue.addNext();
        nb--;
      }
    } else if (Issue.instanceKey != instance.current.key) {
      Issue.cards = [];
    }
  },
  onremove: function(){
    window.removeEventListener("scroll", Issue.onscroll);
    Issue.onscroll();
  },
  instanceKey: "",
  cards: [],
  addNext: function(){
    if (issue.data[Issue.cards.length] == undefined){
      return;
    }
    Issue.cards.push(m(issueCard, {issue: issue.data[Issue.cards.length]}));
    Issue.instanceKey = instance.current.key;
    m.redraw();
  },
  view: function(vnode){
    return m(template, m(".cards-container", {onscroll: Issue.onscroll}, Issue.cards));
  },
  onscroll: function(){
    if (document.body.offsetHeight - window.scrollY - window.outerHeight < 250){
      Issue.addNext();
    }
  }
}

export default Issue;
window.addNext = Issue.addNext;