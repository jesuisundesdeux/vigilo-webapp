import 'leaflet';

import crosspng from '../img/crosshair.png';

var crosshair = L.icon({
  iconUrl: crosspng,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  className: 'timedout-marker'
});

const TimedOutMarker = L.Marker.extend({
    options: {
      icon: crosshair
    },

    initialize: function(latlng, options){
        L.Marker.prototype.initialize.call(this, latlng, options);
    },

    onAdd: function(map) {
        L.Marker.prototype.onAdd.call(this, map);
        var self = this;
        setTimeout(function(){self.setOpacity(0)}, 1000)
        setTimeout(function(){self.remove()}, 3000)
    },
    
})

L.TimedOutMarker = TimedOutMarker;

L.timedOutMarker = function(latlng, options){
    return new TimedOutMarker(latlng, options);
}