from fastapi import FastAPI, HTTPException, Depends, Request, BackgroundTasks
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.responses import JSONResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, constr, validator, Field
from typing import List, Optional, Union, Dict, Any
from datetime import datetime, timedelta, timezone
import sqlite3
import uvicorn
import json
import jwt
from passlib.context import CryptContext
import pathfinder
import forecasting
from db_manager import get_db_connection, execute_query, execute_write_query
import asyncio
import os
from contextlib import asynccontextmanager

DATABASE = "parking.db"
SECRET_KEY = "SECRET"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")


@asynccontextmanager
async def lifespan(app: FastAPI):
    forecasting.load_forecasting_models()
    yield
    forecasting.save_forecasting_models()


# ---------------------- DATABASE SETUP ---------------------- #
def get_db():
    conn = sqlite3.connect(DATABASE, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()


def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password):
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
            expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def init_db():
    conn = sqlite3.connect(DATABASE)
    c = conn.cursor()

    c.execute("""CREATE TABLE IF NOT EXISTS users (
                userID INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                userName TEXT NOT NULL,
                password TEXT NOT NULL,
                userType TEXT DEFAULT 'Visitor' CHECK (userType IS NULL OR userType IN ('Faculty member', 'Non-resident student', 'Resident student', 'Visitor')),
                sbuID INTEGER UNIQUE,
                phone TEXT,
                licenseInfo TEXT
            )""")

    c.execute("""CREATE TABLE IF NOT EXISTS parking_lots (
                parkingLotID INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                location TEXT NOT NULL,
                capacity INTEGER NOT NULL CHECK(capacity > 0),
                evSlots INTEGER DEFAULT 0,
                reserved_slots INTEGER DEFAULT 0
            )""")

    c.execute("""CREATE TABLE IF NOT EXISTS reservations (
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
            )""")

    c.execute("""CREATE TABLE IF NOT EXISTS payments (
                paymentID INTEGER PRIMARY KEY AUTOINCREMENT,
                reservationID INTEGER,
                amount REAL NOT NULL CHECK(amount >= 0),
                paymentMethod TEXT CHECK (paymentMethod IN ('CreditCard', 'PayPal', 'Other')),
                paymentStatus TEXT CHECK (paymentStatus IN ('Pending', 'Completed', 'Failed')),
                paymentDate DATETIME NOT NULL,
                FOREIGN KEY (reservationID) REFERENCES reservations(reservationID) ON DELETE CASCADE
            )""")

    c.execute("""CREATE TABLE IF NOT EXISTS feedback (
                feedbackID INTEGER PRIMARY KEY AUTOINCREMENT,
                userID INTEGER,
                date DATETIME NOT NULL,
                message TEXT NOT NULL,
                rating INTEGER CHECK (rating BETWEEN 1 AND 5),
                FOREIGN KEY (userID) REFERENCES users(userID) ON DELETE CASCADE
            )""")

    c.execute("""CREATE TABLE IF NOT EXISTS cars (
                carID INTEGER PRIMARY KEY AUTOINCREMENT,
                userID INTEGER,
                plateNumber TEXT UNIQUE,
                model TEXT NOT NULL,
                isEV BOOLEAN DEFAULT 0,
                FOREIGN KEY (userID) REFERENCES users(userID) ON DELETE CASCADE
            )""")

    c.execute("""CREATE TABLE IF NOT EXISTS administrators (
                adminID INTEGER PRIMARY KEY AUTOINCREMENT,
                userID INTEGER,
                FOREIGN KEY (userID) REFERENCES users(userID) ON DELETE CASCADE
            )""")

    c.execute("""CREATE TABLE IF NOT EXISTS analysis_reports (
                reportID INTEGER PRIMARY KEY AUTOINCREMENT,
                reportType TEXT CHECK (reportType IN ('Capacity', 'Revenue', 'UserAnalysis')),
                createdAt DATETIME NOT NULL,
                data TEXT NOT NULL
            )""")

    conn.commit()
    conn.close()


# ---------------------- Pydantic Models ---------------------- #
# Models for Users
class UserBase(BaseModel):
    email: EmailStr
    userName: str
    phone: Optional[str] = None
    userType: Optional[str] = "Visitor"
    sbuID: Optional[int] = None
    licenseInfo: Optional[str] = None

    @validator("userType")
    def validate_user_type(cls, v):
        if v is None:
            return "Visitor"

        valid_types = [
            "Faculty member",
            "Non-resident student",
            "Resident student",
            "Visitor",
        ]
        if v not in valid_types:
            raise ValueError(f"userType must be one of {valid_types}")
        return v


