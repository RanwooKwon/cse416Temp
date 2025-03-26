from fastapi.testclient import TestClient
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from main import app
import pytest

client = TestClient(app)

# Test successful login for previously registered users
@pytest.mark.parametrize("payload", [
    {"email": "testuser1@example.com", "password": "securepass001"},
    {"email": "testuser2@example.com", "password": "securepass002"},
    {"email": "testuser3@example.com", "password": "securepass003"},
    {"email": "testuser4@example.com", "password": "securepass004"},
])

def test_user_login_success(payload):
    response = client.post("/user/login", json=payload)
    print(f"[{payload['email']}]:", response.status_code, response.json())

    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, dict)
    assert "token" in data
    assert "userId" in data

# Test login failure: invalid email
def test_login_nonexistent_email():
    payload = {
        "email": "notregistered@example.com",
        "password": "somepassword123"
    }
    response = client.post("/user/login", json=payload)
    assert response.status_code == 401
    assert "detail" in response.json()

# Test login failure: incorrect password
def test_login_wrong_password():
    payload = {
        "email": "testuser1@example.com",
        "password": "wrongpassword"
    }
    response = client.post("/user/login", json=payload)
    assert response.status_code == 401
    assert "detail" in response.json()

# Test login failure: missing email
def test_login_missing_email():
    payload = {
        "password": "securepass001"
    }
    response = client.post("/user/login", json=payload)
    assert response.status_code == 422
    assert "detail" in response.json()

# Test login failure: missing password
def test_login_missing_password():
    payload = {
        "email": "testuser1@example.com"
    }
    response = client.post("/user/login", json=payload)
    assert response.status_code == 422
    assert "detail" in response.json()

# Test login failure: missing both fields
def test_login_missing_all_fields():
    payload = {}
    response = client.post("/user/login", json=payload)
    assert response.status_code == 422
    assert "detail" in response.json()