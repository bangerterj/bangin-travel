import { SessionProvider } from "next-auth/react";
import { useEffect, useState } from "react";
import '../public/styles.css';

export default function App({
    Component,
    pageProps: { session, ...pageProps },
}) {
    // Dev-only: redirect localhost to 127.0.0.1 for consistent auth cookies
    useEffect(() => {
        if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
            if (window.location.hostname === 'localhost') {
                window.location.hostname = '127.0.0.1';
            }
        }
    }, []);

    // DEBUG: Global Error Logger
    const [errorObj, setErrorObj] = useState(null);
    useEffect(() => {
        const errorHandler = (msg, url, lineNo, columnNo, err) => {
            setErrorObj({ msg, url, lineNo, columnNo, stack: err?.stack });
            return false;
        };
        const rejectHandler = (event) => {
            setErrorObj({ msg: 'Unhandled Promise Rejection: ' + event.reason });
        };

        window.onerror = errorHandler;
        window.onunhandledrejection = rejectHandler;

        return () => {
            window.onerror = null;
            window.onunhandledrejection = null;
        }
    }, []);

    return (
        <SessionProvider session={session}>
            {errorObj && (
                <div style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0,
                    zIndex: 10000,
                    backgroundColor: '#e74c3c',
                    color: 'white',
                    padding: '16px',
                    fontFamily: 'monospace',
                    fontSize: '12px',
                    overflow: 'auto',
                    maxHeight: '50vh',
                    borderBottom: '2px solid white'
                }}>
                    <strong>MOBILE DEBUGGER:</strong><br />
                    {errorObj.msg}<br />
                    {errorObj.lineNo && `Line: ${errorObj.lineNo}`}<br />
                    {errorObj.stack && <pre style={{ whiteSpace: 'pre-wrap' }}>{errorObj.stack}</pre>}
                    <button
                        onClick={() => setErrorObj(null)}
                        style={{ marginTop: '8px', padding: '4px', background: 'white', color: 'black' }}
                    >
                        Dismiss
                    </button>
                </div>
            )}
            <Component {...pageProps} />
        </SessionProvider>
    );
}
