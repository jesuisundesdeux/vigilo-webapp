import {request} from './utils';
import localDataManager from './localDataManager';

const SCOPES_URL="https://vigilo-bf7f2.firebaseio.com/citylist.json";
const CATEGORIES_URL="https://vigilo-bf7f2.firebaseio.com/categorieslist.json";
const RESOLVABLE_CATEGORIES=[3,4,5,6,8,100,50,51]

export async function getInstances(all){
    
    var scopes = await request(SCOPES_URL);
    scopes = Object.entries(scopes).map((item)=>{
        item[1].name = item[0];
        return item[1]
    })

    
    if (!localDataManager.isBeta() && all == undefined){
        scopes = scopes.filter((item)=>item.prod)
    }
    return scopes

}

export function getCategories() {

    return request(CATEGORIES_URL)
        .then((cat) => {
            let toreturn = {}
            for (var i in cat) {
                if (cat[i].catdisable !== true) {
                   cat[i].catdisable = false;
                }
                cat[i].i18n = [];
                for (var j in cat[i]) {
                    if (j.startsWith("catname_")){
                        cat[i].i18n[j.replace("catname_", "")] = cat[i][j];
                    }
                }
                toreturn[cat[i].catid] = {
                    id: cat[i].catid,
                    name: cat[i].catname,
                    i18n: cat [i].i18n,
                    color: cat[i].catcolor,
                    disable: cat[i].catdisable,
                    resolvable: RESOLVABLE_CATEGORIES.includes(cat[i].catid),
                };
            }
            return toreturn;
        });

};

var pkg= require('../../package.json');
export const VERSION = pkg.name+"-"+pkg.version;
export const VERSION_NUMBER = pkg.version;

export const IMAGE_MAX_SIZE=1500;

export function getInstance(){
    var instance = localStorage.getItem('vigilo-instance');
    if (instance == null){
        return instance
    } else {
        return JSON.parse(instance)
    }
}
async function setInstance(name, noreload){
    var instances = await getInstances(true)
    for (var i in instances){
        if (instances[i].name == name){
            localStorage.setItem('vigilo-instance', JSON.stringify(instances[i]))
            break;
        }
    }
    if (noreload !== true){
        let searchParams = new URLSearchParams(window.location.search)
        if (searchParams.has('instance')){
            searchParams.delete('instance');
            window.location.search = '?' + searchParams.toString();
        } else {
            window.location.reload()
        }
        
    }
}

window.setInstance = setInstance;
