import fs from 'fs';
import geolib from 'geolib';
import { point, featureCollection, nearestPoint } from '@turf/turf';
import pkg from 'graphology';
const { Graph } = pkg;
import config from './config.js';

class PathFinder {
  constructor() {
    this.loadGraphData();
    this.buildGraph();
  }

  loadGraphData() {
    this.geojsonData = config.
    this.graphData = this.geojsonData.features.reduce((acc, feature) => {
      const key = `${feature.geometry.coordinates[0]}, ${feature.geometry.coordinates[1]}`;
      if (!acc[key]) {
        acc[key] = {};
      }
      feature.properties.edges.forEach(edge => {
        const targetKey = `${edge.target[0]}, ${edge.target[1]}`;
        acc[key][targetKey] = edge.weight;
      });
      return acc;
    }, {});
  }

  buildGraph() {
    this.graph = new Graph();
    Object.keys(this.graphData).forEach(source => {
      Object.entries(this.graphData[source]).forEach(([target, weight]) => {
        if (weight) {
          this.graph.addUndirectedEdgeWithKey(`${source}|${target}`, source, target, { weight });
        }
      });
    });
  }

  getNearestPoint(clickPoint) {
    const points = Object.keys(this.graphData).map(key => {
      const [longitude, latitude] = key.split(', ').map(Number);
      return point([longitude, latitude]);
    });
    const fc = featureCollection(points);
    const nearest = nearestPoint(clickPoint, fc);
    return nearest.geometry.coordinates.join(', ');
  }

  haversineDistance(lat1, lon1, lat2, lon2) {
    return geolib.getPreciseDistance(
      { latitude: lat1, longitude: lon1 },
      { latitude: lat2, longitude: lon2 }
    );
  }

  findShortestPath(startCoord, endCoord) {
    const startPoint = this.getNearestPoint(point([startCoord[0], startCoord[1]]));
    const endPoint = this.getNearestPoint(point([endCoord[0], endCoord[1]]));

    const path = this.graph.dijkstra(startPoint, endPoint, {
      weight: edge => edge.attributes.weight
    });

    return path.map(node => node.split(', ').map(Number));
  }
}

export default PathFinder;
