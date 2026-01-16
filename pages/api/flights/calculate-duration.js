import { airports } from '../../../lib/db';
import { fromZonedTime } from 'date-fns-tz';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    const { depIata, arrIata, depTime, arrTime } = req.body;

    if (!depIata || !arrIata || !depTime || !arrTime) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const [depAirport, arrAirport] = await Promise.all([
            airports.getByIata(depIata),
            airports.getByIata(arrIata)
        ]);

        if (!depAirport) return res.status(404).json({ error: `Airport not found: ${depIata}` });
        if (!arrAirport) return res.status(404).json({ error: `Airport not found: ${arrIata}` });

        if (!depAirport.timezone_id || !arrAirport.timezone_id) {
            return res.status(400).json({ error: 'Missing timezone data for airports' });
        }

        // Parse local times to UTC using the airport's timezone
        // depTime/arrTime should be ISO string without timezone (e.g. "2023-01-01T10:00")
        const depDate = fromZonedTime(depTime, depAirport.timezone_id);
        const arrDate = fromZonedTime(arrTime, arrAirport.timezone_id);

        const diffMs = arrDate.getTime() - depDate.getTime();

        if (diffMs < 0) {
            return res.status(200).json({
                durationText: "Invalid times (Arrival before Departure)",
                minutes: 0,
                details: { depUTC: depDate, arrUTC: arrDate }
            });
        }

        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

        const durationText = `${hours}h ${minutes}m`;

        res.status(200).json({
            durationText,
            minutes: Math.floor(diffMs / (1000 * 60)),
            details: {
                depTz: depAirport.timezone_id,
                arrTz: arrAirport.timezone_id,
                depUTC: depDate,
                arrUTC: arrDate
            }
        });

    } catch (error) {
        console.error('Duration calculation error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}
