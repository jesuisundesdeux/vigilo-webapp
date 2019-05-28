import * as vigiloconfig from './vigilo-config';
import * as map from './issue-map';
import * as list from './issue-list';
import * as filters from './issue-filter';
import * as form from './form';
import * as stats from './stats';
import M from 'materialize-css';

import dataManager from './dataManager';

export default class VigiloApp {
    async init() {
        $("#version a").append(vigiloconfig.VERSION_NUMBER);

        
        /**
        * SELECT ZONE MODAL
        */
        var current_instance = vigiloconfig.getInstance() == null ? '' : vigiloconfig.getInstance().name;
        var instances = await vigiloconfig.getInstances();
        for (var i in instances) {
            $("#modal-zone .modal-content .collection").append(`<a href="#!" onclick="setInstance('${instances[i].name}')" class="collection-item${(instances[i].name == current_instance ? ' active' : '')}">${instances[i].name}</a>`)
        }

        M.Modal.init($("#modal-zone"));
        if (vigiloconfig.getInstance() == null) {
            M.Modal.getInstance($("#modal-zone")).open();
            return
        }

        /**
         * TITLE
         */
        $("title").append(" " + vigiloconfig.getInstance().name)
        $("nav .brand-logo").append(" " + vigiloconfig.getInstance().name)



        /**
         * SIDENAV
         */
        M.Sidenav.init($("#mobile-menu"));
        M.Tabs.init($("#mobile-menu .tabs"), {
            onShow: function () {
                M.Sidenav.getInstance($("#mobile-menu")).close()
            }
        });

        /**
         * ISSUE FORM
         */
        form.init();
        stats.init()

        /**
         * ISSUES LIST AND MAP
         */
        M.Tabs.init($("#issues .tabs"));
        M.Tabs.getInstance($("#issues .tabs")).options.onShow = function () { map.focus() }
        await map.init()
        M.Modal.init($("#modal-issue"));
        $(window).scroll(() => {
            if (($(window.document.body).height() - $(window).height() - $(window).scrollTop()) < 10) {
                list.displayIssues(30)
            }
        })
        M.FloatingActionButton.init($('.fixed-action-btn'));

        
        $(dataManager).on('filterchange',async ()=>{
            list.cleanIssues();
            map.cleanIssues();
            await list.displayIssues(30)
            await map.displayIssues(true) 
        })
        
        filters.init();

        await list.displayIssues(30)
        await map.displayIssues()
    }



}
