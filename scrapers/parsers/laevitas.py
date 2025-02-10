import requests
from datetime import datetime, timedelta, UTC
from db.db_connection import get_db_connection

BASE_URL = "https://be.laevitas.ch/charts/options/type/skew/deribit"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36",
    "sec-ch-ua": '"Not A(Brand";v="8", "Chromium";v="132", "Google Chrome";v="132"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"Windows"',
    "Accept": "application/json, text/plain, */*",
    "Referer": "https://app.laevitas.ch/",
    "cache-duration": "30",
    "skip_recaptcha": "skip",
    "authorization": "bearer"
}


async def fetch_latest_timestamp(instrument):
    """Fetch the latest timestamp for the given instrument from the database."""
    try:
        conn = await get_db_connection()
        query = "SELECT MAX(time) FROM laevitas_25delta_skew WHERE instrument = $1;"
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


async def fetch_data(instrument):
    """Fetch Laevitas data starting from the latest available timestamp."""
    try:
        latest_timestamp = await fetch_latest_timestamp(instrument)
        current_timestamp = datetime.now(UTC)
        if (current_timestamp - latest_timestamp) < timedelta(minutes=5):
            return

        start_date = latest_timestamp.strftime('%Y-%m-%d')
        end_date = current_timestamp.strftime('%Y-%m-%d')

        url = f"{BASE_URL}/{instrument}/25d/?start={start_date}&end={end_date}"

        with requests.Session() as session:
            session.headers.update(HEADERS)
            response = session.get(url)

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
    """Insert new data into the TimescaleDB database."""
    try:
        conn = await get_db_connection()

        query = """
        INSERT INTO laevitas_25delta_skew (
            time, instrument, period_1, period_7, period_14, period_30, 
            period_60, period_90, period_180, period_365
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (time, instrument) DO NOTHING;
        """

        records = []
        for entry in data:
            try:
                timestamp = datetime.fromtimestamp(entry["date"] / 1000, UTC)  # Convert ms to UTC datetime
                records.append((
                    timestamp, instrument,
                    entry.get("1"), entry.get("7"), entry.get("14"), entry.get("30"),
                    entry.get("60"), entry.get("90"), entry.get("180"), entry.get("365")
                ))
            except Exception as e:
                print(f"[WARNING] Skipping malformed entry for {instrument}: {entry} | Error: {e}")

        if records:
            await conn.executemany(query, records)
            print(f"[INFO] Inserted {len(records)} new records for {instrument} (laevitas_25delta_skew).")

        await conn.close()
    except Exception as e:
        print(f"[ERROR] Failed to store data for {instrument}: {e}")
