import * as vigiloconfig from './vigilo-config';
import * as map from './issue-map';
import * as list from './issue-list';
import * as filters from './issue-filter';
import * as form from './form';
import * as navs from './navs';
import * as stats from './stats';
import * as admin from './admin';
import github_issue from '../html/github_issue';
import M from 'materialize-css';

import dataManager from './dataManager';
import localDataManager from './localDataManager';

export default class VigiloApp {
    async init() {

        
        /**
        * SELECT ZONE MODAL
        */
        var current_instance = vigiloconfig.getInstance() == null ? '' : vigiloconfig.getInstance().name;
        
        let searchParams = new URLSearchParams(window.location.search)

        if (searchParams.has('beta')){
            localDataManager.setBeta();
        }

        var instances = await vigiloconfig.getInstances();

        for (var i in instances) {
            $("#modal-zone .modal-content .collection").append(`<a href="#!" onclick="setInstance('${instances[i].name.replace('\'', '\\\'')}')" class="collection-item${(instances[i].name == current_instance ? ' active' : '')}">${instances[i].name}</a>`)
        }

        if (searchParams.has('instance')){
            if (searchParams.get('instance') != current_instance){
                await window.setInstance(searchParams.get('instance'), true);
            }
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


        // Admin behaviour
        await admin.init();

        /**
         * SIDENAV
         */
        navs.init();

        await dataManager.getAllData()

        /**
         * ISSUE FORM
         */
        form.init();
        

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

        

        if (searchParams.has('token')){
            await list.viewIssue(searchParams.get('token'))
        }

        list.displayIssues(30);
        map.displayIssues();


        stats.init()
        filters.init();

        // Link bug
        var template = await github_issue();
        $("a[href='https://github.com/jesuisundesdeux/vigilo-webapp/issues/new?template=bug.md']")
            .attr('href', 'https://github.com/jesuisundesdeux/vigilo-webapp/issues/new?body='+template)

        /**
         * DATA MODAL
         */
        // Delete Cache
        $("#delete-cached-data").click(async function(){
            await dataManager.cleanCachedData();
            window.location.reload();
        })
        $("#delete-cached-data").append('('+(await dataManager.countCachedData())+')')

    }



}
