import 'leaflet';

const CircleMarkerDynamic = L.CircleMarker.extend({
    initialize: function(latlng, options){
        L.CircleMarker.prototype.initialize.call(this, latlng, options);
        this.styles = {};
        for (var i in this.options.styles){
            if (i.split('-').length == 1) {
                // simple level
                this.styles[parseInt(i)] = this.options.styles[i];
            } else {
                // range
                for (var ind = parseInt(i.split('-')[0]); ind <= parseInt(i.split('-')[1]); ind++){
                    this.styles[ind] = this.options.styles[i];
                }
            }
        }
    },

    onAdd: function(map) {
        L.CircleMarker.prototype.onAdd.call(this, map);
        map.on({zoom: this.onZoom.bind(this)})
        this.onZoom();
    },
    onRemove: function(map) {
        L.CircleMarker.prototype.onRemove.call(this, map);
        map.off({zoom: this.onZoom.bind(this)})
    },

    onZoom: function(){
        if (this.styles[this._map.getZoom()] !== undefined){
            this.setStyle(this.styles[this._map.getZoom()]);
        }
    }
})

L.CircleMarkerDynamic = CircleMarkerDynamic;

L.circleMarkerDynamic = function(latlng, options){
    return new CircleMarkerDynamic(latlng, options);
}