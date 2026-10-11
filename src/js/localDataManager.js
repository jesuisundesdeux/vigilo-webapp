
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

  getLang(lang){
    return this._data.lang;
  }
  setLang(lang, secretId){
    this._data.lang = lang;
    this.save()
  }

  // Current instance name (read here: vigilo-config imports this module)
  instanceName(){
    try {
      var instance = JSON.parse(localStorage.getItem("vigilo-instance"));
      return instance && instance.name ? instance.name : "";
    } catch (e) {
      return "";
    }
  }

  /**
   * Moderator key of the current instance: one can moderate several instances, each with
   * its own key. The former single key (adminKey) goes to the instance where it is first read.
   */
  getModeratorKey(){
    var keys = this._data.moderatorKeys || {};
    var name = this.instanceName();
    if (keys[name] === undefined && this._data.adminKey) {
      this.setModeratorKey(this._data.adminKey);
      delete this._data.adminKey;
      this.save();
      keys = this._data.moderatorKeys;
    }
    return keys[name] || "";
  }
  setModeratorKey(key){
    this._data.moderatorKeys = this._data.moderatorKeys || {};
    if (key) {
      this._data.moderatorKeys[this.instanceName()] = key;
    } else {
      delete this._data.moderatorKeys[this.instanceName()];
      this.setModerationOff(false);
    }
    this.save();
  }

  // Moderation mode turned off on this instance (the key is kept)
  isModerationOff(){
    return !!(this._data.moderationOff || {})[this.instanceName()];
  }
  setModerationOff(off){
    this._data.moderationOff = this._data.moderationOff || {};
    if (off) {
      this._data.moderationOff[this.instanceName()] = true;
    } else {
      delete this._data.moderationOff[this.instanceName()];
    }
    this.save();
  }

  // Key to send to the backend: none when the moderation mode is off
  activeModeratorKey(){
    return this.isModerationOff() ? "" : this.getModeratorKey();
  }

  // Moderator on this instance: key accepted by the backend and mode on (set by moderator.js)
  setModerator(moderator){
    this._moderator = moderator;
  }
  isModerator(){
    return this._moderator === true;
  }

  setBeta(){
    sessionStorage.setItem("vigilo-beta", true)
  }

  isBeta(){
    return sessionStorage.getItem("vigilo-beta") === "true"
  }

  setDev(){
    sessionStorage.setItem("vigilo-dev", true)
  }

  isDev(){
    return sessionStorage.getItem("vigilo-dev") === "true"
  }
  userCanEdit(issue){
    return this.getTokenSecretId(issue.token) != undefined && issue.approved == "0"
  }
}
export default new LocalDataManager();
