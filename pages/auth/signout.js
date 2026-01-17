import { signOut } from 'next-auth/react';
import { useRouter } from 'next/router';

export default function SignOut() {
    const router = useRouter();

    const handleSignOut = () => {
        signOut({ callbackUrl: '/' });
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <h1>🚐 TRIPT.IO</h1>
                <h2>Are you sure?</h2>
                <p className="text-secondary">We'll miss you. Come back soon for more bangin' adventures!</p>

                <button onClick={handleSignOut} className="btn-primary">
                    Yes, Sign Out
                </button>
                <button onClick={() => router.back()} className="btn-secondary">
                    Stay logged in
                </button>
            </div>

            <style jsx>{`
                .auth-container {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    min-height: 100vh;
                    background: #fdfaf5;
                    font-family: 'Inter', sans-serif;
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
                h1 { font-family: 'Bungee', cursive; margin-bottom: 10px; }
                h2 { font-family: 'Outfit', sans-serif; margin-bottom: 20px; }
                p { margin-bottom: 30px; }
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
                    font-size: 16px;
                }
                .btn-secondary {
                    background: white;
                    color: #2c3e50;
                }
                .text-secondary { color: #666; font-size: 14px; }
            `}</style>
        </div>
    );
}
