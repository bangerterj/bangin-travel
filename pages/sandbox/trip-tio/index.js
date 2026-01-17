import { useState, useRef } from "react";
import Flatpickr from "react-flatpickr";
import "flatpickr/dist/themes/airbnb.css"; // Clean theme
import styles from "./styles.module.css";
import { LocationSearch } from "../../../public/components/LocationSearch";

// --- Types & Constants ---
const VIBE_OPTIONS = [
    "Scenic & outdoors",
    "Food & drinks",
    "History & culture",
    "Music & nightlife",
    "Road trips & wandering",
    "Relaxed & slow",
    "Romantic",
];

const COMPANION_OPTIONS = [
    { id: 'solo', label: "Just Me", defaultSize: 1 },
    { id: 'partner', label: "My Partner", defaultSize: 2 },
    { id: 'friends', label: "Friends", defaultSize: 4 },
    { id: 'family', label: "Family", defaultSize: 4 }
];

// --- Helper Components ---
function Spinner({ text }) {
    return (
        <div style={{ textAlign: "center", padding: "40px" }}>
            <div className={styles.spinner} />
            {text && <p className={styles.loaderText}>{text}</p>}
        </div>
    );
}

// --- Main Page Component ---
export default function TripTioSandbox() {
    // State Machine: 'DESTINATION' | 'DATES' | 'VIBE' | 'PACE' | 'COMPANIONS' | 'SUMMARY' | 'PREVIEWS' | 'ITINERARY'
    const [step, setStep] = useState("DESTINATION");
    const [loading, setLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState("Initializing...");

    // User Data
    const [destination, setDestination] = useState("");
    // Dates are now Date objects or strings, let's keep them as strings YYYY-MM-DD for API
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [dateRange, setDateRange] = useState([null, null]); // For range picker

    const [seasonalInsight, setSeasonalInsight] = useState("");

    // Vibe State
    const [selectedVibes, setSelectedVibes] = useState([]);
    const [otherVibe, setOtherVibe] = useState("");

    const [pace, setPace] = useState(50); // 0 = Chill, 100 = Packed

    // Companions State (Rich Object)
    const [companionType, setCompanionType] = useState("");
    const [groupSize, setGroupSize] = useState(1);
    const [companionDetails, setCompanionDetails] = useState(""); // Ages, who acts
    const [groupInterests, setGroupInterests] = useState(""); // Specific likes

    const [previews, setPreviews] = useState([]);
    const [selectedPreview, setSelectedPreview] = useState(null);
    const [itinerary, setItinerary] = useState([]);

    // Refs for scrolling
    const containerRef = useRef(null);

    // --- Actions ---

    const handleDestinationSubmit = () => {
        if (destination.trim()) setStep("DATES");
    };

    const loadExample = () => {
        setDestination("Munich");
        setStep("DATES");
    };

    const formatDate = (date) => {
        if (!date) return "";
        // Handle timezone offset so we don't jump back a day
        const offset = date.getTimezoneOffset();
        const d = new Date(date.getTime() - (offset * 60 * 1000));
        return d.toISOString().split('T')[0];
    };

    const handleDatesChange = (dates) => {
        setDateRange(dates);
        if (dates[0]) setStartDate(formatDate(dates[0]));
        if (dates[1]) setEndDate(formatDate(dates[1]));
        else setEndDate("");
    };

    const handleDatesSubmit = async () => {
        if (startDate && endDate) {
            setLoading(true);
            try {
                // UPDATE: API path is now pages/api/sandbox/trip-tio
                const res = await fetch("/api/sandbox/trip-tio", {
                    method: "POST",
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        action: "seasonal-insight",
                        destination,
                        startDate,
                        endDate,
                    }),
                });
                const data = await res.json();
                setSeasonalInsight(data.insight);
                setStep("VIBE");
            } catch (err) {
                console.error(err);
                setSeasonalInsight("Could not load insight.");
                setStep("VIBE");
            } finally {
                setLoading(false);
            }
        }
    };

    const toggleVibe = (vibe) => {
        if (selectedVibes.includes(vibe)) {
            setSelectedVibes(selectedVibes.filter((v) => v !== vibe));
        } else {
            if (selectedVibes.length < 3) {
                setSelectedVibes([...selectedVibes, vibe]);
            }
        }
    };

    const generatePreviews = async () => {
        setLoading(true);
        const messages = [
            "Checking the weather...",
            "Scouting hidden gems...",
            "Checking opening hours...",
            "Curating top-rated spots...",
            "Applying your vibe...",
            "Finalizing itinerary..."
        ];
        let msgIdx = 0;
        setLoadingMessage(messages[0]);

        const msgInterval = setInterval(() => {
            msgIdx = (msgIdx + 1) % messages.length;
            setLoadingMessage(messages[msgIdx]);
        }, 1200);

        try {
            // Combine vibes
            const finalVibes = [...selectedVibes];
            if (otherVibe.trim()) finalVibes.push(otherVibe.trim());

            // Build rich companion object
            const companionData = {
                type: companionType,
                size: groupSize,
                details: companionDetails,
                interests: groupInterests
            };

            // UPDATE: API path is now pages/api/sandbox/trip-tio
            const res = await fetch("/api/sandbox/trip-tio", {
                method: "POST",
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: "previews",
                    destination,
                    startDate,
                    endDate,
                    vibe: finalVibes,
                    pace: pace > 70 ? "Packed" : pace < 30 ? "Relaxed" : "Balanced",
                    companions: companionData,
                }),
            });
            const data = await res.json();
            setPreviews(data.previews || []);
            setStep("PREVIEWS");
        } catch (err) {
            console.error(err);
            alert("Failed to generate previews. Try again.");
        } finally {
            clearInterval(msgInterval);
            setLoading(false);
        }
    };

    const selectPreview = (preview) => {
        setSelectedPreview(preview);
        // New structure: "items" array content
        setItinerary(preview.items || []);
        setStep("ITINERARY");
    };

    // --- Mobile Swiper Logic ---
    const [currentCardIndex, setCurrentCardIndex] = useState(0);

    const nextCard = (e) => {
        e.stopPropagation();
        if (currentCardIndex < previews.length - 1) {
            setCurrentCardIndex(prev => prev + 1);
        }
    };

    const prevCard = (e) => {
        e.stopPropagation();
        if (currentCardIndex > 0) {
            setCurrentCardIndex(prev => prev - 1);
        }
    };

    // --- Render Steps ---

    return (
        <div className={styles.container} ref={containerRef}>
            <header className={styles.hero}>
                <h1 className={styles.title}>Trip Tio Sandbox</h1>
                <p className={styles.subtitle}>AI-powered travel planning prototype</p>
                {step === "DESTINATION" && (
                    <button onClick={loadExample} className={styles.secondaryButton} style={{ marginTop: '10px' }}>Load Example (Munich)</button>
                )}
            </header>

            <div className={styles.card}>

                {/* Step 1: Destination */}
                {step === "DESTINATION" && (
                    <div>
                        <h2 className={styles.question}>Where do you want to go?</h2>
                        <div className={styles.inputGroup}>
                            <div className={styles.locationWrapper}>
                                <LocationSearch
                                    onSelect={(option) => {
                                        setDestination(option.displayName);
                                        // Auto-advance on selection
                                        setTimeout(() => setStep("DATES"), 200);
                                    }}
                                    placeholder="e.g. Munich, Scotland, Kyoto"
                                />
                            </div>
                            {/* Fallback/Manual advance if they type/don't select */}
                            {destination && (
                                <button
                                    className={styles.button}
                                    onClick={handleDestinationSubmit}
                                >
                                    Next
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* Step 2: Dates */}
                {step === "DATES" && (
                    <div>
                        <div className={styles.insightBox} style={{ background: '#f3f4f6', borderColor: '#2c3e50', color: '#111' }}>
                            Planning a trip to <strong>{destination.split(',')[0]}</strong>. <button className={styles.secondaryButton} onClick={() => setStep("DESTINATION")}>Change</button>
                        </div>
                        <h2 className={styles.question}>When are you thinking of going?</h2>
                        <div className={styles.inputGroup}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem', color: '#5d6d7e', fontFamily: 'Outfit' }}>Pick your dates</label>
                                <Flatpickr
                                    className={styles.input}
                                    options={{
                                        mode: "range",
                                        dateFormat: "Y-m-d",
                                        altInput: true,
                                        altFormat: "M j, Y",
                                        minDate: "today"
                                    }}
                                    value={dateRange}
                                    onChange={handleDatesChange}
                                    placeholder="Select start date to end date"
                                />
                            </div>

                            <p style={{ fontSize: '0.9rem', color: '#888' }}>You can change this later — it helps me tailor things to the season.</p>

                            {loading ? <Spinner text="Checking seasonal vibes..." /> : (
                                <button
                                    className={styles.button}
                                    disabled={!startDate || !endDate}
                                    onClick={handleDatesSubmit}
                                >
                                    Next
                                </button>
                            )}
                        </div>
                    </div>
                )}


                {(step === "VIBE" || step === "PACE" || step === "COMPANIONS" || step === "SUMMARY") && (
                    <div>
                        {step === "VIBE" && seasonalInsight && (
                            <div className={styles.insightBox}>
                                💡 {seasonalInsight}
                            </div>
                        )}

                        {/* Step 4: Vibe */}
                        {step === "VIBE" && (
                            <div className="animate-fade-in">
                                <h2 className={styles.question}>What is the vibe? <span style={{ fontSize: '0.8em', fontWeight: 'normal', color: '#7f8c8d' }}>(Select up to 3)</span></h2>
                                <p style={{ fontSize: '0.95rem', color: '#5d6d7e', marginBottom: '10px' }}>Describe it in your own words matching your theme...</p>
                                <input
                                    className={styles.input}
                                    type="text"
                                    placeholder="e.g. Long walks on the beach, culinary adventures, art museums"
                                    value={otherVibe}
                                    onChange={e => setOtherVibe(e.target.value)}
                                    autoFocus
                                />

                                <p style={{ fontSize: '0.9rem', color: '#888', marginTop: '25px', marginBottom: '10px', fontWeight: 500 }}>Or pick a theme to get started:</p>
                                <div className={styles.chipsGrid}>
                                    {VIBE_OPTIONS.map(opt => {
                                        const isSelected = selectedVibes.includes(opt);
                                        const isDisabled = !isSelected && selectedVibes.length >= 3;
                                        return (
                                            <button
                                                key={opt}
                                                className={`${styles.chip} ${isSelected ? styles.selected : ''}`}
                                                disabled={isDisabled}
                                                onClick={() => {
                                                    if (isSelected) {
                                                        setSelectedVibes(prev => prev.filter(v => v !== opt));
                                                    } else if (selectedVibes.length < 3) {
                                                        setSelectedVibes(prev => [...prev, opt]);
                                                    }
                                                }}
                                                style={{ opacity: isDisabled ? 0.5 : 1, width: '100%', justifyContent: 'center' }}
                                            >
                                                {opt} {isSelected && '✓'}
                                            </button>
                                        );
                                    })}
                                </div>

                                <div style={{ marginTop: '30px' }}>
                                    <button className={styles.button} disabled={selectedVibes.length === 0 && !otherVibe.trim()} onClick={() => setStep("PACE")}>Next</button>
                                </div>
                            </div>
                        )}

                        {/* Step 5: Pace */}
                        {step === "PACE" && (
                            <div>
                                <h2 className={styles.question}>How full do you want your days?</h2>
                                <div className={styles.sliderContainer}>
                                    <input
                                        type="range"
                                        min="0"
                                        max="100"
                                        value={pace}
                                        onChange={(e) => setPace(e.target.value)}
                                        style={{ width: '100%', accentColor: '#3498db' }}
                                    />
                                    <div className={styles.sliderLabels}>
                                        <span>Chill</span>
                                        <span>Balanced</span>
                                        <span>Packed</span>
                                    </div>
                                </div>
                                <button className={styles.button} onClick={() => setStep("COMPANIONS")}>Next</button>
                            </div>
                        )}

                        {/* Step 6: Companions (Rich Form) */}
                        {step === "COMPANIONS" && (
                            <div>
                                <h2 className={styles.question}>Who is coming with you?</h2>

                                <div className={styles.inputGroup}>
                                    {/* Type Chips */}
                                    <div className={styles.chips} style={{ marginBottom: '20px' }}>
                                        {COMPANION_OPTIONS.map(opt => (
                                            <button
                                                key={opt.id}
                                                className={`${styles.chip} ${companionType === opt.label ? styles.selected : ''}`}
                                                onClick={() => {
                                                    setCompanionType(opt.label);
                                                    setGroupSize(opt.defaultSize);
                                                }}
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Group Size - Conditional */}
                                    {(companionType !== 'Just Me' && companionType !== 'My Partner') && (
                                        <div className="animate-fade-in">
                                            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 600, fontFamily: 'Outfit' }}>How many people?</label>
                                            <input
                                                className={styles.input}
                                                type="number"
                                                min="1"
                                                max="50"
                                                value={groupSize}
                                                onChange={(e) => setGroupSize(parseInt(e.target.value))}
                                            />
                                        </div>
                                    )}

                                    {/* Details - Only show if not Solo and type is selected */}
                                    {(companionType && companionType !== 'Just Me') && (
                                        <div className="animate-fade-in" style={{ marginTop: '15px' }}>
                                            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 600, fontFamily: 'Outfit' }}>Who are they? (Ages, relationship)</label>
                                            <textarea
                                                className={styles.input}
                                                rows={2}
                                                placeholder="e.g. Me, wife, 2 kids (5 and 8) or 3 couples in their 30s"
                                                value={companionDetails}
                                                onChange={(e) => setCompanionDetails(e.target.value)}
                                            />
                                        </div>
                                    )}

                                    {/* Specific Interests - Always show if type selected? Or same logic? "Just Me" has interests. */}
                                    {companionType && (
                                        <div className="animate-fade-in" style={{ marginTop: '15px' }}>
                                            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 600, fontFamily: 'Outfit' }}>Any specific interests or must-haves?</label>
                                            <textarea
                                                className={styles.input}
                                                rows={2}
                                                placeholder="e.g. Kids love dinosaurs, we love wine. No super long hikes."
                                                value={groupInterests}
                                                onChange={(e) => setGroupInterests(e.target.value)}
                                            />
                                        </div>
                                    )}

                                    <div style={{ marginTop: '20px' }}>
                                        <button className={styles.button} disabled={!companionType} onClick={() => setStep("SUMMARY")}>Next</button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Step 7: Summary & Generate */}
                        {step === "SUMMARY" && (
                            <div>
                                <h2 className={styles.question}>Plan Summary</h2>
                                <div className={styles.insightBox} style={{ background: '#ffffff', borderColor: '#2c3e50', color: '#2c3e50' }}>
                                    I’ll plan a <strong>{pace > 70 ? 'packed' : pace < 30 ? 'relaxed' : 'balanced'} {destination} trip</strong> in <strong>{startDate}</strong>.<br /><br />
                                    Vibe: <strong>{selectedVibes.join(", ")} {otherVibe && `+ ${otherVibe}`}</strong><br />
                                    Group: <strong>{groupSize} {companionType}</strong> ({companionDetails || 'No details'})<br />
                                    Notes: <em>{groupInterests || 'None'}</em>
                                </div>
                                {loading ? (
                                    // No inline spinner anymore, main loading overlay handles it
                                    <div className={styles.loadingPlaceholder}>
                                        Preparing magic...
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', gap: '10px', flexDirection: 'column' }}>
                                        <button className={styles.button} onClick={generatePreviews}>✔️ Sounds good</button>
                                        <button className={styles.secondaryButton} onClick={() => setStep("VIBE")}>✏️ Change something</button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Loading Overlay */}
                {loading && (
                    <div className={styles.loadingOverlay}>
                        <div className={styles.spinner}></div>
                        <h2 className={styles.loadingText}>{loadingMessage}</h2>
                    </div>
                )}

                {/* Step 8: Previews (New Grid/Swipe Layout) */}
                {step === "PREVIEWS" && (
                    <div className={styles.previewsContainer}>
                        <h2 className={styles.question}>Choose a starting point</h2>

                        {/* Mobile Controls */}
                        <div className={styles.mobileControls}>
                            <span className={styles.pageIndicator}>Option {currentCardIndex + 1} of {previews.length}</span>
                        </div>

                        <div
                            className={styles.previewGrid}
                            style={{ '--current-index': currentCardIndex }}
                        >
                            {previews.map((p, idx) => (
                                <div
                                    key={p.id}
                                    className={`${styles.previewCard} ${idx === currentCardIndex ? styles.activeCard : ''}`}
                                    onClick={() => selectPreview(p)}
                                >
                                    <div className={styles.previewTitle}>{p.title}</div>
                                    <div style={{ marginBottom: '10px' }}>
                                        <span className={styles.tag}>{p.theme}</span>
                                        <span className={styles.tag}>{p.pace} Pace</span>
                                    </div>
                                    <p style={{ fontSize: '0.9rem', color: '#5d6d7e', marginBottom: '15px', fontStyle: 'italic' }}>"{p.reasonForTimeOfYear}"</p>

                                    <div className={styles.previewItemsList}>
                                        <strong>Highlights:</strong>
                                        <ul style={{ paddingLeft: '20px', fontSize: '0.9rem', color: '#2c3e50', marginTop: '5px' }}>
                                            {p.highlights.map((h, i) => <li key={i}>{h}</li>)}
                                        </ul>
                                    </div>

                                    <div style={{ marginTop: 'auto', paddingTop: '15px', fontWeight: '600', color: '#3498db' }}>Select this plan →</div>

                                    {/* Mobile Only: Navigation overlay if desired, or use buttons below */}
                                </div>
                            ))}
                        </div>

                        {/* Mobile Navigation Buttons */}
                        <div className={styles.mobileNav}>
                            <button className={styles.navButton} onClick={prevCard} disabled={currentCardIndex === 0}>←</button>
                            <button className={styles.navButton} onClick={nextCard} disabled={currentCardIndex === previews.length - 1}>→</button>
                        </div>
                    </div>
                )}

                {/* Step 9: Itinerary List (Updated) */}
                {step === "ITINERARY" && selectedPreview && (
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h2 className={styles.question}>{selectedPreview.title}</h2>
                            <button className={styles.secondaryButton} onClick={() => setStep("PREVIEWS")}>Back</button>
                        </div>

                        <p style={{ marginBottom: '20px', color: '#7f8c8d' }}>Included Experiences:</p>

                        <div className={styles.itineraryList}>
                            {itinerary.map((item, idx) => (
                                <div key={idx} className={styles.dayItem} style={{ alignItems: 'center' }}>
                                    <div className={styles.itemIcon}>
                                        {item.category === 'Dining' && '🍽️'}
                                        {item.category === 'Activity' && '🎯'}
                                        {item.category === 'Chill' && '☕'}
                                        {item.category === 'Nightlife' && '🍸'}
                                        {!['Dining', 'Activity', 'Chill', 'Nightlife'].includes(item.category) && '📍'}
                                    </div>
                                    <div className={styles.itemContent}>
                                        <div className={styles.itemTitle}>{item.title} <span style={{ fontSize: '0.8em', color: '#95a5a6', marginLeft: '5px' }}>({item.duration})</span></div>
                                        <div className={styles.itemNotes}>{item.description}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}
