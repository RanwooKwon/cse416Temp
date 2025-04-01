import pandas as pd
import osmnx as ox
import networkx as nx
import geopandas as gpd
from shapely.wkb import loads
from shapely.geometry import Point, Polygon
import ast
from typing import List, Dict, Tuple, Optional
from fastapi import HTTPException
import os
from pathlib import Path
import time
import sqlite3
import json

_graph_cache = None
_polygon_gdf_cache = None
_last_cache_time = 0
_CACHE_DURATION = 3600


def _load_polygon_data():
    global _polygon_gdf_cache, _last_cache_time

    current_time = time.time()
    if _polygon_gdf_cache is not None and current_time - _last_cache_time < _CACHE_DURATION:
        return _polygon_gdf_cache

    data_file = Path(__file__).parent / "polygon.parquet"
    if not data_file.exists():
        raise HTTPException(status_code=500, detail="Polygon data file not found")

    df_polygon = pd.read_parquet(str(data_file))

    def convert_wkb(wkb_data):
        try:
            if isinstance(wkb_data, bytes):
                return loads(wkb_data)
            elif isinstance(wkb_data, str):
                return loads(ast.literal_eval(wkb_data))
            else:
                return None
        except Exception as e:
            print(f"Error converting WKB: {e}")
            return None

    df_polygon["geometry"] = df_polygon["geom"].apply(convert_wkb)
    gdf_polygon = gpd.GeoDataFrame(
        df_polygon, geometry=df_polygon["geometry"], crs="EPSG:4326"
    )

    gdf_polygon["centroid"] = gdf_polygon["geometry"].apply(
        lambda geom: geom.centroid if isinstance(geom, Polygon) else None
    )
    gdf_polygon["X"] = gdf_polygon["centroid"].apply(lambda c: c.x if c else None)
    gdf_polygon["Y"] = gdf_polygon["centroid"].apply(lambda c: c.y if c else None)
    gdf_polygon = gdf_polygon.dropna(subset=["X", "Y"])

    _polygon_gdf_cache = gdf_polygon
    _last_cache_time = current_time

    return gdf_polygon


def _load_road_graph():
    global _graph_cache, _last_cache_time

    current_time = time.time()
    if _graph_cache is not None and current_time - _last_cache_time < _CACHE_DURATION:
        return _graph_cache

    gdf_polygon = _load_polygon_data()

    min_x, max_x = gdf_polygon["X"].min(), gdf_polygon["X"].max()
    min_y, max_y = gdf_polygon["Y"].min(), gdf_polygon["Y"].max()
    bbox = (min_x, min_y, max_x, max_y)

    G = ox.graph_from_bbox(bbox, network_type="drive")
    G_undirected = ox.convert.to_undirected(G)

    for u, v, data in G_undirected.edges(data=True):
        if 'length' not in data:
            data['length'] = data.get('weight', 0.001)

    for idx, row in gdf_polygon.iterrows():
        nearest_node = ox.distance.nearest_nodes(G_undirected, row["X"], row["Y"])

        G_undirected.add_node(idx, x=row["X"], y=row["Y"])

        G_undirected.add_edge(idx, nearest_node, weight=0.001, length=0.001)

        gdf_polygon.at[idx, "nearest_road_node"] = nearest_node

    _graph_cache = (G_undirected, gdf_polygon)
    _last_cache_time = current_time

    return G_undirected, gdf_polygon


def get_parking_lot_info() -> List[Dict]:
    gdf_polygon = _load_polygon_data()

    db_path = Path(__file__).parent / "parking.db"
    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    try:
        cursor.execute("SELECT * FROM parking_lots")
        parking_lots = cursor.fetchall()

        result = []
        for lot in parking_lots:
            name = lot["name"]

            import re
            lot_number_match = re.search(r'(?:Lot\s+)?(\d+[A-Za-z]?)', name)

            if lot_number_match:
                lot_number = lot_number_match.group(1)
                lot_match = gdf_polygon[gdf_polygon['Name'].str.contains(f"LOT {lot_number}", case=False, na=False)]

                if lot_match.empty:
                    lot_match = gdf_polygon[gdf_polygon['Name'].str.contains(f"{lot_number}$", na=False)]
            else:
                lot_match = gdf_polygon[gdf_polygon['Name'].str.contains(name, case=False, na=False)]

            if lot_match.empty:
                simplified_name = re.sub(r'[^A-Za-z0-9]', '', name).lower()
                lot_match = gdf_polygon[gdf_polygon['Name'].apply(
                    lambda x: bool(re.sub(r'[^A-Za-z0-9]', '', str(x)).lower() in simplified_name)
                )]

            if not lot_match.empty:
                match = lot_match.iloc[0]
                result.append({
                    "id": lot["parkingLotID"],
                    "name": lot["name"],
                    "location": lot["location"],
                    "capacity": lot["capacity"],
                    "available": lot["capacity"] - lot["reserved_slots"],
                    "evSlots": lot["evSlots"],
                    "coords": {
                        "lat": float(match["Y"]),
                        "lng": float(match["X"])
                    }
                })
            else:
                print(f"Warning: Parking lot '{name}' not found in GeoDataFrame")

        return result

    finally:
        conn.close()


