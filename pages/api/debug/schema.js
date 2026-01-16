import db from "../../../lib/db";

export default async function handler(req, res) {
    try {
        const { rows: airportCols } = await db.query(
            "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'airports'"
        );
        const { rows: itemCols } = await db.query(
            "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'items'"
        );

        // Also check one airport to see sample data
        const { rows: someAirport } = await db.query("SELECT * FROM airports LIMIT 1");

        res.status(200).json({
            airportSchema: airportCols,
            itemSchema: itemCols,
            sampleAirport: someAirport[0]
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}
