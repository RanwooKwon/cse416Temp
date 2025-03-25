from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.responses import JSONResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, constr, validator, Field
from typing import List, Optional, Union, Dict, Any
from datetime import datetime, timedelta
import sqlite3
import uvicorn
import json
import jwt
from passlib.context import CryptContext
import pathfinder

DATABASE = "parking.db"
SECRET_KEY = "SECRET"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")


# ---------------------- DATABASE SETUP ---------------------- #
def get_db():
    conn = sqlite3.connect(DATABASE)
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
    expire = datetime.utcnow() + (
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
                userType TEXT CHECK (userType IN ('Faculty member', 'Non-resident student', 'Resident student', 'Visitor')),
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


class UserRegister(UserBase):
    password: constr(min_length=12)


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


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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
            "reservations": "/reservation/*",
            "admin": "/admin/*",
        },
    }


@app.get("/favicon.ico", include_in_schema=False)
async def favicon():
    return FileResponse("favicon.ico")


@app.post("/token", response_model=Token)
async def login_for_access_token(
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

    try:
        cursor.execute(
            "INSERT INTO users (email, userName, phone, password, userType, sbuID, licenseInfo) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (
                user.email,
                user.userName,
                user.phone,
                hashed_password,
                user.userType,
                user.sbuID,
                user.licenseInfo,
            ),
        )
        db.commit()
        user_id = cursor.lastrowid
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=400, detail="Email already registered")

    return UserOut(
        userID=user_id,
        userName=user.userName,
        email=user.email,
        phone=user.phone,
        userType=user.userType,
    )


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
    current_user: dict = Depends(get_current_user),
):
    if current_user["userID"] != user_id:
        admin_cursor = db.cursor()
        admin_cursor.execute(
            "SELECT * FROM administrators WHERE userID = ?", (current_user["userID"],)
        )
        admin = admin_cursor.fetchone()
        if admin is None:
            raise HTTPException(
                status_code=403, detail="Not authorized to view this user's information"
            )

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
        cursor.execute("SELECT DISTINCT substr(location, instr(location, ', ') + 2) AS campus FROM parking_lots ORDER BY campus")
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
):
    return pathfinder.find_nearest_available_lots(
        start_lat=start_lat,
        start_lng=start_lng,
        limit=limit,
        min_available=min_available,
        prefer_ev=prefer_ev,
    )


@app.get("/parking/map")
def get_parking_map_data():
    return pathfinder.get_parking_lot_info()


@app.post("/reservation", response_model=ReservationOut)
def create_reservation(
    reservation: ReservationCreate,
    db: sqlite3.Connection = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    if current_user["userID"] != reservation.userID:
        raise HTTPException(
            status_code=403,
            detail="Not authorized to create reservations for other users",
        )

    cursor = db.cursor()

    cursor.execute(
        """SELECT * FROM reservations 
           WHERE parkingLotID = ? 
           AND reservationStatus IN ('Pending', 'Completed') 
           AND NOT (endTime <= ? OR startTime >= ?)""",
        (
            reservation.parkingLotID,
            reservation.startTime.isoformat(),
            reservation.endTime.isoformat(),
        ),
    )
    conflicting = cursor.fetchall()

    if conflicting:
        raise HTTPException(status_code=400, detail="Time slot unavailable")

    cursor.execute(
        "SELECT capacity, reserved_slots FROM parking_lots WHERE parkingLotID = ?",
        (reservation.parkingLotID,),
    )
    lot = cursor.fetchone()

    if not lot:
        raise HTTPException(status_code=404, detail="Parking lot not found")

    if lot["reserved_slots"] >= lot["capacity"]:
        raise HTTPException(status_code=400, detail="Parking lot is full")

    duration_hours = (
        reservation.endTime - reservation.startTime
    ).total_seconds() / 3600.0
    price = round(2 * duration_hours, 2)

    created_at = datetime.now().isoformat()
    cursor.execute(
        """INSERT INTO reservations 
           (userID, parkingLotID, startTime, endTime, price, reservationStatus, created_at) 
           VALUES (?, ?, ?, ?, ?, ?, ?)""",
        (
            reservation.userID,
            reservation.parkingLotID,
            reservation.startTime.isoformat(),
            reservation.endTime.isoformat(),
            price,
            "Completed",
            created_at,
        ),
    )
    db.commit()
    reservation_id = cursor.lastrowid

    cursor.execute(
        "UPDATE parking_lots SET reserved_slots = reserved_slots + 1 WHERE parkingLotID = ?",
        (reservation.parkingLotID,),
    )
    db.commit()

    payment_date = datetime.now().isoformat()
    cursor.execute(
        """INSERT INTO payments 
           (reservationID, amount, paymentMethod, paymentStatus, paymentDate) 
           VALUES (?, ?, ?, ?, ?)""",
        (reservation_id, price, "CreditCard", "Completed", payment_date),
    )
    db.commit()

    return ReservationOut(
        reservationID=reservation_id,
        userID=reservation.userID,
        parkingLotID=reservation.parkingLotID,
        startTime=reservation.startTime.isoformat(),
        endTime=reservation.endTime.isoformat(),
        price=price,
        reservationStatus="Completed",
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
    cursor.execute(
        "SELECT * FROM reservations WHERE reservationID = ?", (reservation_id,)
    )
    res = cursor.fetchone()

    if res is None or res["reservationStatus"] == "Cancelled":
        raise HTTPException(
            status_code=400, detail="Cancellation failed: invalid reservation"
        )

    if res["userID"] != current_user["userID"]:
        cursor.execute(
            "SELECT * FROM administrators WHERE userID = ?", (current_user["userID"],)
        )
        admin = cursor.fetchone()
        if admin is None:
            raise HTTPException(
                status_code=403, detail="Not authorized to cancel this reservation"
            )

    cancellation_time = datetime.now()
    start_time = datetime.fromisoformat(res["startTime"])
    cancellation_deadline = start_time - timedelta(days=3)

    if cancellation_time <= cancellation_deadline:
        refund_amount = res["price"]
        refund_message = "Cancellation confirmed with full refund"
    elif cancellation_time <= start_time:
        refund_amount = res["price"] * 0.5
        refund_message = "Cancellation confirmed with partial refund"
    else:
        refund_amount = 0
        refund_message = "Cancellation confirmed with no refund"

    cursor.execute(
        "UPDATE reservations SET reservationStatus = ? WHERE reservationID = ?",
        ("Cancelled", reservation_id),
    )

    cursor.execute(
        "UPDATE parking_lots SET reserved_slots = reserved_slots - 1 WHERE parkingLotID = ?",
        (res["parkingLotID"],),
    )

    if refund_amount > 0:
        payment_date = datetime.now().isoformat()
        cursor.execute(
            "INSERT INTO payments (reservationID, amount, paymentMethod, paymentStatus, paymentDate) VALUES (?, ?, ?, ?, ?)",
            (reservation_id, -refund_amount, "CreditCard", "Completed", payment_date),
        )

    db.commit()
    return {"message": refund_message}


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