def find_path(start_lat: float, start_lng: float, end_id: int) -> Dict:
    G_undirected, gdf_polygon = _load_road_graph()

    start_point = (start_lng, start_lat)

    start_node = ox.distance.nearest_nodes(G_undirected, *start_point)

    db_path = Path(__file__).parent / "parking.db"
    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    try:
        cursor.execute("SELECT * FROM parking_lots WHERE parkingLotID = ?", (end_id,))
        parking_lot = cursor.fetchone()

        if not parking_lot:
            raise HTTPException(status_code=404, detail="Parking lot not found")

        name = parking_lot["name"]

        import re
        lot_number_match = re.search(r'(?:Lot\s+)?(\d+[A-Za-z]?)', name)

        if lot_number_match:
            lot_number = lot_number_match.group(1)
            lot_match = gdf_polygon[gdf_polygon['Name'].str.contains(f"LOT {lot_number}", case=False, na=False)]

            if lot_match.empty:
                lot_match = gdf_polygon[gdf_polygon['Name'].str.contains(f"{lot_number}$", na=False)]
        else:
            lot_match = gdf_polygon[gdf_polygon['Name'].str.contains(name, case=False, na=False)]

        if lot_match.empty:
            simplified_name = re.sub(r'[^A-Za-z0-9]', '', name).lower()
            lot_match = gdf_polygon[gdf_polygon['Name'].apply(
                lambda x: bool(re.sub(r'[^A-Za-z0-9]', '', str(x)).lower() in simplified_name)
            )]

            if lot_match.empty:
                print(f"WARNING: Could not find lot '{name}' in map data, using first lot as fallback")
                lot_match = gdf_polygon.head(1)
                if lot_match.empty:
                    raise HTTPException(status_code=404,
                                        detail=f"Parking lot '{name}' not found in map data and no fallback available")

        match = lot_match.iloc[0]

        end_node = match.name

        try:
            try:
                path = nx.astar_path(G_undirected, start_node, end_node, weight="length")
            except KeyError:
                path = nx.astar_path(G_undirected, start_node, end_node, weight="weight")

            path_coords = []
            for node in path:
                y_coord = G_undirected.nodes[node].get("y")
                x_coord = G_undirected.nodes[node].get("x")

                if y_coord is not None and x_coord is not None:
                    path_coords.append({
                        "lat": float(y_coord),
                        "lng": float(x_coord)
                    })

            try:
                distance = nx.path_weight(G_undirected, path, weight="length")
            except KeyError:
                distance = 0
                for i in range(len(path) - 1):
                    edge_data = G_undirected.get_edge_data(path[i], path[i + 1])
                    edge_length = min(d.get('length', d.get('weight', 0.001))
                                      for d in edge_data.values())
                    distance += edge_length

            return {
                "path": path_coords,
                "distance": round(distance, 2),
                "destination": {
                    "id": parking_lot["parkingLotID"],
                    "name": parking_lot["name"],
                    "location": parking_lot["location"],
                    "available": parking_lot["capacity"] - parking_lot["reserved_slots"]
                }
            }
        except nx.NetworkXNoPath:
            raise HTTPException(status_code=404, detail="No path found between the given locations")

    finally:
        conn.close()


def euclidean_distance(point1, point2):
    lat1, lng1 = point1
    lat2, lng2 = point2
    return ((lat1 - lat2) ** 2 + (lng1 - lng2) ** 2) ** 0.5


def a_star_heuristic(graph, current, target):
    if 'y' in graph.nodes[current] and 'x' in graph.nodes[current] and 'y' in graph.nodes[target] and 'x' in \
            graph.nodes[target]:
        point1 = (graph.nodes[current]['y'], graph.nodes[current]['x'])
        point2 = (graph.nodes[target]['y'], graph.nodes[target]['x'])
        return euclidean_distance(point1, point2)
    return 0


