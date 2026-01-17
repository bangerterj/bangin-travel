import React from 'react';

const styles = {
    container: {
        maxWidth: '600px',
        margin: '40px auto',
        padding: '20px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        background: '#f8f9fa',
        borderRadius: '12px',
        border: '1px solid #e9ecef'
    },
    section: {
        marginBottom: '40px',
        background: 'white',
        padding: '20px',
        borderRadius: '12px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
    },
    headerRow: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '20px',
        paddingBottom: '16px',
        borderBottom: '2px solid #f1f3f5'
    },
    titleGroup: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
    },
    titleIcon: {
        fontSize: '24px'
    },
    titleText: {
        fontSize: '24px',
        fontWeight: '700',
        color: '#2c3e50',
        margin: 0
    },

    // Proposed Button Styles
    compactBtn: {
        width: '36px',
        height: '36px',
        borderRadius: '50%', // Circle
        border: 'none',
        background: '#2c3e50', // Primary color
        color: 'white',
        fontSize: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        boxShadow: '0 2px 6px rgba(44, 62, 80, 0.2)',
        transition: 'transform 0.1s ease',
        padding: 0,
        lineHeight: 1
    },

    // For comparison (Old Button)
    oldBtn: {
        padding: '8px 16px',
        borderRadius: '8px',
        border: 'none',
        background: '#2c3e50',
        color: 'white',
        fontSize: '14px',
        fontWeight: '600',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '6px'
    }
};

export default function UIRefreshSandbox() {
    return (
        <div style={styles.container}>
            <h1 style={{ textAlign: 'center', marginBottom: '40px' }}>UI Refresh: Headers & Actions</h1>

            {/* Option A: Current Implementation (Reference) */}
            <div style={styles.section}>
                <div style={{ ...styles.headerRow, justifyContent: 'space-between' }}>
                    <div style={styles.titleGroup}>
                        <span style={styles.titleIcon}>📍</span>
                        <h2 style={styles.titleText}>Activities (Current)</h2>
                    </div>
                    {/* Current styling often lacks gap if not explicitly handled, simulating close packing */}
                    <button style={styles.oldBtn}>➕ Add Activity</button>
                </div>
                <p style={{ color: '#868e96' }}>Current state: Button is large, takes up visual weight.</p>
            </div>

            {/* Option B: Proposed Compact Design (Activities) */}
            <div style={styles.section}>
                <div style={styles.headerRow}>
                    <div style={styles.titleGroup}>
                        <span style={styles.titleIcon}>📍</span>
                        <h2 style={styles.titleText}>Activities</h2>
                    </div>
                    <button style={styles.compactBtn} title="Add Activity">
                        <span>+</span>
                    </button>
                </div>
                <p style={{ color: '#868e96' }}>Proposed: Clean header, distinct spacing, compact action button.</p>
            </div>

            {/* Option C: Proposed Compact Design (Flights) */}
            <div style={styles.section}>
                <div style={styles.headerRow}>
                    <div style={styles.titleGroup}>
                        <span style={styles.titleIcon}>✈️</span>
                        <h2 style={styles.titleText}>Flights</h2>
                    </div>
                    <button style={styles.compactBtn} title="Add Flight">
                        <span>+</span>
                    </button>
                </div>
            </div>

            {/* Option D: Proposed Compact Design (Stays) */}
            <div style={styles.section}>
                <div style={styles.headerRow}>
                    <div style={styles.titleGroup}>
                        <span style={styles.titleIcon}>🏨</span>
                        <h2 style={styles.titleText}>Stays</h2>
                    </div>
                    <button style={styles.compactBtn} title="Add Stay">
                        <span>+</span>
                    </button>
                </div>
            </div>

        </div>
    );
}
