from flask import Flask, request, jsonify
from shapely.geometry import Point
from PathFinder import PathFinder

app = Flask(__name__)
pf = PathFinder()

@app.route('/getPathBetween', methods=['POST'])
def get_path_between():
    data = request.get_json()
    start = data['start']
    end = data['end']
    start_point = Point(start['lng'], start['lat'])
    end_point = Point(end['lng'], end['lat'])
    path = pf.find_shortest_path(start_point, end_point)
    
    geojson = {
        "type": "FeatureCollection",
        "features": [{
            "type": "Feature",
            "geometry": {
                "type": "LineString",
                "coordinates": path
            },
            "properties": {
                "name": "Path Route"
            }
        }]
    }
    return jsonify(geojson)

if __name__ == '__main__':
    app.run(debug=True)
