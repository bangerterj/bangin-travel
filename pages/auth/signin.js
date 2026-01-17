import { useState, useEffect } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/router';

export default function SignIn() {
    const { data: session, status } = useSession();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [step, setStep] = useState('email'); // 'email' | 'password' | 'link-sent'
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [hasPassword, setHasPassword] = useState(false);
    const router = useRouter();

    // Prevent redirect loops: if callback is signin, default to home
    let callbackUrl = router.query.callbackUrl || '/';
    if (typeof callbackUrl === 'string' && callbackUrl.includes('/auth/signin')) {
        callbackUrl = '/';
    }

    // Auto-redirect if already logged in
    useEffect(() => {
        if (status === 'authenticated') {
            router.replace(callbackUrl);
        }
    }, [status, callbackUrl, router]);

    const handleCheckEmail = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await fetch('/api/auth/verify-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });
            const data = await res.json();

            // Check if user exists first
            if (data.exists && data.hasPassword) {
                setHasPassword(true);
                setStep('password');
            } else if (data.exists && !data.hasPassword) {
                // Existing user without password - send magic link
                setStep('link-sent');
                await signIn('email', {
                    email,
                    redirect: false,
                    callbackUrl: callbackUrl,
                });
            } else {
                // New user - redirect to registration
                router.push(`/auth/register?email=${encodeURIComponent(email)}&callbackUrl=${encodeURIComponent(callbackUrl)}`);
            }
        } catch (err) {
            setError('Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordSignIn = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const result = await signIn('credentials', {
            email,
            password,
            redirect: false,
        });

        if (result.error) {
            setError('Invalid email or password');
            setLoading(false);
        } else {
            router.push(callbackUrl);
        }
    };

    const handleSendMagicLink = async () => {
        setLoading(true);
        setError('');

        const result = await signIn('email', {
            email,
            redirect: false,
            callbackUrl: callbackUrl,
        });

        if (result.error) {
            setError('Could not send magic link');
            setLoading(false);
        } else {
            setStep('link-sent');
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <h1>🚐 Bangin' Travel</h1>

                {step === 'email' && (
                    <form onSubmit={handleCheckEmail}>
                        <p>Enter your email to get started</p>
                        <input
                            type="email"
                            placeholder="email@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                        {error && <p className="error">{error}</p>}
                        <button type="submit" disabled={loading}>
                            {loading ? 'Checking...' : 'Continue'}
                        </button>
                    </form>
                )}

                {step === 'password' && (
                    <form onSubmit={handlePasswordSignIn}>
                        <p>Enter your password for <strong>{email}</strong></p>
                        <input
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                        {error && <p className="error">{error}</p>}
                        <button type="submit" disabled={loading}>
                            {loading ? 'Signing in...' : 'Sign In'}
                        </button>
                        <div className="divider"><span>OR</span></div>
                        <button
                            type="button"
                            className="btn-secondary"
                            onClick={handleSendMagicLink}
                            disabled={loading}
                        >
                            Send Magic Link instead
                        </button>
                    </form>
                )}

                {step === 'link-sent' && (
                    <div className="success-view">
                        <h2>Check your email!</h2>
                        <p>A sign-in link has been sent to <strong>{email}</strong>.</p>
                        <button onClick={() => setStep('email')} className="btn-secondary">
                            Back
                        </button>
                    </div>
                )}
            </div>

            <style jsx>{`
                .auth-container {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    min-height: 100vh;
                    background: #fdfaf5;
                }
                .auth-card {
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
                    margin-top: 10px;
                    box-shadow: 3px 3px 0px 0px #2c3e50;
                }
                button:disabled { opacity: 0.7; cursor: not-allowed; }
                .btn-secondary {
                    background: white;
                    color: #2c3e50;
                }
                .error { color: #e74c3c; font-size: 14px; margin: 5px 0; }
                .divider { margin: 20px 0; border-bottom: 1px solid #eee; position: relative; }
                .divider span { position: absolute; top: -10px; left: 50%; transform: translateX(-50%); background: white; padding: 0 10px; color: #999; font-size: 12px; }
            `}</style>
        </div>
    );
}
