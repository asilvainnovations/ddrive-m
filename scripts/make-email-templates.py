# Builds supabase/templates/*.html from one layout. Edit here, re-run, commit the HTML.
import json, os
LOGO = "https://appimize.app/assets/apps/user_1097/images/b4e60d94a143_503_1097.png"
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "supabase", "templates")
FONT = "'Poppins','Segoe UI',Roboto,Helvetica,Arial,sans-serif"

def button(label, href="{{ .ConfirmationURL }}"):
    return f'''<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 8px;">
  <tr><td align="center" bgcolor="#f59e0b" style="border-radius:999px;background:#f59e0b;">
    <a href="{href}" target="_blank" style="display:inline-block;padding:14px 32px;font-family:{FONT};font-size:16px;font-weight:700;color:#0f172a;text-decoration:none;border-radius:999px;">{label}</a>
  </td></tr>
</table>
<p style="margin:16px 0 0;font-size:13px;line-height:20px;color:#64748b;">Button not working? Copy this link into your browser:<br>
<a href="{href}" style="color:#1d4ed8;word-break:break-all;">{href}</a></p>'''

def note(text, tone="info"):
    bg, border, color = ("#eff6ff", "#bfdbfe", "#1e3a8a") if tone == "info" else ("#fffbeb", "#fcd34d", "#78350f")
    return f'''<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 0;">
  <tr><td style="background:{bg};border:1px solid {border};border-radius:12px;padding:14px 16px;font-family:{FONT};font-size:13px;line-height:20px;color:{color};">{text}</td></tr>
</table>'''

GREETING = '<p style="margin:0 0 16px;font-size:16px;line-height:24px;color:#0f172a;">{{ if .Data.full_name }}Hi {{ .Data.full_name }},{{ else }}Hello,{{ end }}</p>'

def p(t): return f'<p style="margin:0 0 14px;font-size:16px;line-height:26px;color:#334155;">{t}</p>'

def layout(preheader, title, body):
    return f'''<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>{title}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;-webkit-text-size-adjust:100%;">
<!-- Inbox preview text -->
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#f1f5f9;">{preheader}&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f1f5f9" style="background:#f1f5f9;">
<tr><td align="center" style="padding:32px 12px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #e2e8f0;">
    <!-- Header -->
    <tr><td bgcolor="#1e3a8a" style="background:#1e3a8a;background-image:linear-gradient(135deg,#1e3a8a 0%,#0c4a6e 100%);padding:28px 32px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
        <td style="padding-right:14px;"><img src="{LOGO}" width="56" height="56" alt="" style="display:block;width:56px;height:56px;border-radius:50%;border:3px solid #fcd34d;background:#ffffff;"></td>
        <td style="font-family:{FONT};">
          <div style="font-size:24px;line-height:28px;font-weight:800;color:#ffffff;letter-spacing:.2px;">DDRiVE-M</div>
          <div style="font-size:12px;line-height:18px;color:#fcd34d;font-weight:600;">Data-Driven Risk and Vulnerability Evaluation and Management</div>
        </td>
      </tr></table>
    </td></tr>
    <!-- Body -->
    <tr><td style="padding:36px 32px 32px;font-family:{FONT};">
      <h1 style="margin:0 0 20px;font-size:26px;line-height:32px;font-weight:800;color:#1e3a8a;">{title}</h1>
      {body}
    </td></tr>
    <!-- Footer -->
    <tr><td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:22px 32px;font-family:{FONT};font-size:12px;line-height:19px;color:#64748b;">
      <p style="margin:0 0 8px;">DDRiVE-M staff will never ask for your password or verification codes.</p>
      <p style="margin:0 0 8px;">DDRiVE-M relays official warnings; it does not issue them. In an emergency, call 911 or your local DRRM office.</p>
      <p style="margin:0;">Sent by DDRiVE-M, a product of ASilva Innovations, Muntinlupa City, Philippines ·
        <a href="{{{{ .SiteURL }}}}/privacy-policy" style="color:#1d4ed8;">Privacy Policy</a> ·
        <a href="{{{{ .SiteURL }}}}/terms-of-service" style="color:#1d4ed8;">Terms</a> ·
        <a href="{{{{ .SiteURL }}}}/support" style="color:#1d4ed8;">Help</a></p>
    </td></tr>
  </table>
</td></tr>
</table>
</body>
</html>
'''

