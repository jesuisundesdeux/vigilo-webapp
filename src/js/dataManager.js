import * as vigilo from './vigilo-api';
import LocalDataManager from './localDataManager';

const DAYS = {
  worked: [1, 2, 3, 4, 5],
  weekend: [6, 0],
};
const HOURS = {
  morning: [6, 7, 8, 9, 10, 11, 12],
  afternoon: [13, 14, 15, 16, 17, 18, 19],
  night: [20, 21, 22, 23, 0, 1, 2, 3, 4, 5],
};

/**
 * Oldest date of a period ("1d", "7d", "1m", "6m", "1y", "2y"...), or null for "all".
 * Months and years are calendar ones (same day of the month).
 */
export function periodStart(period, now) {
  var m = /^(\d+)([dmy])$/.exec(String(period || ""));
  if (!m) {
    return null;
  }
  var n = parseInt(m[1]);
  var start = new Date(now === undefined ? Date.now() : now);
  if (m[2] == "d") {
    start.setTime(start.getTime() - n * 24 * 60 * 60 * 1000);
  } else if (m[2] == "m") {
    start.setMonth(start.getMonth() - n);
  } else {
    start.setFullYear(start.getFullYear() - n);
  }
  return start;
}

export function issueStatus(issue) {
  if (issue.approved == 0) {
    return "unapproved";
  } else if (issue.approved == 1 && issue.status == 0) {
    return "unresolved";
  } else if (issue.approved == 1 && issue.status == 2) {
    return "taked";
  } else if (issue.approved == 1 && issue.status == 3) {
    return "inprogress";
  } else if (issue.approved == 1 && issue.status == 4) {
    return "done";
  } else if (issue.approved == 1 && issue.status == 1) {
    return "resolved";
  }
  return "unknow";
}

function expand(values, map) {
  var out = [];
  values.forEach((v) => { out = out.concat(map[v] || []); });
  return out;
}

/**
 * Issues matching the filters ({dow, hour, categories, status, age, onlyme, cities, comment}).
 * An empty list means "no filtering" for the list filters.
 */
export function filterIssues(issues, filters) {
  var days = expand(filters.dow || [], DAYS);
  var hours = expand(filters.hour || [], HOURS);
  var cities = (filters.cities || []).map(i => i.toLowerCase());
  var comment = (filters.comment || "").toLowerCase();
  var start = periodStart(filters.age);
  return issues.filter((issue) => {
    if ((filters.dow || []).length > 0 && days.indexOf(issue.date_obj.getDay()) == -1) {
      return false;
    }
    if ((filters.hour || []).length > 0 && hours.indexOf(issue.date_obj.getHours()) == -1) {
      return false;
    }
    if ((filters.categories || []).length > 0 && filters.categories.indexOf(String(issue.categorie)) == -1) {
      return false;
    }
    if (cities.length > 0 && (issue.cityname == undefined || cities.indexOf(issue.cityname.toLowerCase()) == -1)) {
      return false;
    }
    if (filters.onlyme && LocalDataManager.getTokenSecretId(issue.token) == undefined) {
      return false;
    }
    if ((filters.status || []).length > 0 && filters.status.indexOf(issueStatus(issue)) == -1) {
      return false;
    }
    if (comment != "" && (issue.comment || "").toLowerCase().indexOf(comment) == -1) {
      return false;
    }
    if (start !== null && issue.date_obj < start) {
      return false;
    }
    return true;
  });
}

const KEYS = ['dow', 'hour', 'categories', 'status', 'age', 'onlyme', 'cities', 'comment'];

class DataManager {
  constructor() {
    let parsedUrl = new URL(window.location.href);

    this.dow = [];
    this.hour = [];
    this.categories = [];
    this.status = [];
    this.age = "all";
    this.onlyme = false;
    this.cities = [];
    this.comment = parsedUrl.searchParams.get("comment") || ""; //HTML get parameter to share URL
  }
  filters() {
    var out = {};
    KEYS.forEach((k) => { out[k] = this[k]; });
    return out;
  }
  async getData() {
    var data = await vigilo.getIssues();
    return filterIssues(data, this.filters());
  }
  setFilter(filters) {
    var change = false;
    KEYS.forEach((k) => {
      if (filters[k] !== undefined && JSON.stringify(filters[k]) != JSON.stringify(this[k])) {
        this[k] = filters[k];
        change = true;
      }
    });
    if (change) {
      $(this).trigger('filterchange');
    }
  }
}

export default new DataManager();
