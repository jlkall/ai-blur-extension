# Quick Setup - Get Your Web3Forms Access Key (30 seconds)

## Step 1: Get Your Access Key
1. Go to https://web3forms.com/
2. Enter your email: **jkallungal22@gmail.com**
3. Click "Get Your Access Key"
4. Copy the access key (looks like: `a1b2c3d4-e5f6-7890-abcd-ef1234567890`)

## Step 2: Update the Landing Page
1. Open `docs/landing-simple.html`
2. Find line 248 (look for `access_key:`)
3. Replace `'a1b2c3d4-e5f6-7890-abcd-ef1234567890'` with your actual access key
4. Save and commit:
   ```bash
   git add docs/landing-simple.html landing-simple.html
   git commit -m "Add Web3Forms access key"
   git push origin main
   ```

## That's It!
Wait 2-3 minutes for GitHub Pages to update, then test it. Every submission will automatically email you at **jkallungal22@gmail.com**!

---

## Alternative: Use Formspree (if you prefer)
1. Go to https://formspree.io/ and sign up
2. Create a new form
3. Copy your Form ID
4. Replace `'https://formspree.io/f/YOUR_FORM_ID'` in the code with your actual form URL