class UserRegister(BaseModel):
    email: str
    userName: str
    password: str
    userType: str = None
    phone: str = None
    sbuID: str = None
    licenseInfo: str = None


class UserOut(BaseModel):
    userID: int
    userName: str
    email: EmailStr
    phone: Optional[str] = None
    userType: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str
    userID: int


class TokenData(BaseModel):
    email: Optional[str] = None
    userID: Optional[int] = None


class ParkingLotCreate(BaseModel):
    name: str
    location: str
    capacity: int
    evSlots: int = 0


class ParkingLotOut(BaseModel):
    parkingLotID: int
    name: str
    location: str
    capacity: int
    evSlots: int
    reserved_slots: int


class CarCreate(BaseModel):
    plateNumber: str
    model: str
    isEV: bool = False


class CarOut(BaseModel):
    carID: int
    plateNumber: str
    model: str
    isEV: bool


class ReservationCreate(BaseModel):
    userID: int
    parkingLotID: int
    startTime: datetime
    endTime: datetime


class ReservationOut(BaseModel):
    reservationID: int
    userID: int
    parkingLotID: int
    startTime: str
    endTime: str
    price: float
    reservationStatus: str


class PathRequest(BaseModel):
    start_lat: float = Field(..., description="Starting point latitude")
    start_lng: float = Field(..., description="Starting point longitude")
    end_id: int = Field(..., description="Destination parking lot ID")


class NearestLotsRequest(BaseModel):
    start_lat: float = Field(..., description="Starting point latitude")
    start_lng: float = Field(..., description="Starting point longitude")
    limit: Optional[int] = Field(5, description="Maximum number of lots to return")
    min_available: Optional[int] = Field(
        1, description="Minimum number of available spaces"
    )
    prefer_ev: Optional[bool] = Field(
        False, description="Whether to prioritize lots with EV charging"
    )


async def get_current_user(
        token: str = Depends(oauth2_scheme), db: sqlite3.Connection = Depends(get_db)
):
    credentials_exception = HTTPException(
        status_code=401,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        user_id: int = payload.get("user_id")
        if email is None or user_id is None:
            raise credentials_exception
        token_data = TokenData(email=email, userID=user_id)
    except jwt.PyJWTError:
        raise credentials_exception

    cursor = db.cursor()
    cursor.execute("SELECT * FROM users WHERE email = ?", (token_data.email,))
    user = cursor.fetchone()
    if user is None:
        raise credentials_exception
    return user


async def get_current_admin(
        current_user: dict = Depends(get_current_user),
        db: sqlite3.Connection = Depends(get_db),
):
    cursor = db.cursor()
    cursor.execute(
        "SELECT * FROM administrators WHERE userID = ?", (current_user["userID"],)
    )
    admin = cursor.fetchone()
    if admin is None:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return current_user


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------- NEW PYDANTIC MODELS ---------------------- #
class ForecastRequest(BaseModel):
    parkingLotID: int
    hours_ahead: Optional[int] = 12


class BestTimeRequest(BaseModel):
    parkingLotID: int
    time_window_hours: Optional[int] = 24


class LiveStatusResponse(BaseModel):
    parkingLotID: int
    name: str
    location: str
    totalSpots: int
    occupiedSpots: int
    availableSpots: int
    occupancyPercentage: float
    status: str
    lastUpdated: str


@app.on_event("startup")
def on_startup():
    init_db()


@app.get("/")
def read_root():
    return {
        "message": "Welcome to P4SBU Parking System API - Phase 2",
        "version": "2.0",
        "endpoints": {
            "auth": "/token",
            "users": "/user/*",
            "parking": "/parking/*",
            "parking_live_status": "/parking/live-status",
            "reservations": "/reservation/*",
            "admin": "/admin/*",
        },
    }


@app.get("/favicon.ico", include_in_schema=False)
async def favicon():
    return FileResponse("favicon.ico")


@app.post("/token", response_model=Token)
def login_for_access_token(
        form_data: OAuth2PasswordRequestForm = Depends(),
        db: sqlite3.Connection = Depends(get_db),
):
    cursor = db.cursor()
    cursor.execute("SELECT * FROM users WHERE email = ?", (form_data.username,))
    user = cursor.fetchone()

    if user is None or not verify_password(form_data.password, user["password"]):
        raise HTTPException(
            status_code=401,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user["email"], "user_id": user["userID"]},
        expires_delta=access_token_expires,
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "userID": user["userID"],
    }


