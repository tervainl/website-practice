// set default map view
const map = L.map("map").setView([25.05, 121.5], 11);

// set baselayers
let baselayers = {
  臺灣通用電子地圖: L.tileLayer(
    "https://wmts.nlsc.gov.tw/wmts/EMAP/default/EPSG:3857/{z}/{y}/{x}",
    {
      attribution:
        '&copy; <a href="https://www.tgos.tw/tgos/web/tgos_home.aspx">TGOS</a>',
    }
  ),
  "正射影像(混合)": L.tileLayer(
    "https://wmts.nlsc.gov.tw/wmts/PHOTO_MIX/default/GoogleMapsCompatible/{z}/{y}/{x}",
    {
      attribution:
        '&copy; <a href="https://www.tgos.tw/tgos/web/tgos_home.aspx">TGOS</a>',
    }
  ),
  "正射影像(通用)": L.tileLayer(
    "https://wmts.nlsc.gov.tw/wmts/PHOTO2/default/GoogleMapsCompatible/{z}/{y}/{x}",
    {
      attribution:
        '&copy; <a href="https://www.tgos.tw/tgos/web/tgos_home.aspx">TGOS</a>',
    }
  ),
  Mapbox: L.tileLayer(
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
  ),
};
// declare layergroups and overlays(list of all layergroup)
let overlays = {};
let rainLayerArray = {};

baselayers["臺灣通用電子地圖"].addTo(map);

// toolbutton
const toolButton = [
  L.easyButton(
    '<span class="star">&starf;</span>',
    function (btn, map) {
      setPointOfInterest();
    },
    "添加興趣點"
  ),
  L.easyButton(
    '<span class="cross">❌</span>',
    function (btn, map) {
      removePointOfInterest();
    },
    "移除興趣點"
  ),
];
L.easyBar(toolButton).addTo(map);

// get user's point list from localStorage
let myViewList = localStorage.getItem("viewList");
let myViewListArray = [];
let myButtonArray = [];
if (myViewList != null) {
  myViewListArray = JSON.parse(myViewList);
}
myViewListArray.forEach((view, i) => {
  myButtonArray[i] = L.easyButton(
    `<span class="star">${view.viewName}</span>`,
    function (btn, map) {
      map.setView(view.center, view.zoomLevel);
    },
    view.viewName
  ).addTo(map);
  myButtonArray[i].button.style.width = "auto";
  myButtonArray[i].button.style.padding = "0.25rem";
});

// set point of interest and save in localStorage
const setPointOfInterest = () => {
  let viewName = prompt("請替當前圖框命名");
  if (viewName == "") {
    alert("請輸入名稱");
    return;
  }

  let center = map.getCenter();
  let zoomLevel = map.getZoom();
  let viewInfo = { viewName: viewName, center: center, zoomLevel: zoomLevel };

  // save view to localStorage
  myViewListArray.push(viewInfo);
  localStorage.setItem("viewList", JSON.stringify(myViewListArray));

  // create button
  let newButton = L.easyButton(
    `<span class="star">${viewName}</span>`,
    function (btn, map) {
      map.setView(center, zoomLevel);
    },
    viewName
  ).addTo(map);
  myButtonArray.push(newButton);
  newButton.button.style.width = "auto";
  newButton.button.style.padding = "0.25rem";
  alert(`已添加${viewName}圖框`);
};

// remove point of interest and update in localStorage
const removePointOfInterest = () => {
  if (myViewListArray.length == 0) {
    alert("目前無圖框");
    return;
  }
  let myText = "請輸入欲刪除圖框編號\n";
  myViewListArray.forEach((value, i) => {
    myText += `${i + 1}   ${value.viewName} \n`;
  });
  let deleteTarget = prompt(myText);
  if (
    Number(deleteTarget) > myViewListArray.length ||
    Number(deleteTarget) < 1 ||
    isNaN(Number(deleteTarget))
  ) {
    alert("無此編號");
    return;
  }

  // use css let button display = none
  myButtonArray[Number(deleteTarget) - 1].disable();
  myButtonArray.splice(Number(deleteTarget) - 1, 1);
  myViewListArray.splice(Number(deleteTarget) - 1, 1);
  localStorage.setItem("viewList", JSON.stringify(myViewListArray));
};

// get current view bounds
let currentBounds = map.getBounds();
map.on("moveend", () => {
  currentBounds = map.getBounds();
});

// Rain data
fetch(
  "https://opendata.cwb.gov.tw/api/v1/rest/datastore/O-A0002-001?Authorization=rdec-key-123-45678-011121314"
)
  .then((response) => response.json())
  .then((data) => {
    // set accumulated time
    // 1 = 1hr, 2 = 10min, 3 = 3hr, 4 = 6hr, 5 = 12hr, 6 = 24hr, 7 = 1day, 8 = 2day, 9 = 3day.
    // https://opendata.cwb.gov.tw/opendatadoc/DIV2/A0002-001.pdf
    let mappingData = {
      "1小時": 1,
      "10分鐘": 2,
      "3小時": 3,
      "6小時": 4,
      "12小時": 5,
      "24小時": 6,
      "1日": 7,
      "2日": 8,
      "3日": 9,
    };
    for (const target in mappingData) {
      // create layergroup
      rainLayerArray[target] = L.layerGroup([]);
    }

    data.records.location.forEach((station, i) => {
      let XY = [Number(station.lat), Number(station.lon)];
      let stationName = station.locationName;
      for (const target in mappingData) {
        // create icon and raintext if rainfall > 0
        let rainfall = station.weatherElement[mappingData[target]].elementValue;
        if (rainfall > 0) {
          let statonIcon = L.divIcon({
            className: "my-div-icon",
            html: `${rainfall}mm`,
          });
          L.marker(XY, {
            icon: statonIcon,
          })
            .bindPopup(stationName)
            .addTo(rainLayerArray[target]);
        }
      }
    });
    console.log("finish!");
    for (const target in mappingData) {
      overlays[`累積${target}降雨量`] = rainLayerArray[target];
    }
    L.control.layers(baselayers, overlays).addTo(map);
  });

// add control layer and layergroup
