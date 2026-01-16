export default function VerifyRequest() {
    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#0f172a',
            fontFamily: 'system-ui, sans-serif'
        }}>
            <div style={{
                backgroundColor: '#1e293b',
                padding: '40px',
                borderRadius: '12px',
                textAlign: 'center',
                maxWidth: '400px'
            }}>
                <h1 style={{ color: '#fff', fontSize: '28px', marginBottom: '16px' }}>
                    📧 Check your email
                </h1>
                <p style={{ color: '#94a3b8', fontSize: '16px', lineHeight: '1.6' }}>
                    We just sent you a magic link to sign in.
                    <br /><br />
                    Click the link in the email to continue.
                </p>
                <p style={{ color: '#64748b', fontSize: '14px', marginTop: '24px' }}>
                    Didn't receive it? Check your spam folder.
                </p>
            </div>
        </div>
    );
}
