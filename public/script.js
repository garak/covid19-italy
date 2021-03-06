function heatMapColorforValue(value) {
    var h = (1.0 - value) * 240
    return "hsl(" + h + ", 100%, 50%)";
}

function fetchJSONFile(path, callback) {
    var httpRequest = new XMLHttpRequest();
    httpRequest.onreadystatechange = function() {
        if (httpRequest.readyState === 4) {
            if (httpRequest.status === 200) {
                var data = JSON.parse(httpRequest.responseText);
                if (callback) callback(data);
            }
        }
    };
    httpRequest.open('GET', path);
    httpRequest.send();
}

var sliderControl = null;
var map = L.map('map').setView([41.8719, 12.5674], 6);

L.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token=pk.eyJ1IjoiZmFiaW9jaWNlcmNoaWEiLCJhIjoiY2s3b2phNXhxMDlzbTNncDkzY3pkb2YxYSJ9.37ZdJEamTJMHvbticJ25CQ', {
    attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
        '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
        'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
    id: 'mapbox/light-v9'
}).addTo(map);

function normalisePlace(place) {
    if (place === 'Valle d\'Aosta/Vallée d\'Aoste') return 'Aosta';
    else if (place === 'Bolzano/Bozen') return 'Bolzano';
    else if (place === 'Massa-Carrara') return 'Massa Carrara';
    return place;
}

history = {};
geoLayer = undefined;

function paintMap(dataProvince, lastUpdate) {
    document.getElementById('lastUpdate').innerHTML = lastUpdate;
    var max = Math.max.apply(Math, Object.values(dataProvince));

    fetchJSONFile('/limits_IT_provinces.geojson', function(provinces) {
        if (geoLayer !== undefined) {
            geoLayer.remove();
        }
        geoLayer = L.geoJSON(provinces, {
                weight: 1,
                style: function(feature) {
                    var place = normalisePlace(feature.properties.prov_name);
                    var cases = dataProvince[place];
                    if (cases > 0) {
                        return {
                            color: heatMapColorforValue(Math.min(cases / max + 0.75, 1))
                        };
                    }
                },
                onEachFeature: function(feature, layer) {
                    var place = normalisePlace(feature.properties.prov_name);
                    var cases = dataProvince[place];
                    var popupContent = '<strong>' + place + '</strong><br>';
                    popupContent += 'Cases: ' + cases + '<br>';
                    popupContent += '<small>Updated on ' + lastUpdate + '<small>';
                    layer.bindPopup(popupContent);
                }
            })
            .addTo(map)
            .on('click', function(e) {
                document.getElementById('type-form').value = 'province';
                document.getElementById('value-form').value = normalisePlace(e.sourceTarget.feature.properties.prov_name);
                document.getElementById('search-form').submit();
            });
    });
}

Papa.parse('/dpc-covid19-ita-province.csv', {
    header: true,
    download: true,
    complete: function(results) {
        var date = new Date();
        var today = date.getFullYear() + '-' + (date.getMonth() + 1).toString().padStart(2, '0') + '-' + (date.getDate()).toString().padStart(2, '0');
        var yesterday = date.getFullYear() + '-' + (date.getMonth() + 1).toString().padStart(2, '0') + '-' + (date.getDate() - 1).toString().padStart(2, '0');
        results.data.forEach(function(item) {
            var parsedDate = item.data.substr(0, 10);
            if (typeof history[parsedDate] === 'undefined') history[parsedDate] = {};
            history[parsedDate][item.denominazione_provincia] = parseInt(item.totale_casi, 10);
        });
        var dataProvince = history[today] || history[yesterday];
        var lastUpdate = history[today] ? today : yesterday;
        var sumCases = Object.values(dataProvince).reduce((a, b) => a + b, 0);
        document.getElementById('totalCases').innerHTML = sumCases.toLocaleString();

        var colours = ['#ff0000', '#ff4e00', '#ff7100', '#ff8d00', '#ffa600', '#ffbe00', '#ffd400', '#ffea00', '#ffff00']
            .reverse();

        paintMap(dataProvince, lastUpdate);
    }
});

currentDate = lastUpdate;
document.getElementById('dayFirst').onclick = function() {
    var first = Object.keys(history)[0];
    lastUpdate = first;

    paintMap(history[first], first);
};
document.getElementById('dayBefore').onclick = function() {
    var date = new Date(Date.parse(currentDate.innerHTML) - (24 * 60 * 60 * 1000));
    var before = date.getFullYear() + '-' + (date.getMonth() + 1).toString().padStart(2, '0') + '-' + (date.getDate()).toString().padStart(2, '0');
    lastUpdate = before;

    paintMap(history[before], before);
};
document.getElementById('dayAfter').onclick = function() {
    var date = new Date(Date.parse(currentDate.innerHTML) + (24 * 60 * 60 * 1000));
    var after = date.getFullYear() + '-' + (date.getMonth() + 1).toString().padStart(2, '0') + '-' + (date.getDate()).toString().padStart(2, '0');
    lastUpdate = after;

    paintMap(history[after], after);
};
document.getElementById('dayLast').onclick = function() {
    var last = Object.keys(history)[Object.keys(history).length - 1];
    lastUpdate = last;

    paintMap(history[last], last);
};
