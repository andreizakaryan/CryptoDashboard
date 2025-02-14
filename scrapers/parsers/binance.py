import requests
from datetime import datetime, timedelta, UTC
from db.db_connection import get_db_connection

BASE_URL = "https://api.binance.com/api/v3/klines"


async def fetch_latest_timestamp(instrument):
    """Fetch the latest timestamp for the given instrument from the database."""
    try:
        conn = await get_db_connection()
        query = "SELECT MAX(time) FROM binance_ohlcv WHERE instrument = $1;"
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


async def fetch_data(instrument, interval="1m"):
    """Fetch Binance OHLCV data starting from the latest available timestamp."""
    try:
        latest_timestamp = await fetch_latest_timestamp(instrument)
        now_timestamp = datetime.now(UTC)

        # ✅ Calculate `limit` based on time difference (max 1000 per request)
        time_diff_minutes = int((now_timestamp - latest_timestamp).total_seconds() / 60)
        limit = min(time_diff_minutes + 10, 1000)

        params = {
            "symbol": f'{instrument.upper()}USDT',
            "interval": interval,
            "limit": limit
        }

        with requests.Session() as session:
            response = session.get(BASE_URL, params=params)

        if response.status_code == 200:
            data = response.json()
            await store_data(data, instrument)
        else:
            print(f"[ERROR] Failed to fetch data for {instrument}: HTTP {response.status_code}")
    except requests.RequestException as e:
        print(f"[ERROR] Network error while fetching data for {instrument}: {e}")
    except Exception as e:
        print(f"[ERROR] Unexpected error in fetch_data for {instrument}: {e}")


async def store_data(data, instrument):
    """Insert new Binance OHLCV data into the TimescaleDB database."""
    try:
        conn = await get_db_connection()

        query = """
        INSERT INTO binance_ohlcv (
            time, instrument, open, high, low, close, volume
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (time, instrument)
        DO UPDATE SET
            open = EXCLUDED.open,
            high = EXCLUDED.high,
            low = EXCLUDED.low,
            close = EXCLUDED.close,
            volume = EXCLUDED.volume;
        """

        records = []
        for entry in data:
            try:
                timestamp = datetime.fromtimestamp(entry[0] / 1000, UTC)
                records.append((
                    timestamp, instrument,
                    float(entry[1]), float(entry[2]), float(entry[3]),
                    float(entry[4]), float(entry[5])
                ))
            except Exception as e:
                print(f"[WARNING] Skipping malformed entry for {instrument}: {entry} | Error: {e}")

        if records:
            await conn.executemany(query, records)
            print(f"[INFO] Inserted {len(records)} new records for {instrument} (binance_ohlcv).")

        await conn.close()
    except Exception as e:
        print(f"[ERROR] Failed to store data for {instrument}: {e}")
