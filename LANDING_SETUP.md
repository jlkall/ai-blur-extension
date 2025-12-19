# Landing Page Setup Instructions

## Quick Setup (Using EmailJS - Recommended)

1. Go to https://www.emailjs.com/ and create a free account
2. Create a new service (Gmail, Outlook, etc.)
3. Create an email template with:
   - Subject: `CloseAI - New Interest Submission`
   - Body: `New interest submission from: {{email}}`
4. Get your Public Key, Service ID, and Template ID
5. Update `landing.html` with your EmailJS credentials in the script section

## Alternative: Using Formspree

1. Go to https://formspree.io/ and create a free account
2. Create a new form
3. Update the form action URL in `landing.html` (line ~240)
4. Formspree will send emails to your registered email address

## Alternative: Simple Mailto (Works Immediately)

If you want it to work immediately without setup, you can use the mailto version below.

## Deploy

Once set up, the landing page will be available at:
- `https://jlkall.github.io/ai-blur-extension/landing.html`

Perfect for sharing on Instagram stories!

