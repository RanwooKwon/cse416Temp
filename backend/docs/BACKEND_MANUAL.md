# P4SBU Upgraded Backend Manual

## Table of Contents

- [P4SBU Upgraded Backend Manual](#p4sbu-upgraded-backend-manual)
  - [Table of Contents](#table-of-contents)
  - [New Features](#new-features)
    - [1. Scalability Enhancements](#1-scalability-enhancements)
    - [2. Parking Forecasting](#2-parking-forecasting)
    - [3. Enhanced Pathfinding](#3-enhanced-pathfinding)
  - [API Documentation](#api-documentation)
    - [Forecasting Endpoints](#forecasting-endpoints)
    - [Enhanced Pathfinding Endpoints](#enhanced-pathfinding-endpoints)
  - [Usage Examples](#usage-examples)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Running the Server](#running-the-server)
  - [Deployment](#deployment)
    - [Development with Tailscale](#development-with-tailscale)
    - [Production on Render.com](#production-on-rendercom)
    - [Logs and Debugging](#logs-and-debugging)

## New Features

### 1. Scalability Enhancements
- Improved to handle up to 1000+ concurrent users
- Connection pooling for database operations
- Optimized transaction handling
- WAL mode for SQLite for better concurrency

### 2. Parking Forecasting
- Real-time parking lot congestion predictions
- Historical data-based occupancy forecasting
- Best parking time recommendations
- Congestion level indicators (Low, Moderate, High, Very High)

### 3. Enhanced Pathfinding
- Improved A* algorithm for optimal route finding
- User location-based parking lot recommendations
- Real-time parking availability integration
- EV charging preference support

## API Documentation

The backend provides the following main endpoints:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/token` | POST | Get authentication token |
| `/user/register` | POST | Register new user |
| `/user/login` | POST | Login user |
| `/parking/lots` | GET | Get all parking lots |
| `/parking/campus/list` | GET | Get list of all campuses |
| `/parking/campus/{campus}` | GET | Get parking lots by campus |
| `/parking/path` | GET/POST | Find path to parking lot |
| `/parking/nearest` | GET/POST | Find nearest available lots |
| `/parking/forecast/{parking_lot_id}` | GET | Get parking lot occupancy forecast |
| `/parking/forecast` | POST | Get parking lot occupancy forecast (POST version) |
| `/parking/best-time/{parking_lot_id}` | GET | Find best time to park |
| `/parking/best-time` | POST | Find best time to park (POST version) |
| `/reservation` | POST | Create reservation |

For the full API documentation, visit the `/docs` endpoint after starting the server.

### Forecasting Endpoints

#### GET /parking/forecast/{parking_lot_id}
Get hourly occupancy forecast for a specific parking lot.

**Query Parameters:**
- `hours_ahead` (optional): Number of hours to forecast (default: 12, max: 24)

**Response:**
```json
{
  "forecast": [
    {
      "timestamp": "2025-03-26T15:00:00.000Z",
      "occupancy_rate": 75.5,
      "predicted_occupied": 40,
      "predicted_available": 13,
      "congestion_level": "High"
    },
    ...
  ]
}
```

#### POST /parking/forecast
Same as above, but accepts JSON request body:
```json
{
  "parkingLotID": 1,
  "hours_ahead": 12
}
```

#### GET /parking/best-time/{parking_lot_id}
Find the best time to park in a specific lot.

**Query Parameters:**
- `time_window_hours` (optional): How far ahead to consider (default: 24, max: 48)

**Response:**
```json
{
  "best_time": "2025-03-26T18:00:00.000Z",
  "occupancy_rate": 35.0,
  "predicted_available": 35,
  "congestion_level": "Low"
}
```

#### POST /parking/best-time
Same as above, but accepts JSON request body:
```json
{
  "parkingLotID": 1,
  "time_window_hours": 24
}
```

### Enhanced Pathfinding Endpoints

#### GET /parking/nearest
Find nearest available parking lots with enhanced options.

**Query Parameters:**
- `start_lat`: Starting latitude
- `start_lng`: Starting longitude 
- `limit` (optional): Maximum results to return (default: 5)
- `min_available` (optional): Minimum available spaces (default: 1)
- `prefer_ev` (optional): Whether to prioritize EV charging (default: false)
- `max_distance` (optional): Maximum distance to consider

**Response:**
```json
[
  {
    "id": 3,
    "name": "Lot 123",
    "location": "North Campus",
    "distance": 0.8,
    "available": 25,
    "capacity": 50,
    "evSlots": 4,
    "coords": {
      "lat": 40.9161,
      "lng": -73.1239
    },
    "path": [...],
    "estimated_time_minutes": 5,
    "congestion": {
      "level": "Low",
      "occupancy_rate": 22.5,
      "predicted_available": 38
    },
    "best_parking_time": {
      "best_time": "2025-03-26T18:00:00.000Z",
      "occupancy_rate": 15.0,
      "predicted_available": 42,
      "congestion_level": "Low"
    }
  },
  ...
]
```

## Usage Examples

### Forecasting Parking Congestion

```python
import requests

# Get forecast for parking lot 3 for the next 8 hours
response = requests.get("https://p4sbu-yu75.onrender.com/parking/forecast/3?hours_ahead=8")
forecast = response.json()

# Print congestion levels for each hour
for hour in forecast["forecast"]:
    print(f"Time: {hour['timestamp']}, Congestion: {hour['congestion_level']}")
```

### Finding Best Parking Time

```python
import requests

# Find the best time to park in lot 5 within the next 24 hours
response = requests.get("https://p4sbu-yu75.onrender.com/parking/best-time/5")
best_time = response.json()

print(f"Best time to park: {best_time['best_time']}")
print(f"Congestion level: {best_time['congestion_level']}")
print(f"Available spots: {best_time['predicted_available']}")
```

### Finding Nearest Available Parking

```python
import requests

# User's current location
lat = 40.9146
lng = -73.1220

# Find nearest parking lots with EV charging preference
params = {
    "start_lat": lat,
    "start_lng": lng,
    "prefer_ev": True,
    "limit": 3
}

response = requests.get("https://p4sbu-yu75.onrender.com/parking/nearest", params=params)
nearest_lots = response.json()

for lot in nearest_lots:
    print(f"Lot {lot['name']}: {lot['distance']} miles away")
    print(f"Available spaces: {lot['available']}/{lot['capacity']}")
    print(f"Congestion: {lot['congestion']['level']}")
    print("\n")
```

## Prerequisites

Before installing the backend, ensure you have the following:

- Python 3.12 installed
- Pip (Python package installer)
- Git (for version control)

## Installation

1. Clone the repository or download the source code:

```bash
git clone <repository-url>
cd P4SBU_submission/backend
```

2. Create a virtual environment (recommended):

```bash
python -m venv venv
```

3. Activate the virtual environment:

   - On Windows:
   ```bash
   venv\Scripts\activate
   ```

   - On macOS/Linux:
   ```bash
   source venv/bin/activate
   ```

4. Install required dependencies:

```bash
pip install -r requirements.txt
```

If the requirements.txt file is missing, install the following packages:

```bash
pip install fastapi uvicorn pydantic[email] passlib python-multipart python-jose[cryptography] email-validator bcrypt osmnx networkx geopandas shapely pandas sqlite3
```

## Running the Server

1. Start the server with:

```bash
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

2. The API will be available at:
   - Local access: https://p4sbu-yu75.onrender.com
   - Network access: http://your-ip-address:8000

3. Access the API documentation at:
   - Swagger UI: https://p4sbu-yu75.onrender.com/docs
   - ReDoc: https://p4sbu-yu75.onrender.com/redoc

## API Documentation

The backend provides the following main endpoints:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/token` | POST | Get authentication token |
| `/user/register` | POST | Register new user |
| `/user/login` | POST | Login user |
| `/parking/lots` | GET | Get all parking lots |
| `/parking/campus/list` | GET | Get list of all campuses |
| `/parking/campus/{campus}` | GET | Get parking lots by campus |
| `/parking/path` | GET/POST | Find path to parking lot |
| `/parking/nearest` | GET/POST | Find nearest available lots |
| `/reservation` | POST | Create reservation |

For the full API documentation, visit the `/docs` endpoint after starting the server.

## Deployment

### Development with Tailscale

For development and testing with Tailscale:

1. Install Tailscale on your development machine: https://tailscale.com/download

2. Sign in to Tailscale:

```bash
tailscale up
```

3. Note your Tailscale IP address:

```bash
tailscale ip
```

4. Start the server on the Tailscale IP:

```bash
python -m uvicorn main:app --host <your-tailscale-ip> --port 8000 --reload
```

Alternatively, uncomment this line in main.py:

```python
# uvicorn.run("main:app", host="<your-tailscale-ip>", port=8000, reload=True)  # for tailscale
```

5. The API will be accessible to all devices on your Tailscale network at `http://<your-tailscale-ip>:8000`

### Production on Render.com

To deploy on Render.com:

1. Create a new Web Service on Render
2. Connect to your GitHub repository
3. Configure the following settings:
   - **Environment**: Python
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn -k uvicorn.workers.UvicornWorker main:app`
   - **Environment Variables**:
     - `DATABASE`: path to database (default: "parking.db")
     - `SECRET_KEY`: Your secure JWT secret
     - `ACCESS_TOKEN_EXPIRE_MINUTES`: Token expiration (e.g., 60)

4. Add a persistent disk for database storage:
   - Go to your service settings
   - Add a Disk
   - Set the mount path to /var/data
   - Update `DATABASE` env var to "/var/data/parking.db"

5. Deploy the application

### Logs and Debugging

- Check server logs for detailed error information
- Enable debug mode by adding `--debug` to the uvicorn command
