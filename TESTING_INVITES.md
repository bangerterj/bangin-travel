# Testing Invites Locally

## How It Works Now

When you send an invite in **development mode** (local environment), the system will:

1. ✅ Create the invitation in the database
2. 📋 **Log the invite link to your terminal/console** (where `npm run dev` is running)
3. 📧 Skip sending the actual email (unless you have `RESEND_API_KEY` configured)
4. ✅ Return the invite link in the API response

## Testing Steps

### 1. Send an Invite

1. Log in to your app at `http://localhost:3000`
2. Open a trip
3. Click "Invite" or the invite button
4. Enter an email address (can be any email, even fake ones like `test@example.com`)
5. Click "Send Invite"

### 2. Get the Invite Link

**Check your terminal** where `npm run dev` is running. You'll see output like:

```
🔗 INVITE LINK (Development Mode):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Trip: Japan 2026
Invitee: test@example.com
Link: http://localhost:3000/join/abc123xyz...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 3. Test the Invite

**Option A: Same Browser (Different Account)**
1. Log out of your current account
2. Copy the invite link from the terminal
3. Paste it into your browser
4. Sign in with a different account (or create a new one)
5. The invite should be accepted automatically

**Option B: Incognito/Private Window**
1. Open an incognito/private browser window
2. Copy the invite link from the terminal
3. Paste it into the incognito window
4. Sign in or create an account
5. The invite should be accepted

**Option C: Different Browser**
1. Open a different browser (e.g., if you're using Chrome, open Firefox)
2. Copy the invite link from the terminal
3. Paste it into the other browser
4. Sign in or create an account

## Production Setup

For production, you'll need to:

1. Set up a [Resend](https://resend.com) account (free tier available)
2. Add your `RESEND_API_KEY` to your environment variables
3. Configure `EMAIL_FROM` with your verified domain
4. Emails will be sent automatically

## Troubleshooting

**"I don't see the invite link in the terminal"**
- Make sure you're looking at the terminal where `npm run dev` is running
- Check that `NODE_ENV` is not set to `'production'`

**"The invite link doesn't work"**
- Make sure `NEXTAUTH_URL` is set correctly in your `.env` file (should be `http://localhost:3000`)
- Check that the token hasn't expired (invites expire after a certain time)

**"I want to send real emails locally"**
- Add `RESEND_API_KEY` to your `.env.local` file
- Or use a test email service like [Mailtrap](https://mailtrap.io) for development
