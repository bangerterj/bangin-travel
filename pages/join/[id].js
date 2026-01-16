import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useSession, signIn } from 'next-auth/react';

export default function JoinTrip() {
    const router = useRouter();
    const { id } = router.query;
    const { data: session, status } = useSession();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [trip, setTrip] = useState(null);
    const [joining, setJoining] = useState(false);

    useEffect(() => {
        if (!id || status === 'loading') return;

        if (status === 'unauthenticated') {
            // Redirect to sign-in page, then come back to accept invite
            router.push(`/auth/signin?callbackUrl=${encodeURIComponent(window.location.href)}`);
            return;
        }

        const verifyJoin = async () => {
            try {
                const res = await fetch(`/api/invites/verify?id=${id}`);
                const data = await res.json();

                if (res.ok) {
                    if (data.type === 'invite') {
                        // Invitation token - attempt auto-join
                        handleJoin(true);
                    } else {
                        // Public share link - show passcode input
                        setTrip(data.trip);
                        setLoading(false);
                    }
                } else {
                    setError(data.message || 'Invalid join link');
                    setLoading(false);
                }
            } catch (err) {
                setError('Something went wrong');
                setLoading(false);
            }
        };

        verifyJoin();
    }, [id, status]);

    const handleJoin = async (isInviteToken = false) => {
        setJoining(true);
        setError('');

        try {
            const res = await fetch('/api/invites/accept', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id }),
            });

            if (res.ok) {
                router.push('/');
            } else {
                const data = await res.json();
                setError(data.message || 'Could not join trip');
            }
        } catch (err) {
            setError('Server error. Please try again.');
        } finally {
            setJoining(false);
        }
    };

    if (status === 'loading' || loading) {
        return <div className="join-view"><h2>Loading...</h2></div>;
    }

    if (error) {
        return (
            <div className="join-view">
                <div className="join-card error">
                    <h1>❌ Oops!</h1>
                    <p>{error}</p>
                    <button onClick={() => router.push('/')}>Go Home</button>
                </div>
            </div>
        );
    }

    return (
        <div className="join-view">
            <div className="join-card">
                <h1>🚐 Join Trip</h1>
                <p>You've been invited to join <strong>{trip?.name}</strong>!</p>
                <p className="text-secondary">{trip?.destination}</p>

                <div className="join-section">
                    <button
                        onClick={() => handleJoin(false)}
                        disabled={joining}
                        className="btn-primary"
                    >
                        {joining ? 'Joining...' : '🚀 Join Trip'}
                    </button>
                    <p className="text-muted" style={{ marginTop: '10px', fontSize: '0.8em' }}>
                        By joining, you'll be able to see and add items to this trip.
                    </p>
                </div>
            </div>

            <style jsx>{`
                .join-view {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    min-height: 100vh;
                    background: #fdfaf5;
                    font-family: 'Inter', sans-serif;
                }
                .join-card {
                    background: white;
                    padding: 40px;
                    border: 3px solid #2c3e50;
                    border-radius: 12px;
                    box-shadow: 6px 6px 0px 0px #2c3e50;
                    max-width: 400px;
                    width: 100%;
                    text-align: center;
                }
                h1 { font-family: 'Bungee', cursive; margin-bottom: 20px; }
                input {
                    width: 100%;
                    padding: 12px;
                    margin: 10px 0;
                    border: 2px solid #2c3e50;
                    border-radius: 6px;
                    font-size: 16px;
                    text-align: center;
                }
                button {
                    width: 100%;
                    padding: 14px;
                    background: #f39c12;
                    color: white;
                    border: 3px solid #2c3e50;
                    border-radius: 8px;
                    font-weight: bold;
                    cursor: pointer;
                    margin-top: 20px;
                    box-shadow: 3px 3px 0px 0px #2c3e50;
                }
                button:disabled { opacity: 0.7; cursor: not-allowed; }
                .text-secondary { color: #666; margin-bottom: 20px; }
                .text-muted { color: #999; }
                .join-section { margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee; }
            `}</style>
        </div>
    );
}
