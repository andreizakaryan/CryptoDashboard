import requests
from datetime import datetime, timedelta, UTC
from db.db_connection import get_db_connection

API_URL = "https://api.alternative.me/fng/?limit={}"

async def fetch_latest_timestamp():
    """Fetch the latest timestamp from the database."""
    try:
        conn = await get_db_connection()
        query = "SELECT MAX(time) FROM fear_greed_index;"
        latest_timestamp = await conn.fetchval(query)
        await conn.close()

        now = datetime.now(UTC)
        days_ago = now - timedelta(days=100)  # ✅ Default to last 100 days

        # If no timestamp exists OR it's older than 1 month, fetch the last month
        if latest_timestamp is None or latest_timestamp < days_ago:
            return days_ago
        return latest_timestamp
    except Exception as e:
        print(f"[ERROR] Failed to fetch latest timestamp: {e}")
        return datetime.now(UTC) - timedelta(days=100)  # Default to last 100 days if error occurs


async def fetch_data():
    """Fetch Fear and Greed Index data since the last stored timestamp and store it."""
    try:
        latest_timestamp = await fetch_latest_timestamp()
        current_timestamp = datetime.now(UTC)
        if (current_timestamp - latest_timestamp) < timedelta(days=1):
            return

        # ✅ Calculate how many days to fetch (max 100)
        limit = min((current_timestamp - latest_timestamp).days + 10, 100)

        response = requests.get(API_URL.format(limit))
        if response.status_code != 200:
            print(f"[ERROR] Failed to fetch Fear & Greed Index: HTTP {response.status_code}")
            return

        data = response.json().get("data", [])
        formatted_data = [
            {
                "time": datetime.fromtimestamp(int(entry["timestamp"]), UTC),
                "value": int(entry["value"]),
                "classification": entry["value_classification"]
            }
            for entry in data if datetime.fromtimestamp(int(entry["timestamp"]), UTC) > latest_timestamp
        ]

        if formatted_data:
            await store_data(formatted_data)  # ✅ Call `store_data()` inside `fetch_data()`
        else:
            print("[INFO] No new Fear & Greed Index data to store.")

    except requests.RequestException as e:
        print(f"[ERROR] Network error while fetching Fear & Greed Index: {e}")
    except Exception as e:
        print(f"[ERROR] Unexpected error in fetch_data: {e}")


async def store_data(data):
    """Store the Fear and Greed Index data in the database."""
    try:
        conn = await get_db_connection()

        query = """
        INSERT INTO fear_greed_index (time, value, classification)
        VALUES ($1, $2, $3)
        ON CONFLICT (time) DO NOTHING;
        """

        records = [(entry["time"], entry["value"], entry["classification"]) for entry in data]

        if records:
            await conn.executemany(query, records)
            print(f"[INFO] Inserted {len(records)} new Fear & Greed Index records.")

        await conn.close()

    except Exception as e:
        print(f"[ERROR] Failed to store data: {e}")


# Run fetch and store function
if __name__ == "__main__":
    import asyncio
    asyncio.run(fetch_data())  # ✅ Only `fetch_data()` is called
