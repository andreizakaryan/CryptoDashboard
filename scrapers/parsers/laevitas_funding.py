import requests
from datetime import datetime, UTC, timedelta
from db.db_connection import get_db_connection

BASE_URL = "https://be.laevitas.ch/charts/futures/weighted_funding"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36",
    "sec-ch-ua-platform": '"Windows"',
    "authorization": "bearer",
    "Referer": "https://app.laevitas.ch/",
    "skip_recaptcha": "skip",
    "sec-ch-ua": '"Not A(Brand";v="8", "Chromium";v="132", "Google Chrome";v="132"',
    "sec-ch-ua-mobile": "?0",
    "Accept": "application/json, text/plain, */*",
    "cache-duration": "30"
}


async def fetch_latest_timestamp(instrument):
    """Fetch the latest timestamp for the given instrument from the database."""
    conn = await get_db_connection()
    query = "SELECT MAX(time) FROM laevitas_weighted_funding WHERE instrument = $1;"
    latest_timestamp = await conn.fetchval(query, instrument)
    await conn.close()

    now = datetime.now(UTC)
    seven_days_ago = now - timedelta(days=7)

    if latest_timestamp is None or latest_timestamp < seven_days_ago:
        return seven_days_ago
    return latest_timestamp


async def fetch_data(instrument):
    """Fetch Laevitas weighted funding data starting from the latest timestamp."""
    latest_timestamp = await fetch_latest_timestamp(instrument)
    current_timestamp = datetime.now(UTC)
    if (current_timestamp - latest_timestamp) < timedelta(minutes=5):
        return

    start_date = latest_timestamp.strftime('%Y-%m-%d')
    end_date = current_timestamp.strftime('%Y-%m-%d')

    url = f"{BASE_URL}/{instrument}/?start={start_date}&end={end_date}&class_attribute=all_apr"

    with requests.Session() as session:
        session.headers.update(HEADERS)
        response = session.get(url)

    if response.status_code == 200:
        data = response.json()
        await store_data(data, instrument)
    else:
        print(f"Failed to fetch data for {instrument}: {response.status_code}")


async def store_data(data, instrument):
    """Insert new data into the TimescaleDB database."""
    conn = await get_db_connection()

    query = """
    INSERT INTO laevitas_weighted_funding (
        time, instrument, price, weighted_funding
    )
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (time, instrument) DO NOTHING;
    """

    records = []
    for entry in data:
        try:
            timestamp = datetime.fromtimestamp(entry["d"] / 1000, UTC)  # ✅ Fix key error
            records.append((
                timestamp, instrument,
                entry.get("p"),  # ✅ Save price
                entry.get("a")   # ✅ Save weighted funding APR
            ))
        except Exception as e:
            print(f"[WARNING] Skipping malformed entry for {instrument}: {entry} | Error: {e}")

    if records:
        await conn.executemany(query, records)
        print(f"Inserted {len(records)} new records for {instrument} laevitas_weighted_funding.")

    await conn.close()

