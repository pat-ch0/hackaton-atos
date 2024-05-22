import json
from concurrent.futures import ThreadPoolExecutor
import math

def haversine_distance(lat1, lon1, lat2, lon2):
    def to_rad(x):
        return x * math.pi / 180
    R = 6371.0
    dLat = to_rad(lat2 - lat1)
    dLon = to_rad(lon2 - lon1)
    a = math.sin(dLat / 2) ** 2 + math.cos(to_rad(lat1)) * math.cos(to_rad(lat2)) * math.sin(dLon / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c * 1000


def calculate_weight(point1, point2):
    lat1, lon1 = point1
    lat2, lon2 = point2
    distance = haversine_distance(lat1, lon1, lat2, lon2)
    if distance < 2000:
        return distance ** 2
    return None

def build_graph(features):
    graph = {}
    coordinates_dict = {}
    index = 0

    for feature in features:
        coords = feature['geometry']['coordinates']
        for i in range(0, len(coords), 4):
            coord = coords[i]
            coordinates_dict[index] = {
                'coordinates': tuple(coord),
                'geometry_id': id(feature['geometry'])
            }
            index += 1
    all_coords = list(coordinates_dict.values())

    def process_connections(i):
        point1 = all_coords[i]
        local_connections = {}
        print(f"\rProcessing connections for point {i + 1}/{len(all_coords)}", end='')
        for j in range(len(all_coords)):
            if i != j:
                point2 = all_coords[j]
                if point1['geometry_id'] != point2['geometry_id']:
                    weight = calculate_weight(point1['coordinates'], point2['coordinates'])
                    if weight is not None:
                        point2_coords_str = f"{point2['coordinates'][0]}, {point2['coordinates'][1]}"
                        local_connections[point2_coords_str] = weight
        point1_coords_str = f"{point1['coordinates'][0]}, {point1['coordinates'][1]}"
        return (point1_coords_str, local_connections)

    with ThreadPoolExecutor(10) as executor:
        results = list(executor.map(process_connections, range(len(all_coords))))
    
    for coordinates_str, local_connections in results:
        graph[coordinates_str] = local_connections

    return graph


with open('osm-mmm-bnac.geojson') as f:
    data = json.load(f)

features = data['features']
graph = build_graph(features)

with open('graph.json', 'w') as f:
    json.dump(graph, f)
