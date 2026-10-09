import i18next from 'i18next';
import * as vigiloconfig from './vigilo-config';
import * as map from './issue-map';
import * as list from './issue-list';
import * as filters from './issue-filter';
import * as form from './form';
import * as navs from './navs';
import * as stats from './stats';
import * as admin from './admin';
import * as i18n from './i18n';
import { initTheme } from './theme';
import github_issue from '../html/github_issue';
import M from '@materializecss/materialize';
import { refreshIssueMiniMap } from './issue-minimap';
import { escapeHtml } from './utils';
import { hideSplash, setSplashStatus } from './splash';

import dataManager from './dataManager';
import localDataManager from './localDataManager';

export default class VigiloApp {
    async init() {
        await i18n.init();
        // light / dark theme (side menu item)
        initTheme();

        /**
        * SELECT ZONE MODAL
        */
        var current_instance = vigiloconfig.getInstance() == null ? '' : vigiloconfig.getInstance().name;
        
        let searchParams = new URLSearchParams(window.location.search)

        if (searchParams.has('beta')){
            localDataManager.setBeta();
        }
        else if (searchParams.has('dev')){
            localDataManager.setDev();
        }


        var instances = await vigiloconfig.getInstances();

        instances.forEach((instance) => {
            $(`<a href="#!" class="collection-item${(instance.name == current_instance ? ' active' : '')}">${escapeHtml(instance.name)}</a>`)
                .on('click', () => window.setInstance(instance.name))
                .appendTo("#modal-zone .modal-content .collection");
        })

        if (searchParams.has('instance')){
            if (searchParams.get('instance') != current_instance){
                await window.setInstance(searchParams.get('instance'), true);
            }
        }



        M.Modal.init($("#modal-zone"));
        if (vigiloconfig.getInstance() == null) {
            hideSplash();
            M.Modal.getInstance($("#modal-zone")).open();
            return
        }
        setSplashStatus(i18next.t("loading-issues"));

        /**
         * TITLE
         */
        document.title = "Vigilo – " + vigiloconfig.getInstance().name
        $("nav .brand-logo").append(" " + vigiloconfig.getInstance().name)


        // Admin behaviour
        await admin.init();

        /**
         * SIDENAV
         */
        navs.init();


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

        M.Modal.init($("#modal-issue"), { onOpenEnd: refreshIssueMiniMap });
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

        await filters.init();

        if (searchParams.has('token')){
            await list.viewIssue(searchParams.get('token'))
        }

        await list.displayIssues(30);
        hideSplash();
        await map.displayIssues();

        // Link bug
        $("a[href='https://github.com/jesuisundesdeux/vigilo-webapp/issues/new?template=bug.md']").click(async function(){
            var template = await github_issue();
            $(this).attr('href', 'https://github.com/jesuisundesdeux/vigilo-webapp/issues/new?body='+template)
        })

    }



}
