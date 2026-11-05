# DDRiVE-M auth email templates

Branded templates for Supabase Auth. Generated from `scripts/make-email-templates.py` (edit that file, run
`python3 scripts/make-email-templates.py`, commit the HTML). Built for email clients: tables, inline styles,
a button made of table cells, inbox preview text, and the circular DDRiVE-M logo.

| Supabase template | File | Subject |
| --- | --- | --- |
| Confirm sign up | `confirmation.html` | Confirm your email to start using DDRiVE-M |
| Invite user | `invite.html` | You’re invited to join DDRiVE-M |
| Magic link or OTP | `magic_link.html` | Your DDRiVE-M sign-in link |
| Change email address | `email_change.html` | Confirm your new DDRiVE-M email address |
| Reset password | `recovery.html` | Reset your DDRiVE-M password |
| Reauthentication | `reauthentication.html` | `{{ .Token }}` is your DDRiVE-M verification code |

Variables used: `{{ .ConfirmationURL }}`, `{{ .Token }}`, `{{ .Email }}`, `{{ .NewEmail }}`, `{{ .SiteURL }}`, and
`{{ .Data.full_name }}` (the name given at sign-up; the greeting falls back to "Hello,").

## Install

- **Dashboard:** Authentication → Email Templates. For each template, set the subject from the table and paste the file.
- **Script:** `SUPABASE_ACCESS_TOKEN=sbp_... node scripts/push-email-templates.mjs` (uses the Management API).

Links in the footer use `{{ .SiteURL }}`: set **Authentication → URL Configuration → Site URL** to
`https://ddrive-m.asilvainnovations.com`. The reset email leads to `/reset-password`; add
`https://ddrive-m.asilvainnovations.com/**` to **Redirect URLs**.

Supabase’s built-in email sender is for testing (low hourly limit). For real users, set up custom SMTP
(Authentication → Emails → SMTP settings), sending from an `asilvainnovations.com` address with SPF and DKIM.
