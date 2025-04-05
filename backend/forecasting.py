from datetime import datetime, timedelta
import sqlite3
from typing import Dict, List, Optional, Tuple, Any
import numpy as np
from pathlib import Path
import json
import os
import pickle
from statsmodels.tsa.arima.model import ARIMA
from db_manager import execute_query, execute_write_query, get_db_connection

_forecast_cache = {}
_last_forecast_update = datetime.now() - timedelta(days=1)
_FORECAST_CACHE_TTL = 3600
_arima_models = {}
RANDOM_MODE = True


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


def _get_hourly_data(parking_lot_id: int, days_back: int = 30) -> List[float]:
    cutoff_date = (datetime.now() - timedelta(days=days_back)).strftime("%Y-%m-%d")

    query = """
    SELECT 
        strftime('%Y-%m-%d %H', startTime) as hour,
        COUNT(*) as reservation_count
    FROM 
        reservations
    WHERE 
        parkingLotID = ? AND 
        startTime >= ? AND
        reservationStatus IN ('Completed', 'Pending')
    GROUP BY 
        hour
    ORDER BY 
        hour
    """

    results = execute_query(query, (parking_lot_id, cutoff_date))
    
    if not results:
        return []
        
    capacity = _get_current_capacity(parking_lot_id)["capacity"]
    hourly_data = [r["reservation_count"] / max(1, capacity) for r in results]
    
    return hourly_data


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
    return []


def _fit_arima_model(lot_id: int) -> None:
    global _arima_models
    
    hourly_data = _get_hourly_data(lot_id)
    if len(hourly_data) < 24:
        return None
    
    try:
        model = ARIMA(hourly_data, order=(1, 0, 1))
        model_fit = model.fit()
        _arima_models[lot_id] = model_fit
    except Exception as e:
        print(f"Error fitting ARIMA model for lot {lot_id}: {e}")


def _predict_parking_lot_occupancy(lot_id: int, timestamp: datetime) -> float:
    global _arima_models
    
    current_capacity = _get_current_capacity(lot_id)
    
    if lot_id not in _arima_models:
        _fit_arima_model(lot_id)
    
    if lot_id in _arima_models:
        try:
            model_fit = _arima_models[lot_id]
            hours_ahead = int((timestamp - datetime.now()).total_seconds() / 3600)
            forecast = model_fit.forecast(steps=hours_ahead+1)
            predicted_occupancy = forecast[-1]
            return min(1.0, max(0.0, predicted_occupancy))
        except Exception as e:
            print(f"Error predicting with ARIMA for lot {lot_id}: {e}")
    
    historical_data = _get_historical_data(lot_id)
    
    if not historical_data:
        if current_capacity["capacity"] > 0:
            return current_capacity["reserved_slots"] / current_capacity["capacity"]
        return 0.0

    day_of_week = timestamp.strftime("%w")
    hour_of_day = timestamp.strftime("%H")

    matching_data = [
        d for d in historical_data
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


def get_daily_pattern(lot_id: int, day_of_week: Optional[int] = None) -> Dict:
    current_time = datetime.now()
    if day_of_week is None:
        day_of_week = int(current_time.strftime("%w"))
    
    historical_data = _get_historical_data(lot_id, days_back=60)
    day_data = [d for d in historical_data if int(d["day_of_week"]) == day_of_week]
    
    hours = list(range(24))
    occupancy_by_hour = []
    forecast_by_hour = []
    
    current_capacity = _get_current_capacity(lot_id)
    capacity = max(1, current_capacity["capacity"])
    
    current_day = int(current_time.strftime("%w"))
    days_ahead = (day_of_week - current_day) % 7
    if days_ahead == 0:
        days_ahead = 7  # next week if today is the requested day
    
    target_date = current_time + timedelta(days=days_ahead)
    
    for hour in hours:
        hour_str = str(hour).zfill(2)
        hour_data = [d for d in day_data if d["hour_of_day"] == hour_str]
        
        if hour_data:
            count = hour_data[0]["reservation_count"]
            occupancy_rate = min(100, round((count / capacity) * 100, 1))
        else:
            similar_hours = []
            for h in range(max(0, hour-1), min(24, hour+2)):
                h_str = str(h).zfill(2)
                similar_data = [d for d in day_data if d["hour_of_day"] == h_str]
                if similar_data:
                    similar_hours.extend(similar_data)
            
            if similar_hours:
                avg_count = sum(d["reservation_count"] for d in similar_hours) / len(similar_hours)
                occupancy_rate = min(100, round((avg_count / capacity) * 100, 1))
            else:
                occupancy_rate = min(100, round((current_capacity["reserved_slots"] / capacity) * 100, 1))
        
        forecast_time = target_date.replace(hour=hour, minute=0, second=0)
        
        if occupancy_rate > 0:
            forecast_base = occupancy_rate / 100.0
            
            if RANDOM_MODE:
                variation = 0.15
                seed_val = (lot_id * 1000) + (day_of_week * 100) + hour
                np.random.seed(seed_val)
                
                random_factor = 1 + (np.random.random() * variation * 2 - variation)
                forecast_rate = min(100, round(forecast_base * random_factor * 100, 1))
            else:
                # Without randomness, just use the historical rate with a slight increase (3%)
                forecast_rate = min(100, round(forecast_base * 103, 1) / 100)
        else:
            future_occupancy = _predict_parking_lot_occupancy(lot_id, forecast_time)
            forecast_rate = min(100, round(future_occupancy * 100, 1))
        
        occupancy_by_hour.append(occupancy_rate)
        forecast_by_hour.append(forecast_rate)
    
    return {
        "day": day_of_week,
        "day_name": ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][day_of_week],
        "hours": [f"{h}:00" for h in hours],
        "historical": occupancy_by_hour,
        "forecast": forecast_by_hour
    }


