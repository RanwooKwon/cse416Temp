import time
import random
from datetime import datetime, timedelta
import sqlite3
from fastapi import HTTPException
from typing import Dict, Any, List, Optional, Tuple

from db_manager import get_db_connection, execute_query

MAX_RETRIES = 3
RETRY_BACKOFF_BASE = 0.1  # seconds


def retry_on_conflict(func):
    def wrapper(*args, **kwargs):
        retry_count = 0
        last_error = None

        while retry_count < MAX_RETRIES:
            try:
                return func(*args, **kwargs)
            except sqlite3.OperationalError as e:
                if "database is locked" in str(e) or "busy" in str(e):
                    retry_count += 1
                    backoff = (
                        RETRY_BACKOFF_BASE * (2**retry_count) * (0.5 + random.random())
                    )
                    print(
                        f"Database busy, retrying in {backoff:.2f} seconds (attempt {retry_count}/{MAX_RETRIES})"
                    )
                    time.sleep(backoff)
                    last_error = e
                else:
                    raise
            except Exception as e:
                raise

        if last_error:
            raise last_error

    return wrapper


def check_time_slot_availability(
    parking_lot_id: int, start_time: datetime, end_time: datetime
) -> Tuple[bool, str]:
    start_time_str = start_time.isoformat()
    end_time_str = end_time.isoformat()

    query = """
    SELECT reserved_slots FROM parking_lots WHERE parkingLotID = ?
    """

    results = execute_query(query, (parking_lot_id,))

    if not results:
        return False, "Parking lot not found"

    lot_query = (
        "SELECT capacity, reserved_slots FROM parking_lots WHERE parkingLotID = ?"
    )
    lots = execute_query(lot_query, (parking_lot_id,))

    if not lots:
        return False, "Parking lot not found"

    lot = lots[0]

    if lot["reserved_slots"] >= lot["capacity"]:
        return False, "Parking lot is full"

    return True, "Available"


@retry_on_conflict
def create_reservation(
    user_id: int, parking_lot_id: int, start_time: datetime, end_time: datetime
) -> Dict[str, Any]:
    available, reason = check_time_slot_availability(
        parking_lot_id, start_time, end_time
    )
    if not available:
        raise HTTPException(status_code=400, detail=reason)

    duration_hours = (end_time - start_time).total_seconds() / 3600.0
    price = round(2 * duration_hours, 2)

    with get_db_connection() as conn:
        try:
            conn.execute("BEGIN IMMEDIATE")
            cursor = conn.cursor()

            cursor.execute(
                "SELECT capacity, reserved_slots FROM parking_lots WHERE parkingLotID = ?",
                (parking_lot_id,),
            )
            lot_check = cursor.fetchone()

            if not lot_check:
                conn.rollback()
                raise HTTPException(status_code=404, detail="Parking lot not found")

            if lot_check["reserved_slots"] >= lot_check["capacity"]:
                conn.rollback()
                raise HTTPException(status_code=400, detail="Parking lot is full")

            created_at = datetime.now().isoformat()
            cursor.execute(
                """INSERT INTO reservations 
                   (userID, parkingLotID, startTime, endTime, price, reservationStatus, created_at) 
                   VALUES (?, ?, ?, ?, ?, ?, ?)""",
                (
                    user_id,
                    parking_lot_id,
                    start_time.isoformat(),
                    end_time.isoformat(),
                    price,
                    "Completed",
                    created_at,
                ),
            )
            reservation_id = cursor.lastrowid

            cursor.execute(
                "UPDATE parking_lots SET reserved_slots = reserved_slots + 1 WHERE parkingLotID = ?",
                (parking_lot_id,),
            )

            payment_date = datetime.now().isoformat()
            cursor.execute(
                """INSERT INTO payments 
                   (reservationID, amount, paymentMethod, paymentStatus, paymentDate) 
                   VALUES (?, ?, ?, ?, ?)""",
                (reservation_id, price, "CreditCard", "Completed", payment_date),
            )

            conn.commit()

            return {
                "reservationID": reservation_id,
                "userID": user_id,
                "parkingLotID": parking_lot_id,
                "startTime": start_time.isoformat(),
                "endTime": end_time.isoformat(),
                "price": price,
                "reservationStatus": "Completed",
            }

        except sqlite3.Error as e:
            conn.rollback()
            print(f"Database error in create_reservation: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
        except Exception as e:
            conn.rollback()
            import traceback

            print(f"Reservation error: {str(e)}")
            print(traceback.format_exc())
            raise HTTPException(status_code=500, detail=f"Reservation failed: {str(e)}")


@retry_on_conflict
def cancel_reservation(
    reservation_id: int, user_id: int, is_admin: bool = False
) -> Dict[str, str]:
    with get_db_connection() as conn:
        try:
            conn.execute("BEGIN IMMEDIATE")
            cursor = conn.cursor()

            cursor.execute(
                "SELECT * FROM reservations WHERE reservationID = ?", (reservation_id,)
            )
            res = cursor.fetchone()

            if not res:
                conn.rollback()
                raise HTTPException(status_code=404, detail="Reservation not found")

            if res["reservationStatus"] == "Cancelled":
                conn.rollback()
                raise HTTPException(
                    status_code=400, detail="Reservation already cancelled"
                )

            if not is_admin and res["userID"] != user_id:
                conn.rollback()
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
                    """INSERT INTO payments 
                       (reservationID, amount, paymentMethod, paymentStatus, paymentDate) 
                       VALUES (?, ?, ?, ?, ?)""",
                    (
                        reservation_id,
                        abs(refund_amount),
                        "CreditCard",
                        "Completed",
                        payment_date,
                    ),
                )

            conn.commit()
            return {"message": refund_message}

        except sqlite3.Error as e:
            conn.rollback()
            print(f"Database error in cancel_reservation: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
        except Exception as e:
            conn.rollback()
            import traceback

            print(f"Cancellation error: {str(e)}")
            print(traceback.format_exc())
            raise HTTPException(
                status_code=500, detail=f"Cancellation failed: {str(e)}"
            )
