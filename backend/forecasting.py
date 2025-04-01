from datetime import datetime, timedelta
import sqlite3
from typing import Dict, List, Optional, Tuple, Any
import numpy as np
from pathlib import Path
import json
import os
from db_manager import execute_query, execute_write_query, get_db_connection

_forecast_cache = {}
_last_forecast_update = datetime.now() - timedelta(days=1)
_FORECAST_CACHE_TTL = 3600


def _get_historical_data(parking_lot_id: int, days_back: int = 30) -> List[Dict]:
    cutoff_date = (datetime.now() - timedelta(days=days_back)).strftime("%Y-%m-%d")

    query = """
    SELECT 
        strftime('%w', startTime) as day_of_week,
        strftime('%H', startTime) as hour_of_day,
        COUNT(*) as reservation_count
    FROM 
        reservations
    WHERE 
        parkingLotID = ? AND 
        startTime >= ? AND
        reservationStatus IN ('Completed', 'Pending')
    GROUP BY 
        day_of_week, hour_of_day
    ORDER BY 
        day_of_week, hour_of_day
    """

    return execute_query(query, (parking_lot_id, cutoff_date))


def _get_current_capacity(parking_lot_id: int) -> Dict:
    query = """
    SELECT 
        capacity, 
        reserved_slots,
        (capacity - reserved_slots) as available_slots
    FROM 
        parking_lots
    WHERE 
        parkingLotID = ?
    """

    results = execute_query(query, (parking_lot_id,))
    if results:
        return results[0]
    return {"capacity": 0, "reserved_slots": 0, "available_slots": 0}


def _get_upcoming_events() -> List[Dict]:
    """Get upcoming scheduled events that might impact parking demand."""
    # ToDo:
    return []


def _predict_parking_lot_occupancy(lot_id: int, timestamp: datetime) -> float:
    historical_data = _get_historical_data(lot_id)
    current_capacity = _get_current_capacity(lot_id)

    if not historical_data:
        if current_capacity["capacity"] > 0:
            return current_capacity["reserved_slots"] / current_capacity["capacity"]
        return 0.0

    day_of_week = timestamp.strftime("%w")  # 0=sunday, 6=saturday
    hour_of_day = timestamp.strftime("%H")

    matching_data = [
        d
        for d in historical_data
        if d["day_of_week"] == day_of_week and d["hour_of_day"] == hour_of_day
    ]

    if matching_data:
        avg_reservations = matching_data[0]["reservation_count"]
    else:
        if historical_data:
            avg_reservations = sum(
                d["reservation_count"] for d in historical_data
            ) / len(historical_data)
        else:
            avg_reservations = current_capacity["reserved_slots"]

    current_occupancy_rate = current_capacity["reserved_slots"] / max(
        1, current_capacity["capacity"]
    )
    time_weight = 0.7
    current_weight = 0.3

    predicted_occupancy = (
        time_weight * (avg_reservations / max(1, current_capacity["capacity"]))
        + current_weight * current_occupancy_rate
    )

    return min(1.0, predicted_occupancy)


def get_parking_lot_forecast(lot_id: int, hours_ahead: int = 12) -> List[Dict]:
    global _forecast_cache, _last_forecast_update

    current_time = datetime.now()
    cache_key = f"lot_{lot_id}_{hours_ahead}"

    if (
        cache_key in _forecast_cache
        and (current_time - _last_forecast_update).total_seconds() < _FORECAST_CACHE_TTL
    ):
        return _forecast_cache[cache_key]

    forecast = []
    current_capacity = _get_current_capacity(lot_id)

    for hour in range(hours_ahead):
        forecast_time = current_time + timedelta(hours=hour)
        occupancy_rate = _predict_parking_lot_occupancy(lot_id, forecast_time)

        predicted_occupied = round(occupancy_rate * current_capacity["capacity"])
        predicted_available = max(0, current_capacity["capacity"] - predicted_occupied)

        forecast.append(
            {
                "timestamp": forecast_time.isoformat(),
                "occupancy_rate": round(occupancy_rate * 100, 1),
                "predicted_occupied": predicted_occupied,
                "predicted_available": predicted_available,
                "congestion_level": get_congestion_level(occupancy_rate),
            }
        )

    _forecast_cache[cache_key] = forecast
    _last_forecast_update = current_time

    return forecast


def get_congestion_level(occupancy_rate: float) -> str:
    if occupancy_rate < 0.3:
        return "Low"
    elif occupancy_rate < 0.7:
        return "Moderate"
    elif occupancy_rate < 0.9:
        return "High"
    else:
        return "Very High"


def get_best_parking_time(lot_id: int, time_window_hours: int = 24) -> Dict:
    forecast = get_parking_lot_forecast(lot_id, time_window_hours)

    if len(forecast) > 1:
        forecast = forecast[1:]

    best_time_entry = min(forecast, key=lambda x: x["occupancy_rate"])

    return {
        "best_time": best_time_entry["timestamp"],
        "occupancy_rate": best_time_entry["occupancy_rate"],
        "predicted_available": best_time_entry["predicted_available"],
        "congestion_level": best_time_entry["congestion_level"],
    }


def save_forecasting_models():
    # ToDo: some ML?
    pass


def load_forecasting_models():
    # ToDo: some ML?
    pass
