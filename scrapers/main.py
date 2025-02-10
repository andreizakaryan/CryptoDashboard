import asyncio
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from parsers import laevitas, amberdata, deribit, laevitas_funding, binance, alternative


async def main():
    # Initialize scheduler
    scheduler = AsyncIOScheduler()
    instruments = ["btc", "eth"]
    # for instrument in instruments:
    #     scheduler.add_job(laevitas.fetch_data, "interval", minutes=1, args=[instrument], max_instances=1)
    #     scheduler.add_job(amberdata.fetch_data, "interval", minutes=1, args=[instrument], max_instances=1)
    #     scheduler.add_job(deribit.fetch_data, "interval", minutes=1, args=[instrument], max_instances=1)
    #     scheduler.add_job(binance.fetch_data, "interval", minutes=1, args=[instrument], max_instances=1)
    #     scheduler.add_job(laevitas_funding.fetch_data, "interval", minutes=1, args=[instrument], max_instances=1)

    scheduler.add_job(alternative.fetch_data, "interval", minutes=1, max_instances=1)
    scheduler.start()

    try:
        while True:
            await asyncio.sleep(1)
    except (KeyboardInterrupt, SystemExit):
        # Shut down the scheduler gracefully
        scheduler.shutdown()


# Run the asyncio event loop
if __name__ == "__main__":
    asyncio.run(main())
