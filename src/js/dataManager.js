import * as vigilo from './vigilo-api';
import localDataManager from './localDataManager';
import * as vigiloconfig from './vigilo-config';
import Dexie from 'dexie';

function baseUrl() {
  return decodeURIComponent(vigiloconfig.getInstance().api_path)
};
var staticDB = undefined;
class DataManager {
  constructor() {
    let parsedUrl = new URL(window.location.href);
    this._data = [];
    this.dow = [];
    this.hour = [];
    this.categories = [];
    this.status = [];
    this.age = 0;
    this.onlyme = false;
    this.cities = [];
    this.comment = parsedUrl.searchParams.get("comment") || ""; //HTML get parameter to share URL

  }
  loadData(fromdate) {
    return vigilo.getIssues({
      "t": fromdate
    });
  }
  getDB() {
    if (staticDB === undefined) {
      staticDB = new Dexie('MyDatabase');
      // Declare tables, IDs and indexes
      staticDB.version(1).stores({
        issues: '++id,scope'
      });
    }
    return staticDB.issues;
  }
  async loadCachedData() {
    try {
      this._data = await this.getDB().where("scope").equalsIgnoreCase(vigiloconfig.getInstance().scope).toArray();
      console.log("Load cached data: " + this._data.length);
    } catch (e) {
      console.log(e)
    }
  }
  async countCachedData() {
    try {
      return await this.getDB().count();
    } catch (e) {
      return -1;
    }
  }
  async cleanCachedData() {
    try {
      await this.getDB().clear();
    } catch (e) {
      console.log(e)
    }
  }
  async saveCachedData() {
    try {
      this.cleanCachedData();
      await this.getDB().bulkAdd(this._data);
      console.log("Save cached data: " + this._data.length);
    } catch (e) {
      console.log(e)
    }
  }
  async getAllData() {
    if (this._data.length == 0) {
      await this.loadCachedData();
      var cats = await vigiloconfig.getCategories();
      var maxtime = this._data.reduce((acc, cur) => (cur.time > acc ? cur.time : acc), 0);
      var scope = vigiloconfig.getInstance().scope
      var newdata = (await this.loadData(maxtime)).map((item) => {
        item.scope = scope;
        item.lon_float = parseFloat(item.coordinates_lon);
        item.lat_float = parseFloat(item.coordinates_lat);
        item.status = parseInt(item.status);
        item.approved = parseInt(item.approved);
        item.categorie_str = cats[item.categorie].name;
        item.color = cats[item.categorie].color;
        item.resolvable = cats[item.categorie].resolvable;
        item.date_obj = new Date(parseInt(item.time) * 1000);
        item.mosaic = baseUrl() + "/mosaic.php?t=" + item.token;
        item.img_thumb = baseUrl() + "/generate_panel.php?s=150&token=" + item.token;
        item.img = baseUrl() + "/generate_panel.php?s=800&token=" + item.token;
        if (localDataManager.isAdmin() && item.approved == 0) {
          item.img = baseUrl() + "/get_photo.php?token=" + item.token + "&key=" + localDataManager.getAdminKey();
        }
        item.map = baseUrl() + "/maps/" + item.token + "_zoom.jpg"
        item.permLink = window.location.protocol + "//" + window.location.host + "/?token=" + item.token + "&instance=" + encodeURIComponent(vigiloconfig.getInstance().name);
        return item
      });
      console.log("Load new data: " + newdata.length);
      this._data = newdata.concat(this._data).sort((a, b) => b.time - a.time);

      this.saveCachedData();
    }
    return this._data;
  }
  async getData() {
    var data = await this.getAllData();
    var date_now = Date.now();
    data = data.filter((issue) => {
      if (this.dow.length > 0) {
        if (this.days.indexOf(issue.date_obj.getDay()) == -1) {
          return false;
        }
      }
      if (this.hour.length > 0) {
        if (this.hours.indexOf(issue.date_obj.getHours()) == -1) {
          return false;
        }
      }
      if (this.categories.length > 0) {
        if (this.categories.indexOf(issue.categorie) == -1) {
          return false;
        }
      }
      if (this.cities.length > 0) {
        if (issue.cityname == undefined) {
          return false;
        }
        if (this.cities.indexOf(issue.cityname.toLowerCase()) == -1) {
          return false;
        }
      }
      if (this.onlyme) {
        if (localDataManager.getTokenSecretId(issue.token) == undefined) {
          return false;
        }
      }
      if (this.status.length > 0) {
        var issue_status = "unknow";
        if (issue.approved == 0) {
          issue_status = "unapproved"
        } else if (issue.approved == 1 && issue.status == 0) {
          issue_status = "unresolved"
        } else if (issue.approved == 1 && issue.status == 2) {
          issue_status = "taked"
        } else if (issue.approved == 1 && issue.status == 3) {
          issue_status = "inprogress"
        } else if (issue.approved == 1 && issue.status == 4) {
          issue_status = "done"
        } else if (issue.approved == 1 && issue.status == 1) {
          issue_status = "resolved"
        }
        if (this.status.indexOf(issue_status) == -1) {
          return false;
        }
      }
      if (this.comment != "") {
        return issue.comment.indexOf(this.comment) != -1;
      }

      if (this.age != 0) {
        var issue_age = (date_now - issue.date_obj) / (1000 * 60 * 60 * 24);
        if (issue_age > this.age) {
          return false;
        }
      }
      return true;
    });
    return data;
  }
  setFilter(filters) {
    var change = false;
    if (filters.dow && filters.dow != this.dow) {
      this.dow = filters.dow;
      this.days = [];
      if (this.dow.indexOf('worked') != -1) {
        this.days.push(1, 2, 3, 4, 5)
      }
      if (this.dow.indexOf('weekend') != -1) {
        this.days.push(6, 0)
      }
      change = true;
    }
    if (filters.hour && filters.hour != this.hour) {
      this.hour = filters.hour;
      this.hours = [];
      if (this.hour.indexOf('morning') != -1) {
        this.hours.push(6, 7, 8, 9, 10, 11, 12);
      }
      if (this.hour.indexOf('afternoon') != -1) {
        this.hours.push(13, 14, 15, 16, 17, 18, 19);
      }
      if (this.hour.indexOf('night') != -1) {
        this.hours.push(20, 21, 22, 23, 0, 1, 2, 3, 4, 5);
      }
      change = true;
    }
    if (filters.categories !== undefined && filters.categories != this.categories) {
      this.categories = filters.categories;
      change = true;
    }
    if (filters.status !== undefined && filters.status != this.status) {
      this.status = filters.status;
      change = true;
    }
    if (filters.age !== undefined && filters.age != this.age) {
      this.age = filters.age;
      change = true;
    }
    if (filters.onlyme !== undefined && filters.onlyme != this.onlyme) {
      this.onlyme = filters.onlyme;
      change = true;
    }
    if (filters.cities !== undefined && filters.cities != this.cities) {
      this.cities = filters.cities.map(i => i.toLowerCase());
      change = true;
    }

    if (filters.comment !== undefined && filters.comment != this.comment) {
      this.comment = filters.comment;
      change = true;
    }

    if (change) {
      $(this).trigger('filterchange');
    }
  }
}

export default new DataManager();