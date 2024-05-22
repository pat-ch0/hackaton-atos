import { parseISO, getHours, getMinutes } from 'date-fns';
import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import config from '../config.js';

export default class BikePredictionModel {


    async preloadData(__dirname) {
        const dataDir = path.join(__dirname, 'data');
        if (fs.existsSync(dataDir)) {
            return;
        }

        try {
            const stationResponse = await fetch(`${config.API_URL}/bikestation`);
            const stations = await stationResponse.json();

            const currentDate = new Date();
            const fromDate = new Date();
            fromDate.setMonth(fromDate.getMonth() - 3);
            const fromDateStr = fromDate.toISOString().slice(0, 19);
            const toDate = currentDate.toISOString().slice(0, 19);

            for (const station of stations) {
                const id = station.id;
                const response = await fetch(`${config.API_URL}/bikestation_timeseries/${id}/attrs/availableBikeNumber?fromDate=${fromDateStr}&toDate=${toDate}`);
                const data = await response.json();

                const dataDir = path.join(__dirname, 'data');
                if (!fs.existsSync(dataDir)) {
                    fs.mkdirSync(dataDir, { recursive: true });
                }

                const filePath = path.join(dataDir, `${id}.json`);
                fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
            }

        } catch (error) {
            console.error('Error fetching or saving data:', error);
        }
    }

    async predict(dateHistory, numberBikeHistory, date, interval = 15) {
        const targetDate = parseISO(date);
        const targetHour = getHours(targetDate);
        const targetMinute = getMinutes(targetDate);
        const filteredBikes = [];

        for (let i = 0; i < dateHistory.length; i++) {
            const currentDate = parseISO(dateHistory[i]);
            if (targetDate.getDay() === currentDate.getDay()) {
                const currentHour = getHours(currentDate);
                const currentMinute = getMinutes(currentDate);

                if (currentHour === targetHour && Math.abs(currentMinute - targetMinute) <= interval) {
                    filteredBikes.push(numberBikeHistory[i]);
                } else if (currentHour === targetHour - 1 && currentMinute >= (60 - interval) && (60 - currentMinute + targetMinute) <= interval) {
                    filteredBikes.push(numberBikeHistory[i]);
                } else if (currentHour === targetHour + 1 && currentMinute <= interval && (currentMinute + 60 - targetMinute) <= interval) {
                    filteredBikes.push(numberBikeHistory[i]);
                }
            }
        }

        if (filteredBikes.length > 0) {
            const mean = filteredBikes.reduce((sum, num) => sum + num, 0) / filteredBikes.length;
            const min = Math.min(...filteredBikes);
            const max = Math.max(...filteredBikes);
            const median = this.calculateMedian(filteredBikes);
            //const mode = this.calculateMode(filteredBikes);
            const EcartType = this.calculateEcartType(filteredBikes, mean);
            const quartiles = this.calculateQuartiles(filteredBikes);
            const geometricMean = this.calculateGeometricMean(filteredBikes);
            const count = filteredBikes.length;
            return { mean, min, max, median, EcartType, quartiles, geometricMean, count };
        } else {
            return { mean: null, min: null, max: null, median: null, mode: null, stdDev: null, quartiles: null, count: 0 };
        }
    }

    calculateMedian(arr) {
        const sorted = [...arr].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    }

    calculateMode(arr) {
        const frequency = {};
        let maxFreq = 0;
        let modes = [];
        for (const item of arr) {
            if (frequency[item]) {
                frequency[item]++;
            } else {
                frequency[item] = 1;
            }
            if (frequency[item] > maxFreq) {
                maxFreq = frequency[item];
                modes = [item];
            } else if (frequency[item] === maxFreq) {
                if (!modes.includes(item)) {
                    modes.push(item);
                }
            }
        }
        return modes;
    }

    calculateGeometricMean(arr) {
        if (arr.some(x => x <= 0)) {
            return 0;
        }
        const product = arr.reduce((acc, val) => acc * val, 1);
        return Math.pow(product, 1 / arr.length);
    }

    calculateEcartType(arr, mean) {
        const squareDiffs = arr.map(value => (value - mean) ** 2);
        const avgSquareDiff = squareDiffs.reduce((sum, diff) => sum + diff, 0) / arr.length;
        return Math.sqrt(avgSquareDiff);
    }

    calculateQuartiles(arr) {
        const sorted = [...arr].sort((a, b) => a - b);
        return {
            Q1: this.calculateMedian(sorted.slice(0, Math.floor(sorted.length / 2))),
            Q2: this.calculateMedian(sorted),
            Q3: this.calculateMedian(sorted.slice(Math.ceil(sorted.length / 2))),
        };
    }
}
