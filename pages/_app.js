import { SessionProvider } from "next-auth/react";
import { useEffect } from "react";
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

    return (
        <SessionProvider session={session}>
            <Component {...pageProps} />
        </SessionProvider>
    );
}
