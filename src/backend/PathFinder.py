import json
import networkx as nx
from shapely.geometry import Point
from scipy.spatial import KDTree
import numpy as np
import sys


class PathFinder:
    def __init__(self):
        with open('graph.json', 'r') as file:
            self.graph_data = json.load(file)
        
        self.graph_data = {k: v for k, v in self.graph_data.items() if v and not all(weight == 0 for weight in v.values())}
                
        self.kd_tree, self.point_map = self.build_kd_tree()
        self.G = nx.DiGraph()
        for node, edges in self.graph_data.items():
            for target, weight in edges.items():
                if weight:
                    self.G.add_edge(node, target, weight=weight)

    def build_kd_tree(self):
        points = []
        point_map = {}
        for source in self.graph_data:
            x, y = map(float, source.split(','))
            point = (x, y)
            points.append(point)
            point_map[point] = source
        kd_tree = KDTree(points)
        return kd_tree, point_map

    def get_nearest_point(self, click_point):
        distance, index = self.kd_tree.query((click_point.x, click_point.y))
        nearest_coord = self.kd_tree.data[index]
        return Point(nearest_coord)

    def get_proche_in_graph_data(self, point):
        x, y = point.x, point.y
        distance = np.inf
        closest_point = None
        for point in self.graph_data:
            x2, y2 = map(float, point.split(','))
            dist = self.haversine_distance(x, y, x2, y2)
            if dist < distance:
                distance = dist
                closest_point = point
        return closest_point
    
    def haversine_distance(self, lat1, lon1, lat2, lon2):
        R = 6371.0
        lat1 = np.radians(lat1)
        lon1 = np.radians(lon1)
        lat2 = np.radians(lat2)
        lon2 = np.radians(lon2)
        dlon = lon2 - lon1
        dlat = lat2 - lat1
        a = np.sin(dlat / 2) ** 2 + np.cos(lat1) * np.cos(lat2) * np.sin(dlon / 2) ** 2
        c = 2 * np.arctan2(np.sqrt(a), np.sqrt(1 - a))
        return R * c

    def find_shortest_path(self, start_point, end_point):
        start_point = self.get_proche_in_graph_data(start_point)
        end_point = self.get_proche_in_graph_data(end_point)
        if start_point not in self.graph_data or end_point not in self.graph_data:
            print("Start or End point not in graph data")
            return []
        path = nx.dijkstra_path(self.G, source=start_point, target=end_point, weight='weight')
        distance = nx.dijkstra_path_length(self.G, source=start_point, target=end_point, weight='weight')
        return [(float(pt.split(',')[0]), float(pt.split(',')[1])) for pt in path]

    def main(self):
        input_data = json.loads(sys.argv[1])
        start_point = Point(input_data['start']['lng'], input_data['start']['lat'])
        end_point = Point(input_data['end']['lng'], input_data['end']['lat'])
        path = self.find_shortest_path(start_point, end_point)
        print(json.dumps(path))
    
if __name__ == "__main__":
    pf = PathFinder()
    pf.main()