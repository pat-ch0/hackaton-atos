var map = L.map('map').setView([43.610769, 3.876716], 13);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

fetch('https://portail-api-data.montpellier3m.fr/bikestation?limit=21')
    .then(response => response.json())
    .then(data => {
        data.forEach(station => {
            var totalBike = station.totalSlotNumber.value
            var availableBike = station.availableBikeNumber.value
            var name = station.address.value.streetAddress
            var latitude = station.location.value.coordinates[0]
            var longitude = station.location.value.coordinates[1]
            var marker = L.marker([longitude, latitude]).addTo(map);

            const select = document.getElementById('station');
            const option = document.createElement('option');
            option.value = station.id;
            option.textContent = name;
            select.appendChild(option);

            var popupContent = "<b>" + name + "</b><br>Vélos disponibles: " + availableBike + "<br>Emplacements vélos : " + totalBike;

            marker.bindPopup(popupContent);

            marker.on('click', function (e) {
                // Récupérer l'ID de la station correspondant au marqueur
                var stationId = station.id;
                // Parcourir les options du select
                for (var i = 0; i < select.options.length; i++) {
                    if (select.options[i].value == stationId) {
                        // Sélectionner l'option correspondante dans le select
                        select.selectedIndex = i;
                        break;
                    }
                }
            });
        });
    })
    .catch(error => console.error('Erreur lors du chargement des données :', error));

var modal = document.getElementById("myModal");

var openModalBtn = document.getElementById('submit')
var closeModalBtn = document.getElementsByClassName("close")[0];

var datetimeInput = document.getElementById('date');

// Obtenir la date et l'heure actuelles
var now = new Date();

// Formatter la date et l'heure actuelles au format ISO (AAAA-MM-JJTHH:MM)

var formattedNow = now.toISOString().slice(0, 16); // Supprimer les millisecondes

// Définir l'attribut min de l'élément input de datetime-local sur la date et l'heure actuelles
datetimeInput.setAttribute('min', formattedNow);

openModalBtn.onclick = function (e) {
    e.preventDefault(); // Annuler l'envoi du formulaire
    
    if (datetimeInput.value === '') {
        alert('Veuillez sélectionner une date et une heure.');
    }
    else {
        // Si le champ de date est rempli, continuer avec l'action normale
        var optionValue = document.getElementById('station').value;
        var dateValue = datetimeInput.value;

        fetch("http://localhost:3000/predict/" + optionValue + "/" + dateValue + "/30")
            .then(response => response.json())
            .then(data => {
                // Traitement des données et affichage du modal
                modal.style.display = "block";
                var modalContent = document.getElementById("modalText");
                modalContent.textContent = "Estimation du nombre de vélos disponibles : " + Math.floor(data.prediction.mean);
            })
            .catch(error => console.error('Erreur lors du chargement des données :', error));
    }
}

closeModalBtn.onclick = function () {
    modal.style.display = "none";
}

window.onclick = function (event) {
    if (event.target == modal) {
        modal.style.display = "none";
    }
}


const greenIcon = L.icon({
    iconUrl: 'http://leafletjs.com/examples/custom-icons/leaf-green.png',
    iconSize: [38, 95],
    iconAnchor: [22, 94],
    popupAnchor: [-3, -76]
});

const redIcon = L.icon({
    iconUrl: 'http://leafletjs.com/examples/custom-icons/leaf-red.png',
    iconSize: [38, 95],
    iconAnchor: [22, 94],
    popupAnchor: [-3, -76]
});


class bikeRoad {
    bikeRoadData = null;
    markers = []
    bikeRoadLayer = null;
    
    
    constructor() {
        this.getBikeRoad();
        map.on('click', (e) => this.mapEventClick(e, this.bikeRoadData))
    }

    mapEventClick(e, bikeRoadData) {
        let closestPoint = null;
        let minDistance = Infinity;
        console.log(bikeRoadData)
        bikeRoadData.features.forEach(road => {
            road.geometry.coordinates.forEach(coordinate => {
                const distance = this.haversineDistance(e.latlng.lat, e.latlng.lng, coordinate[1], coordinate[0]);
                if (distance < minDistance) {
                    minDistance = distance;
                    closestPoint = coordinate;
                }
            });
        });
        if (closestPoint) {
            if (this.markers.length >= 2) {
                this.markers.forEach(m => map.removeLayer(m));
                this.markers = [];
                if(this.path) map.removeLayer(this.path);
                this.addBikeRoadLayer();
                return;
            }
            const icon = this.markers.length === 0 ? greenIcon : redIcon;
            const marker = L.marker([closestPoint[1], closestPoint[0]], {icon: icon}).addTo(map);
            if (!this.markers) this.markers = [];
            this.markers.push(marker);
            if(this.markers.length == 2){
                this.getPath();
            }
        }
    }

    async getPath(){
        const start = this.markers[0].getLatLng();
        const end = this.markers[1].getLatLng();
        const fet = await fetch('http://localhost:3000/getPathBetween', {
            method: 'POST',
            body: JSON.stringify({start, end}),
            headers: {
                'Content-Type': 'application/json'
            }
        });
        // remove bikeRoadData from map
        const data = await fet.json();
        // remove bikeRoadData from map
        this.removeBikeRoadLayer();
        this.path = L.geoJSON(data, {color: 'red'}).addTo(map);
    }

    removeBikeRoadLayer(){
        if(this.bikeRoadLayer !== null) {
            map.removeLayer(this.bikeRoadLayer);
            this.bikeRoadLayer = null;
        }
    }

    addBikeRoadLayer(){
        if(this.bikeRoadData) {
            this.bikeRoadLayer = L.geoJSON(this.bikeRoadData).addTo(map);
        }
    }

    async getBikeRoad() {
        let fet = await fetch('http://localhost:3000/bikeRoad');
        this.bikeRoadData = await fet.json();
        this.addBikeRoadLayer();
    }

    // Function to calculate the geographic distance using the Haversine formula
    haversineDistance(lat1, lon1, lat2, lon2) {
        function toRad(x) {
            return x * Math.PI / 180;
        }

        let R = 6371; // Earth radius in km
        let dLat = toRad(lat2 - lat1);
        let dLon = toRad(lon2 - lon1);
        let a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        let c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }


}


new bikeRoad();
