import { airports } from '../../../lib/db';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', ['GET']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    const { q } = req.query;

    if (!q || q.length < 2) {
        return res.status(400).json({ error: 'Query too short' });
    }

    try {
        const results = await airports.search(q);
        res.status(200).json(results);
    } catch (error) {
        console.error('Airport search error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}