def find_nearest_available_lots(start_lat: float, start_lng: float,
                                limit: int = 5,
                                min_available: int = 1,
                                prefer_ev: bool = False,
                                max_distance: Optional[float] = None) -> List[Dict]:

    G_undirected, gdf_polygon = _load_road_graph()

    start_point = (start_lng, start_lat)

    start_node = ox.distance.nearest_nodes(G_undirected, *start_point)

    try:
        from db_manager import execute_query
        lots_query = "SELECT * FROM parking_lots WHERE (capacity - reserved_slots) >= ?"
        available_lots = execute_query(lots_query, (min_available,))
    except ImportError:
        db_path = Path(__file__).parent / "parking.db"
        conn = sqlite3.connect(str(db_path))
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        try:
            cursor.execute(
                "SELECT * FROM parking_lots WHERE (capacity - reserved_slots) >= ?",
                (min_available,)
            )
            available_lots = cursor.fetchall()
        finally:
            conn.close()

    if not available_lots:
        return []

    try:
        import forecasting
        use_forecasting = True
    except ImportError:
        use_forecasting = False

    lots_with_paths = []
    import re

    for lot in available_lots:
        name = lot["name"]

        lot_number_match = re.search(r'(?:Lot\s+)?(\d+[A-Za-z]?)', name)

        if lot_number_match:
            lot_number = lot_number_match.group(1)
            lot_match = gdf_polygon[gdf_polygon['Name'].str.contains(f"LOT {lot_number}", case=False, na=False)]

            if lot_match.empty:
                lot_match = gdf_polygon[gdf_polygon['Name'].str.contains(f"{lot_number}$", na=False)]
        else:
            lot_match = gdf_polygon[gdf_polygon['Name'].str.contains(name, case=False, na=False)]

        if lot_match.empty:
            simplified_name = re.sub(r'[^A-Za-z0-9]', '', name).lower()
            lot_match = gdf_polygon[gdf_polygon['Name'].apply(
                lambda x: bool(re.sub(r'[^A-Za-z0-9]', '', str(x)).lower() in simplified_name)
            )]

            if lot_match.empty:
                print(f"Skipping lot '{name}' - no match found in map data")
                continue

        match = lot_match.iloc[0]
        lot_node = match.name

        try:
            try:
                path = nx.astar_path(
                    G_undirected,
                    start_node,
                    lot_node,
                    weight="length",
                    heuristic=lambda u, v: a_star_heuristic(G_undirected, u, v)
                )
            except KeyError:
                path = nx.astar_path(
                    G_undirected,
                    start_node,
                    lot_node,
                    weight="weight",
                    heuristic=lambda u, v: a_star_heuristic(G_undirected, u, v)
                )

            try:
                distance = nx.path_weight(G_undirected, path, weight="length")
            except KeyError:
                distance = 0
                for i in range(len(path) - 1):
                    edge_data = G_undirected.get_edge_data(path[i], path[i + 1])
                    edge_length = min(d.get('length', d.get('weight', 0.001))
                                      for d in edge_data.values())
                    distance += edge_length

            if max_distance and distance > max_distance:
                continue

            path_coords = []
            for node in path:
                y_coord = G_undirected.nodes[node].get("y")
                x_coord = G_undirected.nodes[node].get("x")

                if y_coord is not None and x_coord is not None:
                    path_coords.append({
                        "lat": float(y_coord),
                        "lng": float(x_coord)
                    })

            lot_details = {
                "id": lot["parkingLotID"],
                "name": lot["name"],
                "location": lot["location"],
                "distance": round(distance, 2),
                "available": lot["capacity"] - lot["reserved_slots"],
                "capacity": lot["capacity"],
                "evSlots": lot["evSlots"],
                "coords": {
                    "lat": float(match["Y"]),
                    "lng": float(match["X"])
                },
                "path": path_coords,
                "estimated_time_minutes": round(distance * 3)
            }

            if use_forecasting:
                try:
                    current_congestion = forecasting.get_parking_lot_forecast(lot["parkingLotID"], 1)[0]
                    lot_details["congestion"] = {
                        "level": current_congestion["congestion_level"],
                        "occupancy_rate": current_congestion["occupancy_rate"],
                        "predicted_available": current_congestion["predicted_available"]
                    }

                    best_time = forecasting.get_best_parking_time(lot["parkingLotID"])
                    lot_details["best_parking_time"] = best_time
                except Exception as e:
                    print(f"Error getting forecasting data: {e}")

            lots_with_paths.append(lot_details)

        except nx.NetworkXNoPath:
            continue

    if prefer_ev:
        lots_with_paths.sort(key=lambda x: (
            -x["evSlots"],
            x.get("congestion", {}).get("occupancy_rate", 50),
            x["distance"]
        ))
    else:
        lots_with_paths.sort(key=lambda x: (
                x["distance"] * (1 + 0.005 * x.get("congestion", {}).get("occupancy_rate", 0))
        ))

    return lots_with_paths[:limit]