T = {}
T["confirmation"] = ("Confirm your email to start using DDRiVE-M",
  "One click and your DDRiVE-M account is ready.",
  "Confirm your email address",
  GREETING
  + p("Welcome to DDRiVE-M. Confirm that <strong>{{ .Email }}</strong> is your address to finish creating your account.")
  + p("Once you are in, you can set up your organisation or join your team, choose the provinces you watch, and see official PAGASA alerts for them as they are issued.")
  + button("Confirm my email")
  + note("This link works once and expires soon. Didn’t sign up for DDRiVE-M? Ignore this email and the account will not be activated."))

T["invite"] = ("You’re invited to join DDRiVE-M",
  "Your team uses DDRiVE-M for disaster risk reduction and resilience.",
  "You’re invited to DDRiVE-M",
  GREETING
  + p("You have been invited to DDRiVE-M, the platform your team uses for official alerts, risk registers, anticipatory action under RA 12287, and continuity plans.")
  + p("Accept the invitation to create your account. Your organisation’s administrator decides your role, so you will see what your work needs.")
  + button("Accept invitation")
  + note("This invitation works once and expires. Not expecting it? Ignore this email; no account is created unless you accept."))

T["magic_link"] = ("Your DDRiVE-M sign-in link",
  "Sign in to DDRiVE-M with one click. No password needed.",
  "Sign in to DDRiVE-M",
  GREETING
  + p("Use the button below to sign in as <strong>{{ .Email }}</strong>. No password needed.")
  + button("Sign in to DDRiVE-M")
  + note("This link works once and expires soon. Didn’t ask to sign in? Someone may have typed your address by mistake. Ignore this email; your account stays safe."))

T["email_change"] = ("Confirm your new DDRiVE-M email address",
  "One step left to change the email on your DDRiVE-M account.",
  "Confirm your new email address",
  GREETING
  + p("You asked to change the email address on your DDRiVE-M account from <strong>{{ .Email }}</strong> to <strong>{{ .NewEmail }}</strong>.")
  + p("Confirm to finish. Sign-in links and account messages will then go to the new address.")
  + button("Confirm new email address")
  + note("Didn’t ask for this? Don’t press the button. Change your password and tell your organisation’s administrator.", "warn"))

T["recovery"] = ("Reset your DDRiVE-M password",
  "Choose a new password for your DDRiVE-M account.",
  "Reset your password",
  GREETING
  + p("We received a request to reset the password for <strong>{{ .Email }}</strong>. Choose a new one with the button below.")
  + p("Pick at least 12 characters, and a password you don’t use anywhere else.")
  + button("Choose a new password")
  + note("This link works once and expires soon. Didn’t ask for this? Ignore this email; your password has not changed."))

T["reauthentication"] = ("{{ .Token }} is your DDRiVE-M verification code",
  "Enter this code in DDRiVE-M to confirm it’s you.",
  "Your verification code",
  GREETING
  + p("Enter this code in DDRiVE-M to confirm it’s you before a sensitive change, such as a new password.")
  + f'''<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0 8px;">
  <tr><td style="background:#eff6ff;border:2px dashed #1d4ed8;border-radius:14px;padding:16px 28px;font-family:'Courier New',Courier,monospace;font-size:34px;line-height:40px;font-weight:700;letter-spacing:10px;color:#1e3a8a;">{{{{ .Token }}}}</td></tr>
</table>'''
  + p('<span style="font-size:14px;color:#64748b;">The code expires soon.</span>')
  + note("Never share this code. DDRiVE-M staff will never ask for it. Didn’t try to make a change? Change your password and tell your organisation’s administrator.", "warn"))

meta = {}
for key, (subject, pre, title, body) in T.items():
    open(os.path.join(OUT, f"{key}.html"), "w").write(layout(pre, title, body))
    meta[key] = subject
open(os.path.join(OUT, "subjects.json"), "w").write(json.dumps(meta, indent=2, ensure_ascii=False) + "\n")
print("\n".join(f"{k}: {v}" for k, v in meta.items()))
