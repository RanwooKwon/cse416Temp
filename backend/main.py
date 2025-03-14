from fastapi import FastAPI, HTTPException, Depends
from fastapi.responses import FileResponse
from pydantic import BaseModel, EmailStr, constr, validator
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import sqlite3
import uvicorn
import json

DATABASE = "parking.db"


# ---------------------- DATABASE SETUP ---------------------- #
def get_db():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()


def init_db():
    conn = sqlite3.connect(DATABASE)
    c = conn.cursor()

    c.execute("""
        CREATE TABLE IF NOT EXISTS users (
            userID INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            userName TEXT NOT NULL,
            password TEXT NOT NULL,
            userType TEXT CHECK (userType IN ('Faculty member', 'Non-resident student', 'Resident student', 'Visitor')),
            sbuID INTEGER UNIQUE,
            phone TEXT,
            licenseInfo TEXT
        )
    """)

    c.execute("""
        CREATE TABLE IF NOT EXISTS parking_lots (
            parkingLotID INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            location TEXT NOT NULL,
            capacity INTEGER NOT NULL CHECK(capacity > 0),
            evSlots INTEGER DEFAULT 0,
            reserved_slots INTEGER DEFAULT 0
        )
    """)

    c.execute("""
        CREATE TABLE IF NOT EXISTS reservations (
            reservationID INTEGER PRIMARY KEY AUTOINCREMENT,
            parkingLotID INTEGER,
            userID INTEGER,
            startTime DATETIME NOT NULL,
            endTime DATETIME NOT NULL,
            price REAL NOT NULL CHECK(price >= 0),
            reservationStatus TEXT CHECK (reservationStatus IN ('Pending', 'Completed', 'Failed', 'Cancelled')),
            created_at DATETIME NOT NULL,
            FOREIGN KEY (parkingLotID) REFERENCES parking_lots(parkingLotID) ON DELETE CASCADE,
            FOREIGN KEY (userID) REFERENCES users(userID) ON DELETE CASCADE
        )
    """)
    c.execute("""
        CREATE TABLE IF NOT EXISTS payments (
            paymentID INTEGER PRIMARY KEY AUTOINCREMENT,
            reservationID INTEGER,
            amount REAL NOT NULL CHECK(amount >= 0),
            paymentMethod TEXT CHECK (paymentMethod IN ('CreditCard', 'PayPal', 'Other')),
            paymentStatus TEXT CHECK (paymentStatus IN ('Pending', 'Completed', 'Failed')),
            paymentDate DATETIME NOT NULL,
            FOREIGN KEY (reservationID) REFERENCES reservations(reservationID) ON DELETE CASCADE
        )
    """)
    c.execute("""
        CREATE TABLE IF NOT EXISTS feedback (
            feedbackID INTEGER PRIMARY KEY AUTOINCREMENT,
            userID INTEGER,
            date DATETIME NOT NULL,
            message TEXT NOT NULL,
            rating INTEGER CHECK (rating BETWEEN 1 AND 5),
            FOREIGN KEY (userID) REFERENCES users(userID) ON DELETE CASCADE
        )
    """)
    c.execute("""
        CREATE TABLE IF NOT EXISTS cars (
            carID INTEGER PRIMARY KEY AUTOINCREMENT,
            userID INTEGER,
            plateNumber TEXT UNIQUE,
            model TEXT NOT NULL,
            isEV BOOLEAN DEFAULT 0,
            FOREIGN KEY (userID) REFERENCES users(userID) ON DELETE CASCADE
        )
    """)
    c.execute("""
        CREATE TABLE IF NOT EXISTS administrators (
            adminID INTEGER PRIMARY KEY AUTOINCREMENT,
            userID INTEGER,
            FOREIGN KEY (userID) REFERENCES users(userID) ON DELETE CASCADE
        )
    """)
    c.execute("""
        CREATE TABLE IF NOT EXISTS analysis_reports (
            reportID INTEGER PRIMARY KEY AUTOINCREMENT,
            reportType TEXT CHECK (reportType IN ('Capacity', 'Revenue', 'UserAnalysis')),
            createdAt DATETIME NOT NULL,
            data TEXT NOT NULL
        )
    """)

    conn.commit()
    conn.close()


# ---------------------- Pydantic Models ---------------------- #
# Models for Users
class UserBase(BaseModel):
    email: EmailStr
    userName: str
    phone: Optional[str] = None
    userType: str
    sbuID: Optional[int] = None
    licenseInfo: Optional[str] = None

    @validator("userType")
    def validate_user_type(cls, v):
        valid_types = [
            "Faculty member",
            "Non-resident student",
            "Resident student",
            "Visitor",
        ]
        if v not in valid_types:
            raise ValueError(f"userType must be one of {valid_types}")
        return v


class UserCreate(UserBase):
    password: constr(min_length=12)


class User(UserBase):
    userID: int


class ParkingLotBase(BaseModel):
    name: str
    location: str
    capacity: int
    evSlots: Optional[int] = 0


class ParkingLotCreate(ParkingLotBase):
    pass


class ParkingLot(ParkingLotBase):
    parkingLotID: int
    reserved_slots: int


# ---------------------- FASTAPI APP INITIALIZATION ---------------------- #
app = FastAPI()


