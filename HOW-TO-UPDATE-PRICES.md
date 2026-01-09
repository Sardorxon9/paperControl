# 💰 How to Update Prices in Commercial Proposals

## Quick Guide

To update prices, product details, or admin access, edit **ONE file**:

📄 **`api/proposal-config.js`**

---

## 🔄 Common Updates

### 1. Change Product Prices

```javascript
// In api/proposal-config.js

product1: {
  pricePerUnit: 150,  // ← Change this number (price per unit in сум)
  minBatch: 20000,    // ← Change minimum order quantity
}
```

**Example:** To increase white sugar price from 150 to 200 сум:
```javascript
pricePerUnit: 200,  // Changed from 150
```

---

### 2. Change Cliche (Клише) Price

```javascript
product1: {
  clichePricePerColor: 250000  // ← Change cliche price
}
```

**Example:** To change cliche price to 300,000 сум:
```javascript
clichePricePerColor: 300000  // Changed from 250000
```

---

### 3. Add More Admins

```javascript
adminChatIds: [
  685385466,   // Existing admin
  123456789,   // ← Add new admin chat ID here
  987654321    // ← Add another one
]
```

**How to get Chat ID:**
1. User messages the bot
2. Check Vercel logs or bot console
3. Look for `chat.id` in the logs
4. Copy that number and add it here

---

### 4. Change Company Info

```javascript
company: {
  phone: '+998 97 716 61 33',  // ← Update phone
  address: 'г. Ташкент, ...'   // ← Update address
}
```

---

### 5. Change Product Names/Descriptions

```javascript
product1: {
  name: 'Белый сахар',                    // ← Product name
  description: 'Сахар в стик-упаковке',  // ← Description
  format: 'Стик / 5 г',                  // ← Format/weight
}
```

---

## 📊 Price Calculation Examples

### Example 1: White Sugar
```javascript
pricePerUnit: 150      // 150 сум per stick
minBatch: 20000        // Minimum 20,000 sticks
```
**Calculation:**
- Batch cost = 150 × 20,000 = **3,000,000 сум**
- Cliche = 250,000 сум
- **Total = 3,250,000 сум**

### Example 2: After Price Increase
```javascript
pricePerUnit: 180      // Increased to 180 сум
minBatch: 20000        // Same quantity
```
**New calculation:**
- Batch cost = 180 × 20,000 = **3,600,000 сум**
- Cliche = 250,000 сум
- **Total = 3,850,000 сум**

---

## 🚀 Applying Changes

After editing `api/proposal-config.js`:

### Option 1: Auto-deploy (if using Vercel + GitHub)
```bash
git add api/proposal-config.js
git commit -m "Update prices"
git push
```
Vercel will automatically deploy in ~1 minute.

### Option 2: Manual deploy
1. Go to Vercel Dashboard
2. Click "Redeploy"
3. Wait for deployment to complete

---

## ✅ Verify Changes

After deployment:
1. Open Telegram bot
2. Click "📝 Создать ком.предложение"
3. Enter any company name
4. Check the generated PDF for updated prices

---

## ⚠️ Important Notes

- **All prices are in UZS (сум)**
- Changes take effect **immediately** after deployment
- Old PDFs (already sent) will **NOT** update
- Test after each change to verify

---

## 💡 Pro Tips

### Want to change prices temporarily for a specific client?
Currently not supported. The system uses the same prices for all proposals.

**Workaround:**
1. Update `proposal-config.js` with special prices
2. Generate PDF for that client
3. Revert back to original prices
4. Redeploy

### Want different pricing tiers?
**Future enhancement:** Add custom pricing input in the bot flow.

---

## 🐛 Troubleshooting

### Prices not updating in PDF?
1. **Check:** Did you save `api/proposal-config.js`?
2. **Check:** Did you commit and push changes?
3. **Check:** Is Vercel deployment successful?
4. **Solution:** Redeploy and clear browser cache

### Math looks wrong?
- The calculations are automatic
- Formula: `pricePerUnit × minBatch = batchCost`
- Check your numbers in `proposal-config.js`

---

**Questions?** Check `TELEGRAM-PROPOSAL-FEATURE.md` for detailed documentation.
