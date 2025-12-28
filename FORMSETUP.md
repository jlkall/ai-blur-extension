# Quick Form Setup (2 minutes)

## Step 1: Create Formspree Account
1. Go to https://formspree.io/
2. Click "Sign Up" (free account)
3. Sign up with your email: **jkallungal22@gmail.com**

## Step 2: Create a Form
1. After signing in, click **"New Form"**
2. Name it "CloseAI Landing"
3. Copy the **Form ID** (looks like: `xpnwqjdk` or `abc123xyz`)

## Step 3: Update the Landing Page
1. Open `docs/landing-simple.html`
2. Find this line (around line 260):
   ```javascript
   const response = await fetch('https://formspree.io/f/YOUR_FORM_ID', {
   ```
3. Replace `YOUR_FORM_ID` with your actual Formspree Form ID
4. Save and commit:
   ```bash
   git add docs/landing-simple.html
   git commit -m "Add Formspree form ID"
   git push origin main
   ```

## Step 4: Test It
1. Wait 2-3 minutes for GitHub Pages to update
2. Visit: https://jlkall.github.io/ai-blur-extension/landing-simple.html
3. Submit a test email
4. Check your email: **jkallungal22@gmail.com**

That's it! Now every submission will automatically email you without opening the user's email app.



