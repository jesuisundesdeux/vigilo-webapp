import * as vigiloconfig from './vigilo-config';

function baseUrl(){
    return vigiloconfig.getInstance().url
};


let requests_cache={};
function request(options, nocache){
    nocache = nocache || false;
    if (typeof options == "string"){
        options = {url: options}
    }
    options.method = options.method || "GET";
    options.url = "https://cors-anywhere.herokuapp.com/"+options.url;

    if (!nocache && options.method == "GET" && requests_cache[options.url] !== undefined){
        return Promise.resolve(requests_cache[options.url]);
    } else {
        return (new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open(options.method, options.url);
            xhr.onload = () => resolve(JSON.parse(xhr.responseText));
            xhr.onerror = () => reject(xhr.statusText);
            xhr.send(options.body);
          })).then((response)=>{
            requests_cache[options.url] = response;
            return Promise.resolve(response)
          });
    }
    
};

export function getIssues(options){
    /**
     * - int GET['c'] : (Facultatif) : filtre selon catégorie
     * - int GET['t'] : (Facultatif) : filtre les observations du jour
     * - str GET['scope'] : (Facultatif) : filtre identifiant de la ville
     * - int GET['status'] : (Facultatif) : status de l'observation
     * - int GET['token'] : (Facultatif) : token de l'observation
     * - int GET['count'] : (Facultatif) : nombre d'observations à retourner  
     * - int GET[''offset'] : (Facultatif) : Offset de la liste de resultat (GET['count'] obligatoire)
     */
    options = options || {};
    var url = baseUrl()+"/get_issues.php?"+Object.entries(options).map((kv)=>{
        return kv[0]+"="+encodeURIComponent(kv[1])
    }).join("&")
    
    return new Promise((resolve, reject)=>{
        getCategories()
            .then((cats)=>{
                request(url)
                    .then((obj)=>{
                        resolve(obj.map((item) => {
                            item.lon_float = parseFloat(item.coordinates_lon);
                            item.lat_float = parseFloat(item.coordinates_lat);
                            item.approved_bool = item.approved=="1";
                            item.categorie_str = cats[item.categorie]
                            item.date_obj = new Date(parseInt(item.time)*1000);
                            item.img_thumb = baseUrl()+"/generate_panel.php?s=150&token="+item.token
                            item.img = baseUrl()+"/generate_panel.php?s=400&token="+item.token
                            item.map = baseUrl()+"/maps/"+item.token+"_zoom.jpg"
                            return item
                        }))
                    })
                    .catch(reject)
            })
            .catch(reject);
    });
};

export function getCategories(){

    var url = baseUrl()+"/get_categories_list.php";   
    return request(url)
        .then((cat)=>{
            let toreturn = {}
            for (var i in cat){
                toreturn[cat[i].catid] = cat[i].catname;
            }
            return toreturn;
        });
  
};

export function createIssue(data){
    
}
