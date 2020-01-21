import * as vigilo from './vigilo-api';
import LocalDataManager from './localDataManager';

class DataManager {
  constructor() {
    let parsedUrl = new URL(window.location.href);

    this.dow = [];
    this.hour = [];
    this.categories = [];
    this.status = [];
    this.age = 0;
    this.onlyme = false;
    this.cities = [];
    this.comment = parsedUrl.searchParams.get("comment") || ""; //HTML get parameter to share URL
  }
  async getData() {
    var data = await vigilo.getIssues();
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
        if (this.cities.indexOf(issue.cityname.toLowerCase()) == -1) {
          return false;
        }
      }
      if (this.onlyme) {
        if (LocalDataManager.getTokenSecretId(issue.token) == undefined) {
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
      if (this.comment != ""){
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
