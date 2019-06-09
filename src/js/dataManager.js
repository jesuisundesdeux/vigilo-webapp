import * as vigilo from './vigilo-api';
import LocalDataManager from './localDataManager';

class DataManager {
    constructor(){
        this.dow = [];
        this.hour = [];
        this.categories = [];
        this.onlyme = false;
    }
    async getData() {
        var data = await vigilo.getIssues();
        data = data.filter((issue)=>{
            if (this.dow.length >0){
                if (this.days.indexOf(issue.date_obj.getDay()) == -1){
                    return false;
                }
            }
            if (this.hour.length >0){
                if (this.hours.indexOf(issue.date_obj.getHours()) == -1){
                    return false;
                }
            }
            if (this.categories.length >0){
                if (this.categories.indexOf(issue.categorie) == -1){
                    return false;
                }
            }
            if (this.onlyme){
              if (LocalDataManager.getTokenSecretId(issue.token) == undefined){
                return false;
              }
            }
            return true;
        });
        return data;
    }
    setFilter(filters){
      console.log(filters)
        var change = false;
        if (filters.dow && filters.dow != this.dow){
            this.dow = filters.dow;
            this.days = [];
            if (this.dow.indexOf('worked') != -1){
                this.days.push(1,2,3,4,5)
            }
            if (this.dow.indexOf('weekend') != -1){
                this.days.push(6,0)
            }
            change = true;
        }
        if (filters.hour && filters.hour != this.hour){
            this.hour = filters.hour;
            this.hours = [];
            if (this.hour.indexOf('morning') != -1){
                this.hours.push(6,7,8,9,10,11,12);
            }
            if (this.hour.indexOf('afternoon') != -1){
                this.hours.push(13,14,15,16,17,18,19);
            }
            if (this.hour.indexOf('night') != -1){
                this.hours.push(20,21,22,23,0,1,2,3,4,5);
            }
            change = true;
        }
        if (filters.categories && filters.categories != this.categories){
            this.categories = filters.categories;
            change = true;
        }
        if (filters.onlyme !== undefined && filters.onlyme != this.onlyme) {
          this.onlyme = filters.onlyme;
          change = true;
        }
        if (change){
            $(this).trigger('filterchange');
        }
    }
}

export default new DataManager();