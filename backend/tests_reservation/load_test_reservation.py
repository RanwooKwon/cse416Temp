import asyncio
import random
import time
import aiohttp
import json
from datetime import datetime, timedelta
import statistics
import sys
import asyncio.exceptions

NUM_USERS = 1000
BASE_URL = "http://localhost:8000"
USER_ID = 6
PARKING_LOT_IDS = [1, 2, 3, 4, 5]

total_requests = 0
successful_requests = 0
failed_requests = 0
response_times = []
start_time = 0
end_time = 0

async def login():
    async with aiohttp.ClientSession() as session:
        login_data = {
            "username": "test1@example.com",
            "password": "password123"
        }
        try:
            print(f"Attempting login with {login_data['username']}...")
            async with session.post(f"{BASE_URL}/token", data=login_data) as response:
                if response.status == 200:
                    data = await response.json()
                    print(f"Login successful - got access token")
                    return data["access_token"]
                else:
                    error_text = await response.text()
                    print(f"Login failed: {response.status} - {error_text[:100]}")
                    return None
        except Exception as e:
            print(f"Login error: {str(e)}")
            return None

async def make_reservation(session, user_id, token, semaphore):
    global total_requests, successful_requests, failed_requests, response_times
    
    async with semaphore:
        days_ahead = random.randint(1, 30)
        hours_ahead = random.randint(0, 23)
        minutes_ahead = random.randint(0, 59)
        hours_duration = random.randint(1, 4)
        
        start_time = datetime.now() + timedelta(days=days_ahead, hours=hours_ahead, minutes=minutes_ahead)
        end_time = start_time + timedelta(hours=hours_duration)
        
        parking_lot_id = random.choice(PARKING_LOT_IDS)
        
        reservation_data = {
            "userID": user_id,
            "parkingLotID": parking_lot_id,
            "startTime": start_time.isoformat(),
            "endTime": end_time.isoformat()
        }
        
        headers = {"Authorization": f"Bearer {token}"}
        
        try:
            request_start = time.time()
            async with session.post(
                f"{BASE_URL}/reservation", 
                json=reservation_data,
                headers=headers
            ) as response:
                request_time = time.time() - request_start
                response_times.append(request_time)
                
                total_requests += 1
                if response.status == 200:
                    successful_requests += 1
                    return await response.json()
                else:
                    failed_requests += 1
                    error_text = await response.text()
                    if failed_requests <= 5:
                        print(f"Reservation failed: {response.status} - {error_text[:100]}")
                    elif failed_requests == 6:
                        print("Additional failures omitted...")
                    return f"Failed: {response.status} - {error_text}"
        except Exception as e:
            failed_requests += 1
            return f"Error: {str(e)}"

async def run_load_test():
    global start_time, end_time
    
    print(f"Starting load test with {NUM_USERS} concurrent users...")
    token = await login()
    
    if not token:
        print("Authentication failed, cannot run test")
        return
    
    semaphore = asyncio.Semaphore(100)
    
    async with aiohttp.ClientSession() as session:
        start_time = time.time()
        
        tasks = [make_reservation(session, USER_ID, token, semaphore) for _ in range(NUM_USERS)]
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        end_time = time.time()
    
    return results

def print_stats():
    total_time = end_time - start_time
    
    print("\n=== Load Test Results ===")
    print(f"Total users: {NUM_USERS}")
    print(f"Total time: {total_time:.2f} seconds")
    print(f"Requests per second: {NUM_USERS / total_time:.2f}")
    print(f"Successful requests: {successful_requests} ({successful_requests/total_requests*100:.2f}%)")
    print(f"Failed requests: {failed_requests} ({failed_requests/total_requests*100:.2f}%)")
    
    if response_times:
        print(f"Average response time: {statistics.mean(response_times):.4f} seconds")
        print(f"Median response time: {statistics.median(response_times):.4f} seconds")
        print(f"Min response time: {min(response_times):.4f} seconds")
        print(f"Max response time: {max(response_times):.4f} seconds")
        if len(response_times) > 1:
            print(f"Response time std dev: {statistics.stdev(response_times):.4f} seconds")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        try:
            NUM_USERS = int(sys.argv[1])
        except ValueError:
            print(f"Invalid user count: {sys.argv[1]}, using default {NUM_USERS}")
    
    asyncio.run(run_load_test())
    print_stats()