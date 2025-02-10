const WebSocket = require("ws");
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});


const wss = new WebSocket.Server({ port: 5001 });

async function fetchNewData(ws, instrument) {
    try {
        const queries = {
          delta_surfaces: `SELECT * FROM amberdata_delta_surfaces WHERE instrument = $1 AND time > $2 ORDER BY time ASC`,
          funding_data: `SELECT * FROM deribit_funding_data WHERE instrument = $1 AND time > $2 ORDER BY time ASC`,
          skew_data: `SELECT * FROM laevitas_25delta_skew WHERE instrument = $1 AND time > $2 ORDER BY time ASC`,
          weighted_funding: `SELECT * FROM laevitas_weighted_funding WHERE instrument = $1 AND time > $2 ORDER BY time ASC`,
          price: `SELECT * FROM binance_ohlcv WHERE instrument = $1 AND time > $2 ORDER BY time ASC`,
          fear_greed: `SELECT * FROM fear_greed_index WHERE time > $1 ORDER BY time ASC`,
        };

        let newData = {};

        for (const key in queries) {
            const params = (key == 'fear_greed') ? [ws.lastTimestamps[key]] : [instrument, ws.lastTimestamps[key]]
            const result = await pool.query(queries[key], params);
            newData[key] = result.rows;

            if (result.rows.length > 0) {
                ws.lastTimestamps[key] = result.rows[result.rows.length - 1].time;
            }
        }

        ws.send(
          JSON.stringify({ instrument, ...newData })
        );
    } catch (err) {
        console.error(err);
    }
}

wss.on("connection", (ws) => {
    console.log("Client connected to WebSocket");

    ws.on("message", async (message) => {
        const { action, instrument } = JSON.parse(message);

        if (action === "subscribe") {
            console.log(`Client subscribed to ${instrument}`);

            const day_ms = 24 * 60 * 60 * 1000;
            ws.lastTimestamps = {
              delta_surfaces: new Date(Date.now() - 7 * day_ms),
              skew_data: new Date(Date.now() - 7 * day_ms),
              funding_data: new Date(Date.now() - 7 * day_ms),
              weighted_funding: new Date(Date.now() - 7 * day_ms),
              price: new Date(Date.now() - 7 * day_ms),
              fear_greed: new Date(Date.now() - 100 * day_ms),
            };

            // ✅ Fetch initial data immediately
            await fetchNewData(ws, instrument);

            // ✅ Start periodic updates
            const interval = setInterval(() => fetchNewData(ws, instrument), 5000);

            // ✅ Handle WebSocket disconnection (clear interval when client disconnects)
            ws.on("close", () => {
                clearInterval(interval);
                console.log(`Client disconnected from ${instrument}`);
            });
        }
    });
});

