import { useSession, signIn } from "next-auth/react";
import { useRouter } from "next/router";
import { useState } from "react";

export default function InvitePage() {
    const router = useRouter();
    const { token } = router.query;
    const { data: session, status } = useSession();
    const [isJoining, setIsJoining] = useState(false);
    const [error, setError] = useState("");

    const handleJoin = async () => {
        setIsJoining(true);
        setError("");
        try {
            const res = await fetch(`/api/invites/${token}/accept`, {
                method: "POST",
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to join");

            // Redirect to trip
            router.push(`/trips/${data.tripId}`);
        } catch (err) {
            setError(err.message);
            setIsJoining(false);
        }
    };

    if (status === "loading") return <div className="p-8">Loading...</div>;

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="max-w-md w-full p-8 bg-white rounded-lg shadow-md text-center">
                <h1 className="text-2xl font-bold mb-4">You've been invited!</h1>

                {error && (
                    <div className="mb-4 p-3 bg-red-100 text-red-700 rounded text-sm">
                        {error}
                    </div>
                )}

                {!session ? (
                    <div>
                        <p className="mb-6 text-gray-600">Please sign in to accept this invitation.</p>
                        <button
                            onClick={() => signIn()}
                            className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition"
                        >
                            Sign In / Sign Up
                        </button>
                    </div>
                ) : (
                    <div>
                        <p className="mb-6 text-gray-600">
                            Logged in as <strong>{session.user.email}</strong>
                        </p>
                        <button
                            onClick={handleJoin}
                            disabled={isJoining}
                            className="w-full bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700 transition disabled:opacity-50"
                        >
                            {isJoining ? "Joining..." : "Accept Invitation"}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
