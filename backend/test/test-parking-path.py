from fastapi.testclient import TestClient
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from main import app
import pytest

client = TestClient(app)

# Test successful path-finding for various parking lot IDs
@pytest.mark.parametrize("end_id", [1, 2, 3, 4, 5, 10, 15, 20, 25, 30])
def test_find_path_to_parking_lot_success(end_id):
    response = client.post("/parking/path", json={
        "start_lat": 40.9156,
        "start_lng": -73.1265,
        "end_id": end_id
    })

    assert response.status_code == 200
    data = response.json()

    assert isinstance(data, dict)
    assert "destination" in data
    assert "path" in data
    assert "distance" in data
    assert isinstance(data["path"], list)
    assert len(data["path"]) > 0

# Test 422 error when required fields are missing from the request payload
@pytest.mark.parametrize("payload", [
    {"start_lng": -73.1265, "end_id": 3},
    {"start_lat": 40.9156, "end_id": 3},
    {"start_lat": 40.9156, "start_lng": -73.1265}
])
def test_missing_required_fields(payload):
    response = client.post("/parking/path", json=payload)
    assert response.status_code == 422
    assert "detail" in response.json()