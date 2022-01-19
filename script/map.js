const map = L.map("map").setView([25.05, 121.5], 11);

let tiles = L.tileLayer(
  "https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw",
  {
    maxZoom: 18,
    attribution:
      'Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, ' +
      'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
    id: "mapbox/streets-v11",
    tileSize: 512,
    zoomOffset: -1,
  }
).addTo(map);

var contours_pts = turf.interpolate(ramdompts_ipl, 2, {
  gridType: "points",
  property: "obs",
  units: "kilometers",
});
//zProperty為要計算的欄位
var contours = turf.isobands(contours_pts, [0, 5, 10, 15, 20, 25, 30], {
  zProperty: "obs",
});
//結果為multiPolygon喔！！

//加入圖層
var contoursLayer = L.geoJson(contours, {
  onEachFeature: function (feature, layer) {
    layer.bindPopup(feature.properties.obs);
  },
  style: function (feature) {
    return {
      fillColor: getColor(parseInt(feature.properties.obs.split("-")[0])),
      weight: 0.5,
      color: "#bd0026",
      opacity: 1,
    };
  },
}).addTo(map);
