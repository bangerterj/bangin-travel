import { useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/router';

export default function Register() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const callbackUrl = router.query.callbackUrl || '/';

    useEffect(() => {
        if (router.query.email) {
            setEmail(router.query.email);
        }
    }, [router.query.email]);

    const handleRegister = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            // Create account
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, name }),
            });

            if (!res.ok) {
                const data = await res.json();
                setError(data.message || 'Registration failed');
                setLoading(false);
                return;
            }

            // Auto sign-in after registration
            const result = await signIn('credentials', {
                email,
                password,
                redirect: false,
            });

            if (result.error) {
                setError('Account created but sign-in failed. Please try signing in manually.');
                setLoading(false);
            } else {
                router.push(callbackUrl);
            }
        } catch (err) {
            setError('Something went wrong. Please try again.');
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <h1>🚐 TRIPT.IO</h1>
                <p>Create a new account</p>

                <form onSubmit={handleRegister}>
                    <input
                        type="text"
                        placeholder="Your Name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                    />
                    <input
                        type="email"
                        placeholder="email@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                    <input
                        type="password"
                        placeholder="Password (min 6 characters)"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={6}
                    />
                    {error && <p className="error">{error}</p>}
                    <button type="submit" disabled={loading}>
                        {loading ? 'Creating account...' : 'Create Account'}
                    </button>
                </form>

                <div className="divider"><span>OR</span></div>

                <button
                    className="btn-secondary"
                    onClick={() => router.push(`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`)}
                >
                    Already have an account? Sign In
                </button>
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
