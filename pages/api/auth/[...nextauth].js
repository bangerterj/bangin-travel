import NextAuth from "next-auth";
import EmailProvider from "next-auth/providers/email";
import CredentialsProvider from "next-auth/providers/credentials";
import PostgresAdapter from "@auth/pg-adapter";
import { Pool } from "pg";
import { createTransport } from "nodemailer";
import bcrypt from "bcryptjs";
import db from "../../../lib/db";

const pool = new Pool({
    connectionString: process.env.POSTGRES_URL,
    ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

export const authOptions = {
    adapter: PostgresAdapter(pool),
    session: {
        strategy: "jwt",
        maxAge: 30 * 24 * 60 * 60, // 30 days
    },
    secret: process.env.NEXTAUTH_SECRET,
    providers: [
        CredentialsProvider({
            name: "Password",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                try {
                    console.log("[AUTH] Authorize attempt for:", credentials?.email);
                    if (!credentials?.email || !credentials?.password) return null;

                    const user = await db.users.getByEmail(credentials.email);
                    console.log("[AUTH] User found in DB:", !!user);

                    if (!user || !user.password_hash) {
                        return null;
                    }

                    const isValid = await bcrypt.compare(credentials.password, user.password_hash);
                    console.log("[AUTH] Password valid:", isValid);

                    if (!isValid) {
                        return null;
                    }

                    // For JWT strategy, the user object returned from authorize 
                    // is passed to the jwt callback the first time.
                    // We include hasPassword so we don't have to query DB again.
                    return {
                        id: user.id,
                        email: user.email,
                        name: user.name,
                        hasPassword: true
                    };
                } catch (error) {
                    console.error("[AUTH ERROR] Authorize failed:", error);
                    throw error;
                }
            }
        }),
        EmailProvider({
            server: {
                host: "smtp.resend.com",
                port: 465,
                auth: {
                    user: "resend",
                    pass: process.env.RESEND_API_KEY,
                },
            },
            from: process.env.EMAIL_FROM || "TRIPT.IO <onboarding@resend.dev>",
            sendVerificationRequest: async ({ identifier: email, url, provider }) => {
                try {
                    console.log("[AUTH] Sending verification email to:", email);
                    console.log("[AUTH] Verification URL:", url);
                    const transport = createTransport(provider.server);
                    const result = await transport.sendMail({
                        to: email,
                        from: provider.from,
                        subject: "🚐 Sign in to TRIPT.IO",
                        text: `Sign in to TRIPT.IO\n\nClick the link below to sign in:\n${url}\n\nIf you didn't request this email, you can safely ignore it.`,
                        html: `
                            <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
                                <h1 style="color: #333; font-size: 24px;">🚐 TRIPT.IO</h1>
                                <p style="color: #666; font-size: 16px; line-height: 1.5;">
                                    Click the button below to sign in to your account.
                                </p>
                                <a href="${url}" style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">
                                    Sign In
                                </a>
                                <p style="color: #999; font-size: 14px;">
                                    If you didn't request this email, you can safely ignore it.
                                </p>
                            </div>
                        `,
                    });
                    console.log("[AUTH] Email sent result:", result.accepted, "rejected:", result.rejected);
                    const failed = result.rejected.concat(result.pending).filter(Boolean);
                    if (failed.length) {
                        throw new Error(`Email(s) (${failed.join(", ")}) could not be sent`);
                    }
                } catch (error) {
                    console.error("[AUTH ERROR] Failed to send email:", error);
                    throw error; // Re-throw so NextAuth knows it failed
                }
            },
        }),
    ],
    pages: {
        signIn: "/auth/signin",
        signOut: "/auth/signout",
        verifyRequest: "/auth/verify-request",
    },
    callbacks: {
        async jwt({ token, user, trigger, session }) {
            try {
                if (user) {
                    console.log("[AUTH] JWT callback - user logging in:", user.email);
                    token.id = user.id;
                    token.hasPassword = user.hasPassword;
                }
                // Fetch latest name from DB to ensure sync
                if (token.id) {
                    const freshUser = await db.users.getById(token.id);
                    if (freshUser) {
                        token.name = freshUser.name;
                    }
                }

                // Allow manual updates to the token (e.g. after setting password or name)
                if (trigger === "update") {
                    if (session?.hasPassword !== undefined) {
                        token.hasPassword = session.hasPassword;
                    }
                }
                return token;
            } catch (error) {
                console.error("[AUTH ERROR] JWT callback failed:", error);
                throw error;
            }
        },
        async session({ session, token }) {
            try {
                if (session?.user && token) {
                    session.user.id = token.id;
                    session.user.hasPassword = token.hasPassword;
                }
                return session;
            } catch (error) {
                console.error("[AUTH ERROR] Session callback failed:", error);
                throw error;
            }
        },
        async signIn({ user, account, email }) {
            try {
                console.log("[AUTH] SignIn callback - user:", user?.email);
                return true;
            } catch (error) {
                console.error("[AUTH ERROR] SignIn callback failed:", error);
                throw error;
            }
        },
    },
    events: {
        async signIn({ user, isNewUser }) {
            console.log("[AUTH EVENT] signIn - user:", user?.email, "isNewUser:", isNewUser);
        },
        async signOut({ token }) {
            console.log("[AUTH EVENT] signOut");
        },
        async createUser({ user }) {
            console.log("[AUTH EVENT] createUser - email:", user?.email);
        },
        async linkAccount({ user, account }) {
            console.log("[AUTH EVENT] linkAccount - user:", user?.email);
        },
    },
    logger: {
        error(code, metadata) {
            console.error("[AUTH ERROR]", code, metadata);
        },
        warn(code) {
            console.warn("[AUTH WARN]", code);
        },
        debug(code, metadata) {
            console.log("[AUTH DEBUG]", code, metadata);
        },
    },
    debug: true,
};

export default NextAuth(authOptions);

