const API_URL = 'https://portail-api-data.montpellier3m.fr';
import fs from 'fs';

const bikeRoadData = JSON.parse(fs.readFileSync('./osm-mmm-bnac.geojson', 'utf-8'));
export default { API_URL, bikeRoadData };