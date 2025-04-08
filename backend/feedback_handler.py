from datetime import datetime
import sqlite3
from fastapi import HTTPException
from typing import Dict, Any, List, Optional

from db_manager import get_db_connection, execute_query, execute_write_query


def create_feedback(
    user_id: int, message: str, rating: Optional[int] = None, reply: Optional[str] = None, feedback_type: Optional[str] = None
) -> Dict[str, Any]:
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            current_date = datetime.now().isoformat()
            
            cursor.execute(
                """INSERT INTO feedback 
                   (userID, date, message, rating, reply, type) 
                   VALUES (?, ?, ?, ?, ?, ?)""",
                (user_id, current_date, message, rating, reply, feedback_type),
            )
            conn.commit()
            feedback_id = cursor.lastrowid
            
            return {
                "feedbackID": feedback_id,
                "userID": user_id,
                "date": current_date,
                "message": message,
                "rating": rating,
                "reply": reply,
                "type": feedback_type
            }
    except sqlite3.Error as e:
        print(f"Database error in create_feedback: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    except Exception as e:
        import traceback
        print(f"Feedback creation error: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Feedback creation failed: {str(e)}")


def update_feedback(
    feedback_id: int, 
    user_id: int, 
    is_admin: bool = False,
    message: Optional[str] = None,
    rating: Optional[int] = None,
    reply: Optional[str] = None,
    feedback_type: Optional[str] = None
) -> Dict[str, Any]:
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            
            cursor.execute(
                "SELECT * FROM feedback WHERE feedbackID = ?", (feedback_id,)
            )
            existing_feedback = cursor.fetchone()
            
            if not existing_feedback:
                raise HTTPException(status_code=404, detail="Feedback not found")
                
            if not is_admin and existing_feedback["userID"] != user_id:
                raise HTTPException(
                    status_code=403, detail="Not authorized to update this feedback"
                )
            
            update_fields = []
            params = []
            
            if message is not None:
                update_fields.append("message = ?")
                params.append(message)
                
            if rating is not None:
                update_fields.append("rating = ?")
                params.append(rating)
                
            if reply is not None:
                update_fields.append("reply = ?")
                params.append(reply)
                
            if feedback_type is not None:
                update_fields.append("type = ?")
                params.append(feedback_type)
                
            if not update_fields:
                raise HTTPException(status_code=400, detail="No fields to update")
                
            params.append(feedback_id)
            set_clause = ", ".join(update_fields)
            
            cursor.execute(
                f"UPDATE feedback SET {set_clause} WHERE feedbackID = ?",
                tuple(params)
            )
            conn.commit()
            
            cursor.execute("SELECT * FROM feedback WHERE feedbackID = ?", (feedback_id,))
            updated_feedback = cursor.fetchone()
            
            return dict(updated_feedback)
    except sqlite3.Error as e:
        print(f"Database error in update_feedback: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"Feedback update error: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Feedback update failed: {str(e)}")


def delete_feedback(feedback_id: int, user_id: int, is_admin: bool = False) -> Dict[str, str]:
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            
            cursor.execute(
                "SELECT * FROM feedback WHERE feedbackID = ?", (feedback_id,)
            )
            existing_feedback = cursor.fetchone()
            
            if not existing_feedback:
                raise HTTPException(status_code=404, detail="Feedback not found")
                
            if not is_admin and existing_feedback["userID"] != user_id:
                raise HTTPException(
                    status_code=403, detail="Not authorized to delete this feedback"
                )
                
            cursor.execute("DELETE FROM feedback WHERE feedbackID = ?", (feedback_id,))
            conn.commit()
            
            return {"message": "Feedback deleted successfully"}
    except sqlite3.Error as e:
        print(f"Database error in delete_feedback: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"Feedback deletion error: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Feedback deletion failed: {str(e)}")


def get_feedback(feedback_id: int) -> Dict[str, Any]:
    try:
        feedback = execute_query("SELECT * FROM feedback WHERE feedbackID = ?", (feedback_id,))
        
        if not feedback:
            raise HTTPException(status_code=404, detail="Feedback not found")
            
        return feedback[0]
    except sqlite3.Error as e:
        print(f"Database error in get_feedback: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"Error retrieving feedback: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Failed to retrieve feedback: {str(e)}")


def get_user_feedback(user_id: int) -> List[Dict[str, Any]]:
    try:
        feedback = execute_query("SELECT * FROM feedback WHERE userID = ? ORDER BY date DESC", (user_id,))
        return feedback
    except sqlite3.Error as e:
        print(f"Database error in get_user_feedback: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    except Exception as e:
        import traceback
        print(f"Error retrieving user feedback: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Failed to retrieve user feedback: {str(e)}")


def get_all_feedback() -> List[Dict[str, Any]]:
    try:
        feedback = execute_query("SELECT * FROM feedback ORDER BY date DESC")
        return feedback
    except sqlite3.Error as e:
        print(f"Database error in get_all_feedback: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    except Exception as e:
        import traceback
        print(f"Error retrieving all feedback: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Failed to retrieve all feedback: {str(e)}")