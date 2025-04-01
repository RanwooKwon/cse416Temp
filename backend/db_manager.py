from contextlib import contextmanager
import sqlite3
from typing import Any, Dict, List, Optional, Tuple
import time
import threading
import queue
import os
from pathlib import Path

MAX_CONNECTIONS = 20
CONNECTION_TIMEOUT = 5  # seconds
DB_PATH = os.path.join(Path(__file__).parent, "parking.db")


class DatabaseConnectionPool:
    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super(DatabaseConnectionPool, cls).__new__(cls)
                cls._instance._initialize()
            return cls._instance

    def _initialize(self):
        self.connection_pool = queue.Queue(maxsize=MAX_CONNECTIONS)
        self.active_connections = 0
        self.pool_lock = threading.Lock()

        for _ in range(min(5, MAX_CONNECTIONS)):
            conn = self._create_connection()
            if conn:
                self.connection_pool.put(conn)

    def _create_connection(self) -> Optional[sqlite3.Connection]:
        try:
            conn = sqlite3.connect(DB_PATH, check_same_thread=False)
            conn.row_factory = sqlite3.Row
            conn.execute("PRAGMA journal_mode=WAL;")
            conn.execute(f"PRAGMA busy_timeout={CONNECTION_TIMEOUT * 1000};")
            return conn
        except sqlite3.Error as e:
            print(f"Error creating database connection: {e}")
            return None

    def get_connection(self) -> Optional[sqlite3.Connection]:
        try:
            conn = self.connection_pool.get(block=True, timeout=CONNECTION_TIMEOUT)
            return conn
        except queue.Empty:
            with self.pool_lock:
                if self.active_connections < MAX_CONNECTIONS:
                    self.active_connections += 1
                    return self._create_connection()
                else:
                    print("Maximum database connections reached, waiting...")
                    try:
                        return self.connection_pool.get(block=True, timeout=CONNECTION_TIMEOUT * 2)
                    except queue.Empty:
                        print("Failed to get database connection after extended wait")
                        return None

    def return_connection(self, conn: sqlite3.Connection):
        if conn:
            try:
                conn.rollback()
                self.connection_pool.put(conn, block=False)
            except queue.Full:
                with self.pool_lock:
                    self.active_connections -= 1
                conn.close()

    def close_all(self):
        while not self.connection_pool.empty():
            try:
                conn = self.connection_pool.get(block=False)
                conn.close()
            except queue.Empty:
                break
        with self.pool_lock:
            self.active_connections = 0


@contextmanager
def get_db_connection():
    pool = DatabaseConnectionPool()
    connection = pool.get_connection()

    if connection is None:
        raise Exception("Could not get database connection")

    try:
        yield connection
    finally:
        pool.return_connection(connection)


def execute_query(query: str, params: tuple = ()) -> List[Dict[str, Any]]:
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(query, params)
        results = cursor.fetchall()
        return [dict(row) for row in results]


def execute_write_query(query: str, params: tuple = ()) -> int:
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(query, params)
        conn.commit()
        return cursor.lastrowid


def execute_transaction(queries: List[Tuple[str, tuple]]) -> int:
    with get_db_connection() as conn:
        cursor = conn.cursor()
        try:
            for query, params in queries:
                cursor.execute(query, params)
            conn.commit()
            return cursor.lastrowid
        except Exception as e:
            conn.rollback()
            raise e
