import { useState, useRef, useEffect } from "react";
import { useSession, signIn } from "next-auth/react";
import Flatpickr from "react-flatpickr";
import "flatpickr/dist/themes/airbnb.css"; // Clean theme
import { format, eachDayOfInterval, isValid } from 'date-fns';
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

    const { data: session } = useSession();

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
    const [selectedItemIds, setSelectedItemIds] = useState(new Set());
    const [scheduledItems, setScheduledItems] = useState([]); // Array of { item, date, time }
    const [isImporting, setIsImporting] = useState(false);

    // Helpers
    const parseDurationMock = (str) => {
        if (!str) return 60;
        if (str.toLowerCase().includes('half')) return 240;
        if (str.toLowerCase().includes('day')) return 480;
        const match = str.match(/(\d+(\.\d+)?)/);
        return match ? parseFloat(match[1]) * 60 : 60;
    };

    useEffect(() => {
        if (step === "IMPORT_REVIEW") {
            generateSchedule();
        }
    }, [step]);

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

    const loadMockPacked = () => {
        setLoading(true);
        setTimeout(() => {
            setDestination("Mexico City, Mexico");

            // Dates: Next Monday to next Sunday (7 days)
            const today = new Date();
            const nextMonday = new Date(today);
            nextMonday.setDate(today.getDate() + (1 + 7 - today.getDay()) % 7 || 7);
            const nextSunday = new Date(nextMonday);
            nextSunday.setDate(nextMonday.getDate() + 6);

            setStartDate(format(nextMonday, 'yyyy-MM-dd'));
            setEndDate(format(nextSunday, 'yyyy-MM-dd'));
            setDateRange([nextMonday, nextSunday]);

            setPace(90); // Packed
            setSelectedVibes(["History & culture", "Food & drinks"]);
            setOtherVibe("Street food & ruins");
            setCompanionType("Friends");
            setGroupSize(4);

            const mockItems = [
                { title: "Teotihuacan Pyramids", category: "Activity", duration: "Half Day", description: "Ancient pyramids of the Sun and Moon." },
                { title: "Anthropology Museum", category: "Activity", duration: "3h", description: "World-class museum of Mexican history." },
                { title: "Frida Kahlo Museum", category: "Activity", duration: "1.5h", description: "The Blue House in Coyoacan." },
                { title: "Chapultepec Castle", category: "Activity", duration: "2h", description: "Historic castle with city views." },
                { title: "Xochimilco Boats", category: "Activity", duration: "Half Day", description: "Colorful trajinera boats on canals." },
                { title: "Lucha Libre Wrestling", category: "Activity", duration: "3h", description: "Masked wrestling entertainment." },
                { title: "Historic Center Walk", category: "Activity", duration: "2h", description: "Zocalo, Cathedral, and ruins." },
                { title: "Coyoacan Market", category: "Activity", duration: "1h", description: "Traditional market with food and crafts." },
                { title: "Soumaya Museum", category: "Activity", duration: "1.5h", description: "Iconic architecture and art collection." },
                { title: "Palacio de Bellas Artes", category: "Activity", duration: "1h", description: "Stunning cultural center." },
                { title: "Tacos al Pastor @ El Huequito", category: "Dining", duration: "1h", description: "Famous street tacos." },
                { title: "Churros El Moro", category: "Dining", duration: "45m", description: "Historic churreria." },
                { title: "Pujol", category: "Dining", duration: "3h", description: "World-renowned fine dining." },
                { title: "Contramar", category: "Dining", duration: "2h", description: "Famous seafood lunch spot." },
                { title: "Rosetta", category: "Dining", duration: "2h", description: "Italian-Mexican in a beautiful mansion." },
                { title: "Cafe Nin", category: "Dining", duration: "1h", description: "Charming breakfast spot." },
                { title: "Street Corn (Elotes)", category: "Dining", duration: "30m", description: "Classic street snack." },
                { title: "Mezcal Tasting", category: "Dining", duration: "1.5h", description: "Sample artisanal mezcals." },
                { title: "Maximo Bistrot", category: "Dining", duration: "2h", description: "Farm-to-table french fusion." },
                { title: "Panaderia Rosetta", category: "Dining", duration: "30m", description: "Famous bakery (Guava roll!)." },
                { title: "Roma Norte Stroll", category: "Activity", duration: "1.5h", description: "Walk through trendy neighborhood." }
            ];

            setItinerary(mockItems);
            setSelectedItemIds(new Set(mockItems.map((_, i) => i)));

            // Mock preview obj for context
            setSelectedPreview({ title: "Mock Packed Trip", theme: "Ultimate Mexico City", pace: "Packed" });

            setStep("IMPORT_REVIEW");
            setLoading(false);
        }, 500);
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
        const items = preview.items || [];
        setItinerary(items);
        // Select all by default. Using index as ID if no ID provided, but items usually don't have IDs in the current mock?
        // Let's assume we use index if title is not unique, but title should be unique enough for this demo.
        // Actually, let's just use index for simplicity in this sandbox.
        setSelectedItemIds(new Set(items.map((_, i) => i)));
        setStep("ITINERARY");
    };

    const toggleItem = (index) => {
        const newSet = new Set(selectedItemIds);
        if (newSet.has(index)) {
            newSet.delete(index);
        } else {
            newSet.add(index);
        }
        setSelectedItemIds(newSet);
    };

    const generateSchedule = () => {
        let dates = [];
        try {
            const start = new Date(startDate);
            const end = new Date(endDate);
            if (isValid(start) && isValid(end)) {
                dates = eachDayOfInterval({ start, end });
            }
        } catch (e) { }
        if (dates.length === 0) dates = [new Date()];

        const selectedIndices = Array.from(selectedItemIds);
        const inputItems = selectedIndices.map(i => itinerary[i]);

        // Split by category
        const diningItems = inputItems.filter(i => i.category === 'Dining' || i.title.toLowerCase().includes('restaurant') || i.title.toLowerCase().includes('dinner'));
        const activityItems = inputItems.filter(i => !diningItems.includes(i));

        let slots = [];

        dates.forEach((date, i) => {
            const isFirst = i === 0;
            const isLast = i === dates.length - 1;

            // Priority: 1=Morning (Start day), 2=Dinner (End day), 3=Lunch, 4=Afternoon, 5=Late
            if (isFirst) {
                slots.push({ date, h: 19, m: 0, type: 'dining', label: 'Welcome Dinner', priority: 1 });
            } else if (isLast && dates.length > 1) {
                slots.push({ date, h: 10, m: 0, type: 'activity', label: 'Farewell Activity', priority: 1 });
            } else {
                // Core Day Slots
                // 1. Morning Activity (All paces) - High Priority to ensure every day has a start
                slots.push({ date, h: 10, m: 0, type: 'activity', label: 'Morning Exploration', priority: 1 });

                // 2. Dinner (All paces) - High Priority to ensure every day has an end
                slots.push({ date, h: 19, m: 30, type: 'dining', label: 'Dinner', priority: 2 });

                // 3. Lunch (Balanced+)
                if (pace >= 35) {
                    slots.push({ date, h: 13, m: 0, type: 'dining', label: 'Lunch', priority: 3 });
                }

                // 4. Afternoon Activity (Packed+)
                if (pace >= 60) {
                    slots.push({ date, h: 15, m: 0, type: 'activity', label: 'Afternoon Adventure', priority: 4 });
                }

                // 5. Late Activity (Super Packed)
                if (pace >= 80) {
                    slots.push({ date, h: 21, m: 30, type: 'activity', label: 'Nightlife', priority: 5 });
                }
            }
        });

        // Sort slots by priority first (to distribute items evenly across days), then by date
        slots.sort((a, b) => {
            if (a.priority !== b.priority) return a.priority - b.priority;
            return a.date - b.date; // Round robin
        });

        const scheduled = [];

        slots.forEach(slot => {
            let item = null;
            if (slot.type === 'dining' && diningItems.length) item = diningItems.shift();
            else if (activityItems.length) item = activityItems.shift();
            else if (diningItems.length) item = diningItems.shift(); // Fallback

            if (item) {
                const d = new Date(slot.date);
                d.setHours(slot.h, slot.m);
                scheduled.push({
                    ...item,
                    assignedDate: d,
                    timeHint: slot.label
                });
            }
        });

        // Handle Leftovers - Append to core days if any
        if (activityItems.length > 0 || diningItems.length > 0) {
            const coreDays = dates.filter((_, i) => i !== 0 && i !== dates.length - 1);
            const targetDays = coreDays.length > 0 ? coreDays : dates;

            let dayIdx = 0;
            while (activityItems.length > 0) {
                const item = activityItems.shift();
                const d = new Date(targetDays[dayIdx % targetDays.length]);
                d.setHours(16, 30); // Late afternoon overflow
                scheduled.push({ ...item, assignedDate: d, timeHint: 'Extra Activity' });
                dayIdx++;
            }
            while (diningItems.length > 0) {
                const item = diningItems.shift();
                const d = new Date(targetDays[dayIdx % targetDays.length]);
                d.setHours(21, 0); // Late night overflow
                scheduled.push({ ...item, assignedDate: d, timeHint: 'Late Night Bite' });
                dayIdx++;
            }
        }

        // Sort final schedule
        scheduled.sort((a, b) => new Date(a.assignedDate) - new Date(b.assignedDate));

        setScheduledItems(scheduled);
    };

    const importTrip = async () => {
        setIsImporting(true);
        console.log("Starting Import...");
        try {
            // Date Format Utility - Ensure YYYY-MM-DD
            const formatDateAPI = (d) => {
                if (typeof d === 'string' && d.match(/^\d{4}-\d{2}-\d{2}$/)) return d;
                try { return d ? format(new Date(d), 'yyyy-MM-dd') : ''; } catch (e) { return ''; }
            };

            const payload = {
                name: `Trip to ${destination.split(',')[0]}`,
                destination,
                startDate: formatDateAPI(startDate),
                endDate: formatDateAPI(endDate)
            };

            console.log("Creating Trip Payload:", payload);

            // 1. Create Trip
            const tripRes = await fetch('/api/trips', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!tripRes.ok) {
                const txt = await tripRes.text();
                console.error("Trip creation failed:", txt);
                throw new Error(txt);
            }

            const trip = await tripRes.json();
            console.log("Trip Created Details:", trip);

            if (trip.id) {
                // 2. Add Items
                console.log(`Adding ${scheduledItems.length} items to Trip ${trip.id}...`);

                // Wait for all items to safeguard against race conditions or rate limits
                await Promise.all(scheduledItems.map(async (item) => {
                    try {
                        const startAt = new Date(item.assignedDate);
                        if (isNaN(startAt.getTime())) {
                            console.error("Invalid Date for item:", item.title, item.assignedDate);
                            return;
                        }

                        const durationMins = parseDurationMock(item.duration);
                        const endAt = new Date(startAt.getTime() + durationMins * 60000);

                        let type = 'activity';
                        const catLower = (item.category || '').toLowerCase();
                        if (catLower === 'stay' || item.title.toLowerCase().includes('hotel')) type = 'stay';
                        else if (catLower === 'food' || catLower === 'dining') type = 'activity'; // Trip Tio treats dining as activity mostly, but DB has no 'dining' type? DB types: flight, stay, transit, activity. Dinner is an activity.

                        // DB 'items' table usually expects: type IN ('flight', 'stay', 'transit', 'activity')
                        // We'll stick to 'activity' for food.

                        const itemPayload = {
                            type,
                            title: item.title,
                            notes: item.description,
                            startAt: startAt.toISOString(),
                            endAt: endAt.toISOString(),
                            status: 'planned',
                            metadata: {
                                category: item.category,
                                neighborhood: item.neighborhood,
                                timeHint: item.timeHint,
                            }
                        };

                        console.log(`POST Item: ${item.title} @ ${itemPayload.startAt}`);

                        const itemRes = await fetch(`/api/trips/${trip.id}/items`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(itemPayload)
                        });

                        if (!itemRes.ok) {
                            console.error("Item Failed:", item.title, await itemRes.text());
                        } else {
                            // console.log("Item Saved:", item.title);
                        }
                    } catch (err) {
                        console.error("Item Loop Critical Error:", err);
                    }
                }));
                console.log("Import Complete!");
                setStep("IMPORT_SUCCESS");
            }
        } catch (e) {
            console.error("Import Error:", e);
            alert("Error importing trip: " + e.message);
        } finally {
            setIsImporting(false);
        }
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
                <p className={styles.subtitle}>AI-powered travel planning prototype</p>
                {step === "DESTINATION" && (
                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '10px' }}>
                        <button onClick={loadExample} className={styles.secondaryButton}>Load Example (Munich)</button>
                        <button onClick={loadMockPacked} className={styles.secondaryButton} style={{ borderColor: '#e67e22', color: '#e67e22' }}>⚡ Mock (Packed 7-Day)</button>
                    </div>
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
                            {itinerary.map((item, idx) => {
                                const isSelected = selectedItemIds.has(idx);
                                return (
                                    <div
                                        key={idx}
                                        className={styles.dayItem}
                                        style={{ alignItems: 'center', cursor: 'pointer', opacity: isSelected ? 1 : 0.6, transition: 'all 0.2s' }}
                                        onClick={() => toggleItem(idx)}
                                    >
                                        <div style={{ marginRight: '15px' }}>
                                            <div style={{
                                                width: '24px', height: '24px', borderRadius: '50%',
                                                border: isSelected ? 'none' : '2px solid #cbd5e1',
                                                background: isSelected ? '#2c3e50' : 'white',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                color: 'white', fontSize: '14px'
                                            }}>
                                                {isSelected && '✓'}
                                            </div>
                                        </div>
                                        <div className={styles.itemIcon}>
                                            {item.category === 'Dining' ? '🍽️' :
                                                item.category === 'Activity' ? '🎟️' :
                                                    item.category === 'Chill' ? '☕' : '✨'}
                                        </div>
                                        <div className={styles.itemContent}>
                                            <div className={styles.itemTitle}>{item.title} <span style={{ fontSize: '0.8em', color: '#95a5a6', marginLeft: '5px' }}>({item.duration})</span></div>
                                            <div className={styles.itemNotes}>{item.description}</div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div style={{ marginTop: '30px', display: 'flex', gap: '10px' }}>
                            <button className={styles.secondaryButton} onClick={() => setStep("PREVIEWS")}>Back</button>
                            <button className={styles.button} disabled={selectedItemIds.size === 0} onClick={() => setStep("IMPORT_REVIEW")}>Next: Review</button>
                        </div>
                    </div>
                )}

                {/* Step 10: Import Review */}
                {step === "IMPORT_REVIEW" && (
                    <div className="animate-fade-in">
                        <h2 className={styles.question}>Review your trip</h2>
                        <div className={styles.insightBox} style={{ background: '#e0f2f1', borderColor: '#00695c', color: '#004d40' }}>
                            We've drafted a schedule for your {selectedItemIds.size} items. You can refine dates & times after importing.
                        </div>

                        <div className={styles.calendarGrid} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '15px', marginTop: '20px' }}>
                            {(() => {
                                let dates = [];
                                try {
                                    if (startDate && endDate) {
                                        const start = new Date(startDate);
                                        const end = new Date(endDate);
                                        if (isValid(start) && isValid(end)) {
                                            dates = eachDayOfInterval({ start, end });
                                        }
                                    }
                                } catch (e) { }
                                if (dates.length === 0) dates = [new Date()];

                                return dates.map((date, dayIdx) => {
                                    const isFirst = dayIdx === 0;
                                    const isLast = dayIdx === dates.length - 1;

                                    // Filter from State
                                    const dayPlan = scheduledItems.filter(item =>
                                        format(new Date(item.assignedDate), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
                                    ).sort((a, b) => new Date(a.assignedDate) - new Date(b.assignedDate));

                                    return (
                                        <div key={dayIdx} style={{ background: '#f8fafc', padding: '15px', borderRadius: '12px', border: '1px solid #e2e8f0', minHeight: '160px', opacity: isFirst ? 0.9 : 1 }}>
                                            <div style={{
                                                paddingBottom: '10px', marginBottom: '10px', borderBottom: '1px solid #e2e8f0',
                                                display: 'flex', justifyContent: 'space-between', alignItems: 'baseline'
                                            }}>
                                                <span style={{ color: '#2c3e50', fontWeight: 'bold', fontFamily: 'Outfit' }}>{format(date, 'EEE, MMM d')}</span>
                                                <span style={{ fontSize: '0.65rem', color: '#95a5a6', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '0.5px' }}>
                                                    {isFirst ? 'TRAVEL DAY' : isLast ? 'DEPARTURE' : `DAY ${dayIdx + 1}`}
                                                </span>
                                            </div>

                                            {isFirst && dayPlan.length === 0 && (
                                                <div style={{ fontSize: '0.8rem', color: '#7f8c8d', background: 'rgba(0,0,0,0.03)', padding: '8px', borderRadius: '6px', marginBottom: '10px' }}>
                                                    ✈️ Travel & Arrival
                                                </div>
                                            )}

                                            {dayPlan.length === 0 && !isFirst ? (
                                                <div style={{ fontSize: '0.8rem', color: '#bdc3c7', fontStyle: 'italic', padding: '10px' }}>Open Schedule</div>
                                            ) : (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                    {dayPlan.map((item, i) => (
                                                        <div key={i} style={{ background: 'white', padding: '10px', borderRadius: '8px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', borderLeft: item.category === 'Dining' ? '3px solid #e67e22' : '3px solid #3498db' }}>
                                                            <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#34495e', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                <span>{item.title}</span>
                                                                <span style={{ fontSize: '0.7rem', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', color: '#64748b', fontWeight: 600 }}>
                                                                    {format(new Date(item.assignedDate), 'h:mm a')}
                                                                </span>
                                                            </div>
                                                            <div style={{ fontSize: '0.75rem', color: '#7f8c8d', marginTop: '4px' }}>
                                                                {item.duration || 'Flexible'} {item.neighborhood && `• ${item.neighborhood}`}
                                                            </div>
                                                            <div style={{ fontSize: '0.75rem', color: '#95a5a6', fontStyle: 'italic', marginTop: '4px', lineHeight: '1.3' }}>{item.description}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                });
                            })()}
                        </div>

                        <div style={{ marginTop: '30px', display: 'flex', gap: '10px' }}>
                            <button className={styles.secondaryButton} onClick={() => setStep("ITINERARY")}>Back</button>
                            <button
                                className={styles.button}
                                onClick={session ? importTrip : () => signIn()}
                                disabled={isImporting}
                            >
                                {session ? (isImporting ? "Importing..." : "Import Trip 🚀") : "Log in to Import"}
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 11: Success */}
                {step === "IMPORT_SUCCESS" && (
                    <div className="animate-fade-in" style={{ textAlign: 'center', padding: '60px 0' }}>
                        <div style={{ fontSize: '5rem', marginBottom: '20px' }}>🎉</div>
                        <h2 className={styles.question}>Trip Created!</h2>
                        <p style={{ fontSize: '1.2rem', color: '#5d6d7e', marginBottom: '40px' }}>
                            Your itinerary for <strong>{destination.split(',')[0]}</strong> has been saved.
                        </p>
                        <button className={styles.button} onClick={() => window.location.href = '/'}>Go to Dashboard</button>
                    </div>
                )}

            </div>
        </div >
    );
}
