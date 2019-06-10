import {request} from './utils';

const SCOPES_URL="https://vigilo-bf7f2.firebaseio.com/citylist.json";
const CATEGORIES_URL="https://vigilo-bf7f2.firebaseio.com/categorieslist.json";

export async function getInstances(){
    
    var scopes = await request(SCOPES_URL);
    scopes["Developpement"] = {
        prod: false,
        scope: "develop",
        api_path: "https://dev-vigilo.alwaysdata.net"
    }
    scopes = Object.entries(scopes).map((item)=>{
        item[1].name = item[0];
        return item[1]
    })
    if (window.location.search.indexOf('beta') == -1){
        scopes = scopes.filter((item)=>item.prod)
    }
    return scopes

}

export function getCategories() {

    return request(CATEGORIES_URL)
        .then((cat) => {
            let toreturn = {}
            for (var i in cat) {
                toreturn[cat[i].catid] = cat[i].catname;
            }
            return toreturn;
        });

};

var pkg= require('../../package.json');
export const VERSION = pkg.name+"-"+pkg.version;
export const VERSION_NUMBER = pkg.version;

export function getInstance(){
    var instance = localStorage.getItem('vigilo-instance');
    if (instance == null){
        return instance
    } else {
        return JSON.parse(instance)
    }
}
async function setInstance(name){
    var instances = await getInstances()
    for (var i in instances){
        if (instances[i].name == name){
            localStorage.setItem('vigilo-instance', JSON.stringify(instances[i]))
            break;
        }
    }
    window.location.reload()
}

window.setInstance = setInstance;
