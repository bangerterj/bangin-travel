
const formatDateForInput = (dateStr, timezone) => {
    if (!dateStr) return '';
    try {
        const date = new Date(dateStr);
        console.log('Date parsed:', date.toISOString());

        if (timezone) {
            // "en-CA" is a trick to get YYYY-MM-DD, mixed with hour12: false for 24h time
            // We need YYYY-MM-DDTHH:mm
            const opts = {
                timeZone: timezone,
                year: 'numeric', month: '2-digit', day: '2-digit',
                hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
            };

            console.log('Intl opts:', opts);
            const formatter = new Intl.DateTimeFormat('en-CA', opts);
            const parts = formatter.formatToParts(date);
            console.log('Parts:', parts);

            const map = parts.reduce((acc, p) => ({ ...acc, [p.type]: p.value }), {});
            return `${map.year}-${map.month}-${map.day}T${map.hour}:${map.minute}`;
        }
        // Fallback: use UTC slice if no timezone (as stored DB value is UTC)
        return date.toISOString().slice(0, 16);
    } catch (e) {
        console.error('Date format error', e);
        return 'ERROR';
    }
};

const dateStr = "2026-03-18T20:25:00.000Z"; // 1:25 PM PDT
const timezone = "America/Los_Angeles";

console.log('Result:', formatDateForInput(dateStr, timezone));
