import asyncio
import websockets
import json
from datetime import datetime, UTC, timedelta
from db.db_connection import get_db_connection

WS_URL = "wss://www.deribit.com/ws/api/v2"
HEADERS = {
    "Origin": "https://www.deribit.com",
    "Cache-Control": "no-cache",
    "Accept-Language": "en-US,en;q=0.9,ru;q=0.8,hy;q=0.7",
    "Pragma": "no-cache",
    "Accept-Encoding": "gzip, deflate, br, zstd",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36"
}


async def fetch_latest_timestamp(instrument):
    """Fetch the latest timestamp for the given instrument from the database."""
    try:
        conn = await get_db_connection()
        query = "SELECT MAX(time) FROM deribit_funding_data WHERE instrument = $1;"
        latest_timestamp = await conn.fetchval(query, instrument)
        await conn.close()

        now = datetime.now(UTC)
        seven_days_ago = now - timedelta(days=7)

        # If no timestamp exists OR it's older than 7 days, fetch the last 7 days
        if latest_timestamp is None or latest_timestamp < seven_days_ago:
            return seven_days_ago
        return latest_timestamp
    except Exception as e:
        print(f"[ERROR] Failed to fetch latest timestamp for {instrument}: {e}")
        return datetime.now(UTC) - timedelta(days=7)  # Default to last 7 days if error occurs


def determine_length(start_timestamp):
    """Determine the appropriate length based on start time."""
    now = datetime.now(UTC)
    diff = now - datetime.fromtimestamp(start_timestamp / 1000, UTC)

    if diff <= timedelta(hours=8):
        return "8h"
    else:
        return "24h"


async def fetch_data(instrument):
    """Fetch funding chart data from Deribit WebSocket (one-time connection)."""
    try:
        latest_timestamp = await fetch_latest_timestamp(instrument)
        start_time = int(latest_timestamp.timestamp() * 1000)  # Convert to milliseconds
        length = determine_length(start_time)  # ✅ Dynamically select `8h`, `1d`, or `1m`

        async with websockets.connect(WS_URL, additional_headers=HEADERS) as websocket:
            print(f"[INFO] Connected to Deribit WebSocket for {instrument}")

            # Send request for funding chart data
            message = {
                "jsonrpc": "2.0",
                "id": 22,
                "method": "public/get_funding_chart_data",
                "params": {
                    "instrument_name":  f'{instrument.upper()}-PERPETUAL',
                    "length": length  # ✅ Dynamic selection
                }
            }

            await websocket.send(json.dumps(message))

            # Receive and process response
            response = await websocket.recv()
            response_data = json.loads(response)

            if "result" in response_data and "data" in response_data["result"]:
                await store_data(response_data["result"]["data"], instrument)
            else:
                print(f"[WARNING] Unexpected response format: {response}")

    except websockets.exceptions.WebSocketException as e:
        print(f"[ERROR] WebSocket error: {e}")

    except Exception as e:
        print(f"[ERROR] An error occurred: {e}")


async def store_data(data, instrument):
    """Insert new data into the TimescaleDB database."""
    try:
        conn = await get_db_connection()

        query = """
        INSERT INTO deribit_funding_data (
            time, instrument, index_price, interest_8h
        )
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (time, instrument) DO NOTHING;
        """

        records = []
        for entry in data:
            try:
                timestamp = datetime.fromtimestamp(entry["timestamp"] / 1000, UTC)
                records.append((
                    timestamp, instrument,
                    entry.get("index_price"),
                    entry.get("interest_8h"),
                ))
            except Exception as e:
                print(f"[WARNING] Skipping malformed entry for {instrument}: {entry} | Error: {e}")

        if records:
            await conn.executemany(query, records)
            print(f"[INFO] Inserted {len(records)} new records for {instrument} (deribit_funding_data).")

        await conn.close()
    except Exception as e:
        print(f"[ERROR] Failed to store data for {instrument}: {e}")
