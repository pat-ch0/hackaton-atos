import express from 'express';
import path from 'path';
import fetch from 'node-fetch';
import { fileURLToPath } from 'url';
import BikePredictionModel from './prediction/BikePredictionModel.js';
import { subMonths, formatISO } from 'date-fns';
import fs from 'fs';
import config from "./config.js"
import {exec} from 'child_process';


const __dirname = path.dirname(fileURLToPath(import.meta.url));
const port = process.env.PORT || 3000;
const bikePredictionModel = new BikePredictionModel();
bikePredictionModel.preloadData(__dirname);
const app = express();
app.use(express.json());

const API_URL = 'https://portail-api-data.montpellier3m.fr';
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/bikestation', async (req, res) => {
    const response = await fetch(`${API_URL}/bikestation`);
    const data = await response.json();
    return res.json(data).status(200);
});

// url exemple : http://localhost:3000/predict/urn:ngsi-ld:station:001/2024-05-26T17:00:00Z/30
// http://localhost:3000/predict/{id station}/{date a predire format ISO}/{interval en minute}
app.get('/predict/:id/:date/:interval', async (req, res) => {
    const { id, date, interval } = req.params;
    const currendDate = new Date();
    const fromDate = new Date();
    fromDate.setMonth(fromDate.getMonth() - 3);
    const fromDateStr = fromDate.toISOString().slice(0, 19);
    const toDate = currendDate.toISOString().slice(0, 19);
    const data = await getBikestationTimeseries(id)
    const dateHistory = data.index;
    const numberBikeHistory = data.values;
    const prediction = await bikePredictionModel.predict(dateHistory, numberBikeHistory, date, interval);
    res.json({ prediction }).status(200);
});

app.get('/bikestation/history/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const data = await getBikestationTimeseries(id);
        res.status(200).json(data);
    } catch (error) {
        console.error('Error fetching bike station data:', error);
        res.status(500).send('Failed to fetch bike station data');
    }
});

app.post('/getPathBetween', async (req, res) => {
    const { start, end } = req.body;
    try {
        const response = await fetch('http://localhost:5000/getPathBetween', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ start, end })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const geojson = await response.json();
        res.json(geojson).status(200);
    } catch (error) {
        console.error('Failed to fetch from Python service:', error);
        res.status(500).json({ error: 'Failed to fetch from Python service' });
    }
});

app.get('/bikeRoad', async (req, res) => {
    res.json(config.bikeRoadData).status(200);
})

async function getBikestationTimeseries(id) {
    const path = `./data/${id}.json`;
    if (fs.existsSync(path)) {
        const data = JSON.parse(fs.readFileSync(path, 'utf-8'));
        return data;
    } else {
        const currentDate = new Date();
        const fromDate = subMonths(currentDate, 3);
        const fromDateStr = formatISO(fromDate, { representation: 'date' });
        const toDateStr = formatISO(currentDate, { representation: 'date' });

        const url = `${API_URL}/bikestation_timeseries/${id}/attrs/availableBikeNumber?fromDate=${fromDateStr}&toDate=${toDateStr}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        fs.writeFileSync(path, JSON.stringify(data, null, 2), 'utf-8');
        return data;
    }
}

const startFlaskServer = () => {
    const pythonPath = 'python3'; // ou juste 'python' selon ta configuration
    const scriptPath = './server.py'; // Assure-toi que le chemin est correct

    const flaskServer = exec(`${pythonPath} ${scriptPath}`, (error, stdout, stderr) => {
        if (error) {
            console.error(`exec error: ${error}`);
            return;
        }
        console.log(`stdout: ${stdout}`);
        console.error(`stderr: ${stderr}`);
    });

    console.log('Flask server started successfully');
};

startFlaskServer();


app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