@app.post("/user/register", response_model=UserOut)
def register_user(user: UserRegister, db: sqlite3.Connection = Depends(get_db)):
    cursor = db.cursor()
    hashed_password = get_password_hash(user.password)
    print('got here')
    userType = user.userType if hasattr(user, 'userType') and user.userType else "Visitor"
    phone = user.phone if hasattr(user, 'phone') and user.phone else None
    sbuID = user.sbuID if hasattr(user, 'sbuID') and user.sbuID else None
    licenseInfo = user.licenseInfo if hasattr(user, 'licenseInfo') and user.licenseInfo else None

    print(userType, phone, sbuID, licenseInfo)

    try:
        cursor.execute(
            "INSERT INTO users (email, userName, phone, password, userType, sbuID, licenseInfo) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (
                user.email,
                user.userName,
                phone,
                hashed_password,
                userType,
                sbuID,
                licenseInfo,
            ),
        )
        db.commit()
        user_id = cursor.lastrowid
    except sqlite3.IntegrityError as e:
        print(f"Registration error: {str(e)}")
        raise HTTPException(status_code=400, detail="Email already registered or SBU ID already exists")

    return UserOut(
        userID=user_id,
        userName=user.userName,
        email=user.email,
        phone=phone,
        userType=userType,
    )


