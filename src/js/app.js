import i18next from 'i18next';
import * as vigiloconfig from './vigilo-config';
import * as map from './issue-map';
import * as list from './issue-list';
import * as filters from './issue-filter';
import * as form from './form';
import { initPhotoDrafts } from './photo-drafts';
import * as navs from './navs';
import * as stats from './stats';
import * as moderator from './moderator';
import * as banner from './banner';
import * as i18n from './i18n';
import { initTheme } from './theme';
import github_issue from '../html/github_issue';
import M from '@materializecss/materialize';
import { refreshIssueMiniMap } from './issue-minimap';
import { escapeHtml } from './utils';
import { addModalCrosses, initModalScrollbarInset } from './modal-cross';
import { hideSplash, setSplashStatus } from './splash';

import dataManager from './dataManager';
import localDataManager from './localDataManager';

/*
 * "Instance personnalisée": instance not listed in vigilo-conf (address of its API and scope),
 * checked with get_scope.php then kept in this browser (vigiloconfig.addCustomInstance()).
 */
function initCustomInstanceForm() {
    var form = $("#custom-instance-form");
    var error = form.find(".custom-instance-error");
    $(`<a href="#!" class="collection-item custom-instance-toggle"><i class="material-icons left">add</i>${escapeHtml(i18next.t('custom-instance-choose'))}</a>`)
        .on('click', (e) => {
            e.preventDefault();
            form.removeClass('hide');
            form.find('#custom-instance-url').trigger('focus');
        })
        .appendTo("#modal-zone .modal-content .collection");
    form.on('submit', async (e) => {
        e.preventDefault();
        var button = form.find('button[type="submit"]').prop('disabled', true);
        error.addClass('hide').text('');
        try {
            var instance = await vigiloconfig.addCustomInstance(form.find('#custom-instance-url').val(),
                form.find('#custom-instance-scope').val(), form.find('#custom-instance-name').val());
            await window.setInstance(instance.name);
        } catch (err) {
            error.text(i18next.t(err.message)).removeClass('hide');
            button.prop('disabled', false);
        }
    });
}

export default class VigiloApp {
    async init() {
        // before the categories (i18n), which may come from the configuration
        await vigiloconfig.loadAppConfig();
        await i18n.init();
        addModalCrosses();
        initModalScrollbarInset();
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
            var item = $(`<a href="#!" class="collection-item${(instance.name == current_instance ? ' active' : '')}">${escapeHtml(instance.name)}</a>`)
                .on('click', () => window.setInstance(instance.name))
                .appendTo("#modal-zone .modal-content .collection");
            if (instance.custom) {
                // Added in this browser: its address, and a button to remove it
                item.addClass('custom-instance-item').empty()
                    .append($('<span class="custom-instance-text"></span>').text(instance.name)
                        .append($('<span class="custom-instance-url"></span>').text(instance.api_path)))
                    .append($(`<span class="custom-instance-remove" role="button" tabindex="0"
                        title="${escapeHtml(i18next.t('custom-instance-remove'))}" aria-label="${escapeHtml(i18next.t('custom-instance-remove'))}"><i class="material-icons">delete</i></span>`)
                        .on('click keydown', (e) => {
                            if (e.type == 'keydown' && e.key != 'Enter' && e.key != ' ') { return; }
                            e.preventDefault();
                            e.stopPropagation();
                            if (!confirm(i18next.t('custom-instance-remove-confirm', { name: instance.name }))) { return; }
                            vigiloconfig.removeCustomInstance(instance.name);
                            if (instance.name == current_instance) {
                                window.location.reload();
                            } else {
                                item.remove();
                            }
                        }));
            }
        })
        if (!vigiloconfig.isClosed()) {
            initCustomInstanceForm();
        }

        if (searchParams.has('instance')){
            if (searchParams.get('instance') != current_instance){
                await window.setInstance(searchParams.get('instance'), true);
            }
        }

        if (vigiloconfig.isClosed()) {
            // Closed set of instances: forget a territory that is no longer listed, pick the only one
            var chosen = vigiloconfig.getInstance();
            if (chosen != null && !instances.some((instance) => instance.name == chosen.name)) {
                localStorage.removeItem('vigilo-instance');
            }
            if (vigiloconfig.getInstance() == null && instances.length == 1) {
                await window.setInstance(instances[0].name, true);
            }
            if (instances.length == 0) {
                $("#modal-zone .zone-empty").removeClass("hide");
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


        // Moderator of this instance
        await moderator.init();

        // Banner (announcement) configured in the admin
        await banner.init();

        /**
         * SIDENAV
         */
        navs.init();


        /**
         * ISSUE FORM
         */
        form.init();
        initPhotoDrafts();
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
