import i18next from 'i18next';
import M from 'materialize-css';
import localDataManager from './localDataManager';
import * as vigiloconfig from './vigilo-config';

const LANGUAGES = {
    "fr_FR": "🇫🇷 Français",
    "en_US": "🇺🇸🇬🇧 English"
};

export async function init() {
    var data = {};
    var cats = await vigiloconfig.getCategories();
    for (var i in LANGUAGES) {
        data[i] = {
            "translation": require("../i18n/" + i + ".json")
        };
        for (var j in cats){
            if (cats[j].i18n[i] !== undefined){
                data[i].translation["category-name-"+cats[j].id] = cats[j].i18n[i];
            } else {
                data[i].translation["category-name-"+cats[j].id] = cats[j].name;
            }
        }
        $("#modal-i18n .modal-content .collection").append(`<a href="#!" onclick="setLang('${i}')" class="collection-item">${LANGUAGES[i]}</a>`)
    }
    console.log(data)
    i18next.init({
        lng: 'fr_FR',
        debug: true,
        resources: data
    }, function (err, t) {
        update()
    });

    // Check if the modal if defined (as it's not done on /stats-iframe.html)
    if ($("#modal-i18n").length > 0) {
      M.Modal.init($("#modal-i18n"));
      setLang(localDataManager.getLang());
    }
}
function update(){
    $('[data-i18n]').each(function(){
        this.innerHTML = i18next.t($(this).data('i18n'));
    })
    $('[data-i18n-attr]').each(function(){
        var map = $(this).data('i18n-attr');
        for (var i in map) {
            $(this).attr(i, i18next.t(map[i]))
        }
    })
    $('[data-i18n-date]').each(function(){
        var mdate = new Date($(this).data('i18n-date'));
        this.innerHTML = mdate.toLocaleString(i18next.language.split("_")[0]);
    })
}
function setLang(lang) {
    i18next.changeLanguage(lang);
    localDataManager.setLang(lang);
    update()
    M.Modal.getInstance($("#modal-i18n")).close();
}
window.setLang = setLang
