import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { invitations, trips } from "../../../lib/db";
import { createTransport } from "nodemailer";

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    const session = await getServerSession(req, res, authOptions);

    if (!session) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    const { tripId, email, role = 'CONTRIBUTOR' } = req.body;

    if (!tripId || !email) {
        return res.status(400).json({ message: 'Trip ID and Email are required' });
    }

    try {
        const trip = await trips.getById(tripId);
        if (!trip) return res.status(404).json({ message: 'Trip not found' });

        // Generate invitation
        const invite = await invitations.create(tripId, email, role);
        const joinUrl = `${process.env.NEXTAUTH_URL}/join/${invite.token}`;

        // In development, log the invite link to console
        if (process.env.NODE_ENV !== 'production') {
            console.log('\n🔗 INVITE LINK (Development Mode):');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log(`Trip: ${trip.name}`);
            console.log(`Invitee: ${email}`);
            console.log(`Link: ${joinUrl}`);
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        }

        // Send email (skip if no API key in development)
        if (process.env.RESEND_API_KEY) {
            const transporter = createTransport({
                host: "smtp.resend.com",
                port: 465,
                auth: {
                    user: "resend",
                    pass: process.env.RESEND_API_KEY,
                },
            });

            await transporter.sendMail({
                from: process.env.EMAIL_FROM || "TRIPT.IO <onboarding@resend.dev>",
                to: email,
                subject: `🚐 You've been invited to join ${trip.name}!`,
                html: `
                    <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
                        <h1 style="color: #333; font-size: 24px;">🚐 TRIPT.IO</h1>
                        <p style="color: #666; font-size: 16px; line-height: 1.5;">
                            <strong>${session.user.name || session.user.email}</strong> has invited you to collaborate on the trip <strong>${trip.name}</strong>.
                        </p>
                        <a href="${joinUrl}" style="display: inline-block; background: #f39c12; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0; font-weight: bold;">
                            Accept Invitation
                        </a>
                        <p style="color: #999; font-size: 14px;">
                            If you don't have an account, you'll be prompted to create one.
                        </p>
                    </div>
                `,
            });
        } else if (process.env.NODE_ENV !== 'production') {
            console.log('⚠️  Skipping email send (no RESEND_API_KEY configured)');
        }

        return res.status(200).json({
            message: 'Invitation sent successfully',
            ...(process.env.NODE_ENV !== 'production' && { inviteLink: joinUrl })
        });
    } catch (error) {
        console.error('Invite error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}
