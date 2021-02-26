import i18next from 'i18next';
import M from 'materialize-css';
import localDataManager from './localDataManager';

const LANGUAGES = {
    "fr_FR": "Français",
    "en_US": "English"
};

export function init() {
    var data = {};
    for (var i in LANGUAGES) {
        data[i] = {
            "translation": require("../i18n/" + i + ".json")
        };
        $("#modal-i18n .modal-content .collection").append(`<a href="#!" onclick="setLang('${i}')" class="collection-item">${LANGUAGES[i]}</a>`)
    }
    i18next.init({
        lng: 'fr_FR',
        debug: true,
        resources: data
    }, function (err, t) {
        update()
    });
    M.Modal.init($("#modal-i18n"));
    setLang(localDataManager.getLang());
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
}
function setLang(lang) {
    i18next.changeLanguage(lang);
    localDataManager.setLang(lang);
    update()
    M.Modal.getInstance($("#modal-i18n")).close();
}
window.setLang = setLang