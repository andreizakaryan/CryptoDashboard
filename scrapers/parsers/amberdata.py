import requests
from datetime import datetime, timedelta, UTC
from db.db_connection import get_db_connection

BASE_URL = "https://derivatives-graphql.amberdata.com/graphql"
HEADERS = {
    "Accept-Encoding": "gzip, deflate, br, zstd",
    "Accept-Language": "en-US,en;q=0.9,ru;q=0.8,hy;q=0.7",
    "Origin": "https://pro.amberdata.io",
    "Referer": "https://pro.amberdata.io/",
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "cross-site",
    "accept": "*/*",
    "method": "POST",
    "sec-ch-ua": '"Not A(Brand";v="8", "Chromium";v="132", "Google Chrome";v="132"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"Windows"',
    "x-amberdata-client": "derivatives-gui",
    "x-amberdata-client-id": "undefined",
    "xxx": "please-dont-steal-me",
    "Content-Type": "application/json"
}


async def fetch_latest_timestamp(instrument):
    """Fetch the latest timestamp for the given instrument from the database."""
    try:
        conn = await get_db_connection()
        query = "SELECT MAX(time) FROM amberdata_delta_surfaces WHERE instrument = $1;"
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
    """Fetch Amberdata data starting from the latest available timestamp."""
    try:
        latest_timestamp = await fetch_latest_timestamp(instrument)
        current_timestamp = datetime.now(UTC)
        if (current_timestamp - latest_timestamp) < timedelta(hours=1):
            return

        start_date = latest_timestamp.strftime('%Y-%m-%d')
        end_date = current_timestamp.strftime('%Y-%m-%d')

        payload = {
            "operationName": "DeltaSurfacesConstantWings",
            "variables": {
                "exchange": "deribit",
                "symbol": instrument.upper(),
                "interval": "hours",
                "startDate": start_date,
                "endDate": end_date,
            },
            "query": """
                query DeltaSurfacesConstantWings($startDate: String, $endDate: String, $exchange: ExchangeEnumType, $symbol: SymbolEnumType, $interval: String) {
                    DeltaSurfacesConstantWings(
                        startDate: $startDate
                        endDate: $endDate
                        exchange: $exchange
                        currency: $symbol
                        interval: $interval
                    ) {
                        date
                        exchange
                        currency
                        daysToExpiration
                        deltaCall05Ratio
                        deltaCall05Spread
                        deltaCall10Ratio
                        deltaCall10Spread
                        deltaCall15Ratio
                        deltaCall15Spread
                        deltaCall25Ratio
                        deltaCall25Spread
                        deltaCall35Ratio
                        deltaCall35Spread
                        deltaPut05Ratio
                        deltaPut05Spread
                        deltaPut10Ratio
                        deltaPut10Spread
                        deltaPut15Ratio
                        deltaPut15Spread
                        deltaPut25Ratio
                        deltaPut25Spread
                        deltaPut35Ratio
                        deltaPut35Spread
                        __typename
                    }
                }
            """
        }

        with requests.Session() as session:
            session.headers.update(HEADERS)
            response = session.post(BASE_URL, headers=HEADERS, json=payload)

        if response.status_code == 200:
            data = response.json()
            await store_data(data.get("data", {}).get("DeltaSurfacesConstantWings", []), instrument)
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
        INSERT INTO amberdata_delta_surfaces (
            time, instrument, days_to_expiration, delta_call_05_ratio, delta_call_05_spread,
            delta_call_10_ratio, delta_call_10_spread, delta_call_15_ratio, delta_call_15_spread,
            delta_call_25_ratio, delta_call_25_spread, delta_call_35_ratio, delta_call_35_spread,
            delta_put_05_ratio, delta_put_05_spread, delta_put_10_ratio, delta_put_10_spread,
            delta_put_15_ratio, delta_put_15_spread, delta_put_25_ratio, delta_put_25_spread,
            delta_put_35_ratio, delta_put_35_spread
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
        ON CONFLICT (time, instrument) DO NOTHING;
        """

        records = []
        for entry in data:
            try:
                timestamp = datetime.fromtimestamp(int(entry["date"]) / 1000, UTC)  # Convert ms to UTC datetime
                records.append((
                    timestamp, instrument, entry["daysToExpiration"],
                    entry.get("deltaCall05Ratio"), entry.get("deltaCall05Spread"),
                    entry.get("deltaCall10Ratio"), entry.get("deltaCall10Spread"),
                    entry.get("deltaCall15Ratio"), entry.get("deltaCall15Spread"),
                    entry.get("deltaCall25Ratio"), entry.get("deltaCall25Spread"),
                    entry.get("deltaCall35Ratio"), entry.get("deltaCall35Spread"),
                    entry.get("deltaPut05Ratio"), entry.get("deltaPut05Spread"),
                    entry.get("deltaPut10Ratio"), entry.get("deltaPut10Spread"),
                    entry.get("deltaPut15Ratio"), entry.get("deltaPut15Spread"),
                    entry.get("deltaPut25Ratio"), entry.get("deltaPut25Spread"),
                    entry.get("deltaPut35Ratio"), entry.get("deltaPut35Spread")
                ))
            except Exception as e:
                print(f"[WARNING] Skipping malformed entry for {instrument}: {entry} | Error: {e}")

        if records:
            await conn.executemany(query, records)
            print(f"[INFO] Inserted {len(records)} new records for {instrument} (amberdata_delta_surfaces).")

        await conn.close()
    except Exception as e:
        print(f"[ERROR] Failed to store data for {instrument}: {e}")