def get_weekly_pattern(lot_id: int) -> Dict:
    current_capacity = _get_current_capacity(lot_id)
    capacity = max(1, current_capacity["capacity"])
    
    historical_data = _get_historical_data(lot_id, days_back=60)
    days = list(range(7))
    day_names = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
    
    morning_data = []
    afternoon_data = []
    evening_data = []
    
    for day in days:
        day_str = str(day)
        day_data = [d for d in historical_data if d["day_of_week"] == day_str]
        
        morning_hours = [str(h).zfill(2) for h in range(6, 12)]
        morning_records = [d for d in day_data if d["hour_of_day"] in morning_hours]
        morning_avg = sum([d["reservation_count"] for d in morning_records]) / max(1, len(morning_records))
        morning_data.append(min(100, round((morning_avg / capacity) * 100, 1)))
        
        afternoon_hours = [str(h).zfill(2) for h in range(12, 18)]
        afternoon_records = [d for d in day_data if d["hour_of_day"] in afternoon_hours]
        afternoon_avg = sum([d["reservation_count"] for d in afternoon_records]) / max(1, len(afternoon_records))
        afternoon_data.append(min(100, round((afternoon_avg / capacity) * 100, 1)))
        
        evening_hours = [str(h).zfill(2) for h in range(18, 24)]
        evening_records = [d for d in day_data if d["hour_of_day"] in evening_hours]
        evening_avg = sum([d["reservation_count"] for d in evening_records]) / max(1, len(evening_records))
        evening_data.append(min(100, round((evening_avg / capacity) * 100, 1)))
    
    return {
        "days": day_names,
        "morning": morning_data,
        "afternoon": afternoon_data,
        "evening": evening_data
    }


def get_time_breakdown(lot_id: int, day_of_week: Optional[int] = None) -> Dict:
    if day_of_week is None:
        day_of_week = int(datetime.now().strftime("%w"))
    
    historical_data = _get_historical_data(lot_id, days_back=60)
    day_data = [d for d in historical_data if int(d["day_of_week"]) == day_of_week]
    
    current_capacity = _get_current_capacity(lot_id)
    capacity = max(1, current_capacity["capacity"])
    
    morning_hours = [str(h).zfill(2) for h in range(6, 12)]
    afternoon_hours = [str(h).zfill(2) for h in range(12, 18)]
    evening_hours = [str(h).zfill(2) for h in range(18, 24)]
    night_hours = [str(h).zfill(2) for h in range(0, 6)]
    
    morning_records = [d for d in day_data if d["hour_of_day"] in morning_hours]
    morning_avg = sum([d["reservation_count"] for d in morning_records]) / max(1, len(morning_records))
    
    afternoon_records = [d for d in day_data if d["hour_of_day"] in afternoon_hours]
    afternoon_avg = sum([d["reservation_count"] for d in afternoon_records]) / max(1, len(afternoon_records))
    
    evening_records = [d for d in day_data if d["hour_of_day"] in evening_hours]
    evening_avg = sum([d["reservation_count"] for d in evening_records]) / max(1, len(evening_records))
    
    night_records = [d for d in day_data if d["hour_of_day"] in night_hours]
    night_avg = sum([d["reservation_count"] for d in night_records]) / max(1, len(night_records))
    
    return {
        "day": day_of_week,
        "day_name": ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][day_of_week],
        "periods": [
            {
                "time": "Morning (6AM-12PM)",
                "occupancy": min(100, round((morning_avg / capacity) * 100, 1))
            },
            {
                "time": "Afternoon (12PM-6PM)",
                "occupancy": min(100, round((afternoon_avg / capacity) * 100, 1))
            },
            {
                "time": "Evening (6PM-12AM)",
                "occupancy": min(100, round((evening_avg / capacity) * 100, 1))
            },
            {
                "time": "Night (12AM-6AM)",
                "occupancy": min(100, round((night_avg / capacity) * 100, 1))
            }
        ]
    }


def save_forecasting_models():
    global _arima_models
    
    if not _arima_models:
        return
        
    model_dir = Path("models")
    model_dir.mkdir(exist_ok=True)
    
    with open(model_dir / "arima_models.pkl", "wb") as f:
        pickle.dump(_arima_models, f)


def load_forecasting_models():
    global _arima_models
    
    model_dir = Path("models")
    model_path = model_dir / "arima_models.pkl"
    
    if model_path.exists():
        try:
            with open(model_path, "rb") as f:
                _arima_models = pickle.load(f)
        except Exception as e:
            print(f"Error loading ARIMA models: {e}")
            _arima_models = {}