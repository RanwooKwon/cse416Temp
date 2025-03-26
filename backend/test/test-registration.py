from fastapi.testclient import TestClient
import sys
import os
from zmq import NULL
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from main import app
import pytest

client = TestClient(app)

# Valid user payloads
@pytest.mark.parametrize("payload", [
    {
        "email": "testuser1@example.com",
        "userName": "User One",
        "phone": "+1-212-555-0001",
        "password": "securepass001",
        "userType": "Resident student",
        "sbuID": "123456789",
        "licenseInfo": "ABC1234"
    },
    {
        "email": "testuser2@example.com",
        "userName": "User Two",
        "phone": "+1-212-555-0002",
        "password": "securepass002",
        "userType": "Non-resident student",
        "sbuID": "987654321",
        "licenseInfo": "XYZ9876"
    },
    {
        "email": "testuser3@example.com",
        "userName": "User Three",
        "phone": "+1-212-555-0003",
        "password": "securepass003",
        "userType": "Visitor",
        "sbuID": "456789123",
        "licenseInfo": "NYC2024"
    },
    {
        "email": "testuser4@example.com",
        "userName": "User Four",
        "phone": "+1-212-555-0004",
        "password": "securepass004",
        "userType": "Faculty member",
        "sbuID": NULL,
        "licenseInfo": "SUNY001"
    },
])

# Test successful registration with multiple valid user payloads
def test_user_register_success(payload):
    response = client.post("/user/register", json=payload)

    assert response.status_code == 200

    data = response.json()
    assert isinstance(data, dict)
    assert "userID" in data
    assert data["email"] == payload["email"]
    assert data["userName"] == payload["userName"]
    assert data["userType"] == payload["userType"]


{
    "email": "badpass@example.com",
    "userName": "Bad Password",
    "phone": "+1-212-555-0005",
    "password": "short",
    "userType": "Resident student",
    "sbuID": "123456780",
    "licenseInfo": "BAD1234"
}

# Test registration failure due to password being too short (less than 12 characters)
def test_register_short_password():
    payload = {
        "email": "badpass@example.com",
        "userName": "Bad Password",
        "phone": "+1-212-555-0005",
        "password": "short",    # too short
        "userType": "Resident student",
        "sbuID": "123456780",
        "licenseInfo": "BAD1234"
    }

    response = client.post("/user/register", json=payload)
    assert response.status_code == 422
    assert "detail" in response.json()

# Test registration failure due to duplicate email already registered
def test_register_duplicate_email():
    payload = {
        "email": "testuser1@example.com",  # already registered email
        "userName": "Duplicate Email",
        "phone": "+1-212-555-0006",
        "password": "securepass009",
        "userType": "Resident student",
        "sbuID": "234567890",
        "licenseInfo": "DUP1111"
    }

    response = client.post("/user/register", json=payload)
    assert response.status_code == 400
    assert "detail" in response.json()

# Test registration failure due to invalid email format (missing @ symbol)
def test_register_invalid_email_format():
    payload = {
        "email": "invalid-email",  # email without @
        "userName": "Invalid Email Format",
        "phone": "+1-212-555-0007",
        "password": "securepass010",
        "userType": "Resident student",
        "sbuID": "345678901",
        "licenseInfo": "BAD8888"
    }

    response = client.post("/user/register", json=payload)
    assert response.status_code == 422
    assert "detail" in response.json()