@app.on_event("startup")
def on_startup():
    init_db()


@app.get("/")
def read_root():
    return {"message": "Hello P4SBU"}


@app.get("/favicon.ico", include_in_schema=False)
async def favicon():
    return FileResponse("favicon.ico")


# ---------------------- USER CRUD ENDPOINTS ---------------------- #
@app.post("/users", response_model=User)
def create_user(user: UserCreate, db: sqlite3.Connection = Depends(get_db)):
    cursor = db.cursor()
    try:
        cursor.execute(
            "INSERT INTO users (email, userName, phone, password, userType, sbuID, licenseInfo) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (user.email, user.userName, user.phone, user.password, user.userType, user.sbuID, user.licenseInfo),
        )
        db.commit()
        user_id = cursor.lastrowid
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=400, detail="User already exists")
    return {**user.dict(), "userID": user_id}


@app.get("/users", response_model=List[User])
def get_users(db: sqlite3.Connection = Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("SELECT userID, email, userName, phone, userType, sbuID, licenseInfo FROM users")
    rows = cursor.fetchall()
    return [dict(row) for row in rows]


@app.get("/users/{user_id}", response_model=User)
def get_user(user_id: int, db: sqlite3.Connection = Depends(get_db)):
    cursor = db.cursor()
    cursor.execute(
        "SELECT userID, email, userName, phone, userType, sbuID, licenseInfo FROM users WHERE userID = ?",
        (user_id,),
    )
    row = cursor.fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="User not found")
    return dict(row)


@app.put("/users/{user_id}", response_model=User)
def update_user(user_id: int, user: UserCreate, db: sqlite3.Connection = Depends(get_db)):
    cursor = db.cursor()
    cursor.execute(
        "UPDATE users SET email = ?, userName = ?, phone = ?, password = ?, userType = ?, sbuID = ?, licenseInfo = ? WHERE userID = ?",
        (user.email, user.userName, user.phone, user.password, user.userType, user.sbuID, user.licenseInfo, user_id),
    )
    db.commit()
    if cursor.rowcount == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {**user.dict(), "userID": user_id}


@app.delete("/users/{user_id}")
def delete_user(user_id: int, db: sqlite3.Connection = Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("DELETE FROM users WHERE userID = ?", (user_id,))
    db.commit()
    if cursor.rowcount == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "User deleted successfully"}


# ---------------------- PARKING LOT CRUD ENDPOINTS ---------------------- #
@app.post("/parking-lots", response_model=ParkingLot)
def create_parking_lot(lot: ParkingLotCreate, db: sqlite3.Connection = Depends(get_db)):
    cursor = db.cursor()
    cursor.execute(
        "INSERT INTO parking_lots (name, location, capacity, evSlots, reserved_slots) VALUES (?, ?, ?, ?, ?)",
        (lot.name, lot.location, lot.capacity, lot.evSlots, 0),
    )
    db.commit()
    lot_id = cursor.lastrowid
    return {**lot.dict(), "parkingLotID": lot_id, "reserved_slots": 0}


@app.get("/parking-lots", response_model=List[ParkingLot])
def get_parking_lots(db: sqlite3.Connection = Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("SELECT parkingLotID, name, location, capacity, evSlots, reserved_slots FROM parking_lots")
    rows = cursor.fetchall()
    return [dict(row) for row in rows]


@app.get("/parking-lots/{lot_id}", response_model=ParkingLot)
def get_parking_lot(lot_id: int, db: sqlite3.Connection = Depends(get_db)):
    cursor = db.cursor()
    cursor.execute(
        "SELECT parkingLotID, name, location, capacity, evSlots, reserved_slots FROM parking_lots WHERE parkingLotID = ?",
        (lot_id,),
    )
    row = cursor.fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Parking lot not found")
    return dict(row)


@app.put("/parking-lots/{lot_id}", response_model=ParkingLot)
def update_parking_lot(lot_id: int, lot: ParkingLotCreate, db: sqlite3.Connection = Depends(get_db)):
    cursor = db.cursor()
    cursor.execute(
        "UPDATE parking_lots SET name = ?, location = ?, capacity = ?, evSlots = ? WHERE parkingLotID = ?",
        (lot.name, lot.location, lot.capacity, lot.evSlots, lot_id),
    )
    db.commit()
    if cursor.rowcount == 0:
        raise HTTPException(status_code=404, detail="Parking lot not found")
    cursor.execute(
        "SELECT parkingLotID, name, location, capacity, evSlots, reserved_slots FROM parking_lots WHERE parkingLotID = ?",
        (lot_id,),
    )
    row = cursor.fetchone()
    return dict(row)


@app.delete("/parking-lots/{lot_id}")
def delete_parking_lot(lot_id: int, db: sqlite3.Connection = Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("DELETE FROM parking_lots WHERE parkingLotID = ?", (lot_id,))
    db.commit()
    if cursor.rowcount == 0:
        raise HTTPException(status_code=404, detail="Parking lot not found")
    return {"message": "Parking lot deleted successfully"}


# ---------------------- RUN APP ---------------------- #
if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
    # uvicorn.run("main:app", host="100.122.181.52", port=8000, reload=True)  # for tailscale
