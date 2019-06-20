import m from 'mithril';

export default {
  view: function(){
    return m(".navbar-fixed", [
      m("nav.nav-extended.yellow.darken-1",
        m(".nav-wrapper",[
          m("a.brand-logo.center.black-text[href=#]", "Vǐgǐlo"),
          m("a.show-on-medium-and-up.black-text.sidenav-trigger",
            m("i.material-icons", "menu")
          )
        ])
      ),
      m(".nav-content")
    ]);
  }
}

/*
<div class="navbar-fixed">
  <nav class="nav-extended yellow darken-1">
    <div class="nav-wrapper">
      <a href="#modal-zone" class="brand-logo center black-text modal-trigger">Vǐgǐlo</a>
      <a href="#" data-target="mobile-menu" class="sidenav-trigger show-on-medium-and-up black-text"><i
          class="material-icons">menu</i></a>
    </div>
    <div class="nav-content">
    </div>
  </nav>
</div>
 */