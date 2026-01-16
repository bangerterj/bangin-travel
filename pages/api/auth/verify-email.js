import { users } from '../../../lib/db';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ message: 'Email is required' });
    }

    try {
        console.log('[DEBUG verify-email] Looking up email:', email);
        const user = await users.getByEmail(email);
        console.log('[DEBUG verify-email] User found:', !!user);
        console.log('[DEBUG verify-email] Has password:', user ? !!user.password_hash : 'N/A');

        if (!user) {
            console.log('[DEBUG verify-email] Returning: exists=false, hasPassword=false');
            return res.status(200).json({
                exists: false,
                hasPassword: false
            });
        }

        const response = {
            exists: true,
            hasPassword: !!user.password_hash
        };
        console.log('[DEBUG verify-email] Returning:', response);
        return res.status(200).json(response);
    } catch (error) {
        console.error('Verify email error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}
