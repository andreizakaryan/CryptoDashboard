-- Create the database (run separately if needed)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = 'crypto_dashboard') THEN
        CREATE DATABASE crypto_dashboard;
    END IF;
END $$;

-- Connect to the database (this line won't work inside the SQL file, run it in psql before executing the script)
\c crypto_dashboard;

-- Create the table for Laevitas 25 Delta Skew data
CREATE TABLE IF NOT EXISTS laevitas_25delta_skew (
    time TIMESTAMPTZ NOT NULL,
    instrument TEXT NOT NULL,
    period_1 DOUBLE PRECISION,
    period_7 DOUBLE PRECISION,
    period_14 DOUBLE PRECISION,
    period_30 DOUBLE PRECISION,
    period_60 DOUBLE PRECISION,
    period_90 DOUBLE PRECISION,
    period_180 DOUBLE PRECISION,
    period_365 DOUBLE PRECISION,
    PRIMARY KEY (time, instrument)
);

CREATE TABLE IF NOT EXISTS amberdata_delta_surfaces (
    time TIMESTAMPTZ NOT NULL,
    instrument TEXT NOT NULL,
    days_to_expiration INT,
    delta_call_05_ratio DOUBLE PRECISION,
    delta_call_05_spread DOUBLE PRECISION,
    delta_call_10_ratio DOUBLE PRECISION,
    delta_call_10_spread DOUBLE PRECISION,
    delta_call_15_ratio DOUBLE PRECISION,
    delta_call_15_spread DOUBLE PRECISION,
    delta_call_25_ratio DOUBLE PRECISION,
    delta_call_25_spread DOUBLE PRECISION,
    delta_call_35_ratio DOUBLE PRECISION,
    delta_call_35_spread DOUBLE PRECISION,
    delta_put_05_ratio DOUBLE PRECISION,
    delta_put_05_spread DOUBLE PRECISION,
    delta_put_10_ratio DOUBLE PRECISION,
    delta_put_10_spread DOUBLE PRECISION,
    delta_put_15_ratio DOUBLE PRECISION,
    delta_put_15_spread DOUBLE PRECISION,
    delta_put_25_ratio DOUBLE PRECISION,
    delta_put_25_spread DOUBLE PRECISION,
    delta_put_35_ratio DOUBLE PRECISION,
    delta_put_35_spread DOUBLE PRECISION,
    PRIMARY KEY (time, instrument)
);

CREATE TABLE IF NOT EXISTS deribit_funding_data (
    time TIMESTAMPTZ NOT NULL,
    instrument TEXT NOT NULL,
    index_price DOUBLE PRECISION,
    interest_8h DOUBLE PRECISION,
    PRIMARY KEY (time, instrument)
);

CREATE TABLE IF NOT EXISTS laevitas_weighted_funding (
    time TIMESTAMPTZ NOT NULL,
    instrument TEXT NOT NULL,
    price DOUBLE PRECISION,
    weighted_funding DOUBLE PRECISION,
    PRIMARY KEY (time, instrument)
);

CREATE TABLE IF NOT EXISTS binance_ohlcv (
    time TIMESTAMPTZ NOT NULL,
    instrument TEXT NOT NULL,
    open DOUBLE PRECISION,
    high DOUBLE PRECISION,
    low DOUBLE PRECISION,
    close DOUBLE PRECISION,
    volume DOUBLE PRECISION,
    PRIMARY KEY (time, instrument)
);

CREATE TABLE IF NOT EXISTS fear_greed_index (
    time TIMESTAMPTZ NOT NULL PRIMARY KEY,
    value INT NOT NULL,
    classification TEXT NOT NULL
);

