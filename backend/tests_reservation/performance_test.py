import asyncio
import aiohttp
import json
import time
import random
import statistics
import argparse
import csv
import os
from datetime import datetime, timedelta
import tabulate as tabulate_module


class ParkingLoadTest:
    def __init__(self, base_url="http://localhost:8000", users=1000, concurrent_limit=100):
        self.base_url = base_url
        self.num_users = users
        self.concurrent_limit = concurrent_limit
        self.user_id = 6
        self.parking_lot_ids = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

        self.results = {}
        self.test_scenarios = [
            "reservation_creation",
            "reservation_retrieval",
            "reservation_cancellation"
        ]

        for scenario in self.test_scenarios:
            self.results[scenario] = {
                "total_requests": 0,
                "successful_requests": 0,
                "failed_requests": 0,
                "response_times": [],
                "start_time": 0,
                "end_time": 0
            }

    async def login(self, session):
        login_data = {
            "username": "test1@example.com",
            "password": "password123"
        }

        try:
            async with session.post(f"{self.base_url}/token", data=login_data) as response:
                if response.status == 200:
                    data = await response.json()
                    return data["access_token"]
                else:
                    print(f"Login failed: {response.status}")
                    return None
        except Exception as e:
            print(f"Login error: {str(e)}")
            return None

    async def create_reservation(self, session, token, semaphore):
        stats = self.results["reservation_creation"]

        async with semaphore:
            days_ahead = random.randint(1, 30)
            hours_ahead = random.randint(0, 23)
            minutes_ahead = random.randint(0, 59)
            hours_duration = random.randint(1, 4)

            start_time = datetime.now() + timedelta(days=days_ahead, hours=hours_ahead, minutes=minutes_ahead)
            end_time = start_time + timedelta(hours=hours_duration)

            parking_lot_id = random.choice(self.parking_lot_ids)

            reservation_data = {
                "userID": self.user_id,
                "parkingLotID": parking_lot_id,
                "startTime": start_time.isoformat(),
                "endTime": end_time.isoformat()
            }

            headers = {"Authorization": f"Bearer {token}"}

            try:
                request_start = time.time()
                async with session.post(
                        f"{self.base_url}/reservation",
                        json=reservation_data,
                        headers=headers
                ) as response:
                    request_time = time.time() - request_start
                    stats["response_times"].append(request_time)

                    stats["total_requests"] += 1
                    if response.status == 200:
                        stats["successful_requests"] += 1
                        result = await response.json()
                        return result["reservationID"]
                    else:
                        stats["failed_requests"] += 1
                        error_text = await response.text()
                        if stats["failed_requests"] < 5:
                            print(f"Creation failed: {response.status} - {error_text[:100]}")
                        elif stats["failed_requests"] == 5:
                            print("Additional creation failures omitted...")
                        return None
            except Exception as e:
                stats["failed_requests"] += 1
                if stats["failed_requests"] < 5:
                    print(f"Error creating reservation: {str(e)}")
                return None

    async def get_reservation(self, session, reservation_id, token, semaphore):
        stats = self.results["reservation_retrieval"]

        async with semaphore:
            headers = {"Authorization": f"Bearer {token}"}

            try:
                request_start = time.time()
                async with session.get(
                        f"{self.base_url}/reservation/{reservation_id}",
                        headers=headers
                ) as response:
                    request_time = time.time() - request_start
                    stats["response_times"].append(request_time)

                    stats["total_requests"] += 1
                    if response.status == 200:
                        stats["successful_requests"] += 1
                        return await response.json()
                    else:
                        stats["failed_requests"] += 1
                        error_text = await response.text()
                        print(f"Retrieval failed for ID {reservation_id}: {response.status} - {error_text[:100]}")
                        return None
            except Exception as e:
                stats["failed_requests"] += 1
                print(f"Error retrieving reservation {reservation_id}: {str(e)}")
                return None

    async def cancel_reservation(self, session, reservation_id, token, semaphore):
        stats = self.results["reservation_cancellation"]

        async with semaphore:
            headers = {"Authorization": f"Bearer {token}"}

            try:
                request_start = time.time()
                async with session.delete(
                        f"{self.base_url}/reservation/{reservation_id}",
                        headers=headers
                ) as response:
                    request_time = time.time() - request_start
                    stats["response_times"].append(request_time)

                    stats["total_requests"] += 1
                    if response.status == 200:
                        stats["successful_requests"] += 1
                        return await response.json()
                    else:
                        stats["failed_requests"] += 1
                        error_text = await response.text()
                        print(f"Cancellation failed for ID {reservation_id}: {response.status} - {error_text[:100]}")
                        return None
            except Exception as e:
                stats["failed_requests"] += 1
                print(f"Error cancelling reservation {reservation_id}: {str(e)}")
                return None

    async def run_creation_test(self):
        stats = self.results["reservation_creation"]
        stats["start_time"] = time.time()

        async with aiohttp.ClientSession() as session:
            token = await self.login(session)
            if not token:
                print("Authentication failed, cannot run test")
                return []

            semaphore = asyncio.Semaphore(self.concurrent_limit)

            tasks = [self.create_reservation(session, token, semaphore) for _ in range(self.num_users)]

            reservation_ids = await asyncio.gather(*tasks)

            stats["end_time"] = time.time()

            return [r_id for r_id in reservation_ids if r_id is not None]

    async def run_retrieval_test(self, reservation_ids):
        stats = self.results["reservation_retrieval"]
        stats["start_time"] = time.time()

        if not reservation_ids:
            print("No reservations to retrieve, skipping retrieval test")
            stats["end_time"] = time.time() + 0.1
            return

        async with aiohttp.ClientSession() as session:
            token = await self.login(session)
            if not token:
                print("Authentication failed, cannot run test")
                stats["end_time"] = time.time() + 0.1
                return

            semaphore = asyncio.Semaphore(self.concurrent_limit)

            print(f"Retrieving {len(reservation_ids)} reservations: {reservation_ids[:5]}...")
            tasks = [self.get_reservation(session, r_id, token, semaphore) for r_id in reservation_ids]
            results = await asyncio.gather(*tasks)
            successful = sum(1 for r in results if r is not None)
            print(f"Successfully retrieved {successful} out of {len(reservation_ids)} reservations")

            stats["end_time"] = time.time()

    async def run_cancellation_test(self, reservation_ids):
        stats = self.results["reservation_cancellation"]
        stats["start_time"] = time.time()

        if not reservation_ids:
            print("No reservations to cancel, skipping cancellation test")
            stats["end_time"] = time.time() + 0.1
            return

        async with aiohttp.ClientSession() as session:
            token = await self.login(session)
            if not token:
                print("Authentication failed, cannot run test")
                stats["end_time"] = time.time() + 0.1
                return

            semaphore = asyncio.Semaphore(self.concurrent_limit)
            print(f"Cancelling {len(reservation_ids)} reservations: {reservation_ids[:5]}...")

            tasks = [self.cancel_reservation(session, r_id, token, semaphore) for r_id in reservation_ids]
            results = await asyncio.gather(*tasks)
            successful = sum(1 for r in results if r is not None)
            print(f"Successfully cancelled {successful} out of {len(reservation_ids)} reservations")

            stats["end_time"] = time.time()

    async def run_full_test(self):
        print(f"Starting performance test with {self.num_users} users...")

        print("Testing reservation creation...")
        reservation_ids = await self.run_creation_test()
        print(f"Successfully created {len(reservation_ids)} reservations")

        print("Testing reservation retrieval...")
        await self.run_retrieval_test(reservation_ids)

        print("Testing reservation cancellation...")
        await self.run_cancellation_test(reservation_ids)

        self.print_results()
        self.save_results()

    def get_stats_for_scenario(self, scenario):
        stats = self.results[scenario]
        total_time = stats["end_time"] - stats["start_time"]
        avg_time = statistics.mean(stats["response_times"]) if stats["response_times"] else 0
        median_time = statistics.median(stats["response_times"]) if stats["response_times"] else 0

        success_rate = 0
        if stats["total_requests"] > 0:
            success_rate = (stats["successful_requests"] / stats["total_requests"]) * 100

        return {
            "scenario": scenario.replace("_", " ").title(),
            "throughput": self.num_users / total_time if total_time > 0 else 0,
            "avg_response": avg_time,
            "median_response": median_time,
            "min_response": min(stats["response_times"]) if stats["response_times"] else 0,
            "max_response": max(stats["response_times"]) if stats["response_times"] else 0,
            "std_dev": statistics.stdev(stats["response_times"]) if len(stats["response_times"]) > 1 else 0,
            "success_rate": success_rate,
            "total_time": total_time
        }

    def print_results(self):
        headers = ["Test Scenario", "Throughput (req/s)", "Avg Response (s)",
                   "Median Response (s)", "Min (s)", "Max (s)", "Std Dev",
                   "Success Rate (%)", "Total Time (s)"]

        table_data = []
        for scenario in self.test_scenarios:
            stats = self.get_stats_for_scenario(scenario)
            table_data.append([
                stats["scenario"],
                f"{stats['throughput']:.2f}",
                f"{stats['avg_response']:.4f}",
                f"{stats['median_response']:.4f}",
                f"{stats['min_response']:.4f}",
                f"{stats['max_response']:.4f}",
                f"{stats['std_dev']:.4f}",
                f"{stats['success_rate']:.2f}",
                f"{stats['total_time']:.2f}"
            ])

        print("\n=== Performance Test Results ===")
        print(f"Users: {self.num_users}, Concurrent limit: {self.concurrent_limit}")
        print(tabulate_module.tabulate(table_data, headers=headers, tablefmt="grid"))

    def save_results(self):
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"performance_test_{self.num_users}users_{timestamp}.csv"

        with open(filename, 'w', newline='') as csvfile:
            writer = csv.writer(csvfile)

            writer.writerow([f"Performance Test Results - {self.num_users} users, {datetime.now()}"])
            writer.writerow([])

            writer.writerow(["Test Scenario", "Throughput (req/s)", "Avg Response (s)",
                             "Median Response (s)", "Min (s)", "Max (s)", "Std Dev",
                             "Success Rate (%)", "Total Time (s)"])

            for scenario in self.test_scenarios:
                stats = self.get_stats_for_scenario(scenario)
                writer.writerow([
                    stats["scenario"],
                    f"{stats['throughput']:.2f}",
                    f"{stats['avg_response']:.4f}",
                    f"{stats['median_response']:.4f}",
                    f"{stats['min_response']:.4f}",
                    f"{stats['max_response']:.4f}",
                    f"{stats['std_dev']:.4f}",
                    f"{stats['success_rate']:.2f}",
                    f"{stats['total_time']:.2f}"
                ])

            writer.writerow([])

            for scenario in self.test_scenarios:
                writer.writerow([f"{scenario.replace('_', ' ').title()} - Raw Response Times (s)"])
                times = self.results[scenario]["response_times"]
                for chunk in [times[i:i + 10] for i in range(0, len(times), 10)]:
                    writer.writerow([f"{time:.6f}" for time in chunk])
                writer.writerow([])

        print(f"Results saved to {filename}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="P4SBU Parking System Load Testing Tool")
    parser.add_argument("-u", "--users", type=int, default=1000, help="Number of users to simulate")
    parser.add_argument("-c", "--concurrent", type=int, default=100, help="Maximum number of concurrent requests")
    parser.add_argument("--url", type=str, default="http://localhost:8000", help="Base URL for the API")

    args = parser.parse_args()

    try:
        import sys
        import tabulate
    except ImportError:
        print("Installing tabulate package...")
        os.system(f"{sys.executable} -m pip install tabulate")
        import tabulate

    test = ParkingLoadTest(base_url=args.url, users=args.users, concurrent_limit=args.concurrent)
    asyncio.run(test.run_full_test())
