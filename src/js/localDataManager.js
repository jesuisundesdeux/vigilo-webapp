
class LocalDataManager {
  constructor(){
    this.load()
  }
  load(){
    this._data = {
      tokens: {}
    };
    
    try {
      var loaded = localStorage.getItem("vigilo-localdata");
      if (loaded != null) {
        this._data = JSON.parse(loaded);
      }
    } catch (e) {

    }
  }

  save(){
    localStorage.setItem("vigilo-localdata", JSON.stringify(this._data));
  }

  /**
   * Store current version in local storage. If new, return true.
   * @param {string} version 
   */
  setVersion(version){
    var loaded = localStorage.getItem("vigilo-version");
    localStorage.setItem("vigilo-version", version);
    return version != loaded;
  }

  getTokenSecretId(token){
    return this._data.tokens[token];
  }
  setTokenSecretId(token, secretId){
    this._data.tokens[token] = secretId;
    this.save()
  }
}
export default new LocalDataManager();