@app.post("/user/login", response_model=Token)
@app.post("/user/login")
def login_user(user: UserLogin, db: sqlite3.Connection = Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("SELECT * FROM users WHERE email = ?", (user.email,))
    row = cursor.fetchone()

    if row is None or not verify_password(user.password, row["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": row["email"], "user_id": row["userID"]},
        expires_delta=access_token_expires,
    )

    return {"token": access_token, "userId": row["userID"]}


@app.get("/user/{user_id}", response_model=UserOut)
def get_user(
        user_id: int,
        db: sqlite3.Connection = Depends(get_db),
        # current_user: dict = Depends(get_current_user),
):
    # if current_user["userID"] != user_id:
    #     admin_cursor = db.cursor()
    #     admin_cursor.execute(
    #         "SELECT * FROM administrators WHERE userID = ?", (current_user["userID"],)
    #     )
    #     admin = admin_cursor.fetchone()
    #     if admin is None:
    #         raise HTTPException(
    #             status_code=403, detail="Not authorized to view this user's information"
    #         )

    cursor = db.cursor()
    cursor.execute(
        "SELECT userID, userName, email, phone, userType FROM users WHERE userID = ?",
        (user_id,),
    )
    row = cursor.fetchone()

    if row is None:
        raise HTTPException(status_code=404, detail="User not found")

    return UserOut(**dict(row))


@app.post("/user/{user_id}/cars", response_model=CarOut)
def add_car(
        user_id: int,
        car: CarCreate,
        db: sqlite3.Connection = Depends(get_db),
        current_user: dict = Depends(get_current_user),
):
    if current_user["userID"] != user_id:
        raise HTTPException(
            status_code=403, detail="Not authorized to add cars for this user"
        )

    cursor = db.cursor()
    try:
        cursor.execute(
            "INSERT INTO cars (userID, plateNumber, model, isEV) VALUES (?, ?, ?, ?)",
            (user_id, car.plateNumber, car.model, car.isEV),
        )
        db.commit()
        car_id = cursor.lastrowid
    except sqlite3.IntegrityError:
        raise HTTPException(
            status_code=400, detail="Car with this plate number already exists"
        )

    return CarOut(
        carID=car_id, plateNumber=car.plateNumber, model=car.model, isEV=car.isEV
    )


@app.get("/user/{user_id}/cars", response_model=List[CarOut])
def get_cars(
        user_id: int,
        db: sqlite3.Connection = Depends(get_db),
        current_user: dict = Depends(get_current_user),
):
    if current_user["userID"] != user_id:
        raise HTTPException(
            status_code=403, detail="Not authorized to view cars for this user"
        )

    cursor = db.cursor()
    cursor.execute("SELECT * FROM cars WHERE userID = ?", (user_id,))
    rows = cursor.fetchall()
    return [CarOut(**dict(row)) for row in rows]


# ---------------------- PARKING LOT CRUD ENDPOINTS ---------------------- #
@app.get("/parking/lots", response_model=List[ParkingLotOut])
def get_parking_lots(db: sqlite3.Connection = Depends(get_db)):
    try:
        cursor = db.cursor()
        cursor.execute("SELECT * FROM parking_lots")
        lots = cursor.fetchall()

        if not lots:
            print(f"Warning: No parking lots found in database")
            return []

        return [ParkingLotOut(**dict(lot)) for lot in lots]
    except Exception as e:
        import traceback

        print(f"ERROR in get_parking_lots: {e}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@app.get("/parking/campus/list", response_model=List[str])
def get_campus_list(db: sqlite3.Connection = Depends(get_db)):
    try:
        cursor = db.cursor()
        cursor.execute(
            "SELECT DISTINCT substr(location, instr(location, ', ') + 2) AS campus FROM parking_lots ORDER BY campus")
        results = cursor.fetchall()

        campuses = [row["campus"] for row in results if row["campus"]]
        return campuses
    except Exception as e:
        import traceback
        print(f"ERROR in get_campus_list: {e}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@app.get("/parking/campus/{campus}", response_model=List[ParkingLotOut])
def get_parking_lots_by_campus(campus: str, db: sqlite3.Connection = Depends(get_db)):
    try:
        cursor = db.cursor()

        search_pattern = f"%{campus}%"
        cursor.execute(
            "SELECT * FROM parking_lots WHERE location LIKE ?", (search_pattern,)
        )
        lots = cursor.fetchall()

        if not lots:
            print(f"Warning: No parking lots found for campus: {campus}")
            return []

        return [ParkingLotOut(**dict(lot)) for lot in lots]
    except Exception as e:
        import traceback

        print(f"ERROR in get_parking_lots_by_campus: {e}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@app.get("/parking/lots/{parking_lot_id}", response_model=ParkingLotOut)
def get_parking_lot(parking_lot_id: int, db: sqlite3.Connection = Depends(get_db)):
    cursor = db.cursor()
    cursor.execute(
        "SELECT * FROM parking_lots WHERE parkingLotID = ?", (parking_lot_id,)
    )
    row = cursor.fetchone()

    if row is None:
        raise HTTPException(status_code=404, detail="Parking lot not found")

    return ParkingLotOut(**dict(row))


@app.post("/parking/lots", response_model=ParkingLotOut)
def create_parking_lot(
        parking_lot: ParkingLotCreate,
        db: sqlite3.Connection = Depends(get_db),
        current_user: dict = Depends(get_current_admin),
):
    cursor = db.cursor()
    cursor.execute(
        "INSERT INTO parking_lots (name, location, capacity, evSlots, reserved_slots) VALUES (?, ?, ?, ?, ?)",
        (
            parking_lot.name,
            parking_lot.location,
            parking_lot.capacity,
            parking_lot.evSlots,
            0,
        ),
    )
    db.commit()
    lot_id = cursor.lastrowid

    return ParkingLotOut(
        parkingLotID=lot_id,
        name=parking_lot.name,
        location=parking_lot.location,
        capacity=parking_lot.capacity,
        evSlots=parking_lot.evSlots,
        reserved_slots=0,
    )


@app.post("/parking/path")
def find_path_to_lot_post(request: PathRequest):
    params = {
        "start_lat": request.start_lat,
        "start_lng": request.start_lng,
        "end_id": request.end_id,
    }

    try:
        return pathfinder.find_path(**params)
    except Exception as e:
        import traceback

        print(f"Error in find_path_to_lot_post: {e}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/parking/path")
def find_path_to_lot_get(start_lat: float, start_lng: float, end_id: int):
    params = {
        "start_lat": float(start_lat),
        "start_lng": float(start_lng),
        "end_id": int(end_id),
    }

    try:
        return pathfinder.find_path(**params)
    except Exception as e:
        import traceback

        print(f"Error in find_path_to_lot_get: {e}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/parking/nearest")
def find_nearest_lots_post(request: NearestLotsRequest):
    return pathfinder.find_nearest_available_lots(
        start_lat=request.start_lat,
        start_lng=request.start_lng,
        limit=request.limit,
        min_available=request.min_available,
        prefer_ev=request.prefer_ev,
    )


@app.get("/parking/nearest")
def find_nearest_lots_get(
        start_lat: float,
        start_lng: float,
        limit: Optional[int] = 5,
        min_available: Optional[int] = 1,
        prefer_ev: Optional[bool] = False,
        max_distance: Optional[float] = None,
):
    return pathfinder.find_nearest_available_lots(
        start_lat=start_lat,
        start_lng=start_lng,
        limit=limit,
        min_available=min_available,
        prefer_ev=prefer_ev,
        max_distance=max_distance,
    )


@app.get("/parking/map")
def get_parking_map_data():
    return pathfinder.get_parking_lot_info()


@app.get("/parking/forecast/{parking_lot_id}")
def get_parking_forecast(parking_lot_id: int, hours_ahead: Optional[int] = 12):
    """Get parking lot occupancy forecast for the specified hours ahead."""
    try:
        forecast_data = forecasting.get_parking_lot_forecast(
            lot_id=parking_lot_id,
            hours_ahead=min(24, max(1, hours_ahead))  # Limit to 1-24 hours
        )
        return {"forecast": forecast_data}
    except Exception as e:
        import traceback
        print(f"Error in get_parking_forecast: {e}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/parking/forecast")
def get_parking_forecast_post(request: ForecastRequest):
    """Get parking lot occupancy forecast for the specified hours ahead (POST endpoint)."""
    return get_parking_forecast(
        parking_lot_id=request.parkingLotID,
        hours_ahead=request.hours_ahead
    )


@app.get("/parking/best-time/{parking_lot_id}")
def get_best_parking_time(parking_lot_id: int, time_window_hours: Optional[int] = 24):
    """Find the best time to park in the given time window."""
    try:
        best_time = forecasting.get_best_parking_time(
            lot_id=parking_lot_id,
            time_window_hours=min(48, max(3, time_window_hours))  # Limit to 3-48 hours
        )
        return best_time
    except Exception as e:
        import traceback
        print(f"Error in get_best_parking_time: {e}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/parking/best-time")
def get_best_parking_time_post(request: BestTimeRequest):
    """Find the best time to park in the given time window (POST endpoint)."""
    return get_best_parking_time(
        parking_lot_id=request.parkingLotID,
        time_window_hours=request.time_window_hours
    )


@app.get("/parking/live-status", response_model=List[LiveStatusResponse])
def get_all_live_status(db: sqlite3.Connection = Depends(get_db)):
    try:
        cursor = db.cursor()
        cursor.execute("""
            SELECT p.parkingLotID, p.name, p.location, p.capacity, p.reserved_slots
            FROM parking_lots p
            ORDER BY p.parkingLotID
        """)
        lots = cursor.fetchall()
        
        current_time = datetime.now().isoformat()
        result = []
        
        for lot in lots:
            capacity = lot["capacity"]
            reserved = lot["reserved_slots"]
            available = capacity - reserved
            occupancy_percentage = (reserved / capacity * 100) if capacity > 0 else 0
            
            status = "Available"
            if occupancy_percentage > 80:
                status = "Busy"
            elif occupancy_percentage > 50:
                status = "Moderate"
            
            result.append(LiveStatusResponse(
                parkingLotID=lot["parkingLotID"],
                name=lot["name"],
                location=lot["location"],
                totalSpots=capacity,
                occupiedSpots=reserved,
                availableSpots=available,
                occupancyPercentage=round(occupancy_percentage, 1),
                status=status,
                lastUpdated=current_time
            ))
        
        return result
    except Exception as e:
        import traceback
        print(f"Error in get_all_live_status: {e}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/parking/live-status/{parking_lot_id}", response_model=LiveStatusResponse)
def get_parking_lot_live_status(parking_lot_id: int, db: sqlite3.Connection = Depends(get_db)):
    try:
        cursor = db.cursor()
        cursor.execute("""
            SELECT p.parkingLotID, p.name, p.location, p.capacity, p.reserved_slots
            FROM parking_lots p
            WHERE p.parkingLotID = ?
        """, (parking_lot_id,))
        lot = cursor.fetchone()
        
        if not lot:
            raise HTTPException(status_code=404, detail="Parking lot not found")
        
        capacity = lot["capacity"]
        reserved = lot["reserved_slots"]
        available = capacity - reserved
        occupancy_percentage = (reserved / capacity * 100) if capacity > 0 else 0
        
        status = "Available"
        if occupancy_percentage > 80:
            status = "Busy"
        elif occupancy_percentage > 50:
            status = "Moderate"
        
        current_time = datetime.now().isoformat()
        
        return LiveStatusResponse(
            parkingLotID=lot["parkingLotID"],
            name=lot["name"],
            location=lot["location"],
            totalSpots=capacity,
            occupiedSpots=reserved,
            availableSpots=available,
            occupancyPercentage=round(occupancy_percentage, 1),
            status=status,
            lastUpdated=current_time
        )
    except Exception as e:
        import traceback
        print(f"Error in get_parking_lot_live_status: {e}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/reservation", response_model=ReservationOut)
async def create_reservation(
        reservation: ReservationCreate,
        current_user: dict = Depends(get_current_user),
):
    """
    Create a new parking reservation with optimized handling for concurrent requests.
    Uses optimistic concurrency control with retry logic for better performance under load.
    """
    if current_user["userID"] != reservation.userID:
        raise HTTPException(
            status_code=403,
            detail="Not authorized to create reservations for other users",
        )
    
    import reservation_handler
    
    result = reservation_handler.create_reservation(
        user_id=reservation.userID,
        parking_lot_id=reservation.parkingLotID,
        start_time=reservation.startTime,
        end_time=reservation.endTime
    )
    
    return ReservationOut(
        reservationID=result["reservationID"],
        userID=result["userID"],
        parkingLotID=result["parkingLotID"],
        startTime=result["startTime"],
        endTime=result["endTime"],
        price=result["price"],
        reservationStatus=result["reservationStatus"],
    )


@app.get("/reservation/{reservation_id}", response_model=ReservationOut)
def get_reservation(
        reservation_id: int,
        db: sqlite3.Connection = Depends(get_db),
        current_user: dict = Depends(get_current_user),
):
    cursor = db.cursor()
    cursor.execute(
        "SELECT * FROM reservations WHERE reservationID = ?", (reservation_id,)
    )
    res = cursor.fetchone()

    if res is None:
        raise HTTPException(status_code=404, detail="Reservation not found")

    if res["userID"] != current_user["userID"]:
        cursor.execute(
            "SELECT * FROM administrators WHERE userID = ?", (current_user["userID"],)
        )
        admin = cursor.fetchone()
        if admin is None:
            raise HTTPException(
                status_code=403, detail="Not authorized to view this reservation"
            )

    return ReservationOut(**dict(res))


@app.get("/user/{user_id}/reservations", response_model=List[ReservationOut])
def get_user_reservations(
        user_id: int,
        db: sqlite3.Connection = Depends(get_db),
        current_user: dict = Depends(get_current_user),
):
    if current_user["userID"] != user_id:
        cursor = db.cursor()
        cursor.execute(
            "SELECT * FROM administrators WHERE userID = ?", (current_user["userID"],)
        )
        admin = cursor.fetchone()
        if admin is None:
            raise HTTPException(
                status_code=403,
                detail="Not authorized to view reservations for this user",
            )

    cursor = db.cursor()
    cursor.execute(
        "SELECT * FROM reservations WHERE userID = ? ORDER BY startTime DESC",
        (user_id,),
    )
    reservations = cursor.fetchall()

    return [ReservationOut(**dict(res)) for res in reservations]


@app.delete("/reservation/{reservation_id}")
def cancel_reservation(
        reservation_id: int,
        db: sqlite3.Connection = Depends(get_db),
        current_user: dict = Depends(get_current_user),
):
    cursor = db.cursor()
    is_admin = False
    
    cursor.execute(
        "SELECT * FROM administrators WHERE userID = ?", (current_user["userID"],)
    )
    admin = cursor.fetchone()
    if admin is not None:
        is_admin = True
    
    import reservation_handler
    result = reservation_handler.cancel_reservation(
        reservation_id=reservation_id,
        user_id=current_user["userID"],
        is_admin=is_admin
    )
    
    return result


@app.get("/admin/users", response_model=List[UserOut])
def get_all_users(
        db: sqlite3.Connection = Depends(get_db),
        current_user: dict = Depends(get_current_admin),
):
    cursor = db.cursor()
    cursor.execute("SELECT userID, userName, email, phone, userType FROM users")
    rows = cursor.fetchall()
    return [UserOut(**dict(row)) for row in rows]


@app.get("/admin/parking-status")
def get_parking_status(
        db: sqlite3.Connection = Depends(get_db),
        current_user: dict = Depends(get_current_admin),
):
    cursor = db.cursor()
    cursor.execute(
        "SELECT SUM(capacity) as total, SUM(reserved_slots) as reserved FROM parking_lots"
    )
    row = cursor.fetchone()

    total = row["total"] if row["total"] is not None else 0
    reserved = row["reserved"] if row["reserved"] is not None else 0
    available = total - reserved

    return {"totalSlots": total, "reservedSlots": reserved, "availableSlots": available}


# ---------------------- RUN APP ---------------------- #
if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
    # uvicorn.run("main:app", host="100.122.181.52", port=8000, reload=True)  # for tailscale
