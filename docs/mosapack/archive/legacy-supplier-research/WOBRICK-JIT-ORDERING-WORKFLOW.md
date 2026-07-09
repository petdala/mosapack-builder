# WoBrick Just-in-Time (JIT) Ordering Workflow

## Executive Summary

**Product:** Custom brick mosaics ordered on-demand from WoBrick
**Model:** Customer pays first → You order exact bricks → WoBrick ships → You fulfill
**Investment:** $0 (customer-funded, zero inventory)
**Margin:** 58% ($55.50 profit per 800-brick order)
**Fulfillment Time:** 12-17 days total (10-15 days WoBrick + 2 days your shipping)

---

## Product: WoBrick Individual Brick Ordering

**Key Discovery:** WoBrick allows ordering as little as **1 individual brick** at $0.04/piece with **NO minimum order quantity**.

**Source:** https://wobrick.com/product/brick-1-x-1-3005-30071-35382/

### Pricing
- **Cost per brick:** $0.04 USD
- **Colors available:** 60+ colors (solid + transparent)
- **Minimum order:** 1 brick (no MOQ)
- **Bulk discounts:** Available at higher quantities

### Ordering Options
- **By piece:** Order exact quantity needed
- **By weight (1kg):** Bulk ordering option

### Lead Time
- **Manufacturing + Shipping:** 10-15 business days
- **Note:** "Due to warehouse capacity issues, some parts are out of stock. If you're willing to wait, please email our customer service...Restocking will take 10-15 business days."

### Product Details
- **Part ID:** GDS-531 (1x1 brick example)
- **Type:** LEGO-compatible foundation bricks
- **Availability:** Stock varies by color

---

## JIT Workflow: Step-by-Step

### Step 1: Customer Designs Mosaic

**Platform:** MosaPack Builder (your website)

**Process:**
1. Customer uploads photo or chooses design
2. Builder converts to brick mosaic using WoBrick 24 palette
3. Builder calculates exact brick count by color
4. Customer sees live preview and bill of materials (BOM)

**Example Output:**
```
Design: Pet Portrait (Golden Retriever)
Total bricks: 800
Colors needed:
- Tan: 220 bricks
- Brown: 180 bricks
- Black: 120 bricks
- White: 100 bricks
- Dark Gray: 80 bricks
- Light Gray: 60 bricks
- Pink (nose): 40 bricks
```

---

### Step 2: Customer Adds to Cart & Pays

**Pricing Model:** $0.12 per brick

**Cart Calculation:**
```
800 bricks × $0.12 = $96.00

Includes:
- All bricks needed for design
- Assembly instructions (PDF)
- Baseplate (optional +$8.99)
- Shipping: $8.50 (USPS Priority Mail)

TOTAL: $96.00 (or $113.49 with baseplate)
```

**Payment Processing:**
- Customer pays via Stripe/PayPal
- Payment received immediately
- Order status: "Processing - Bricks being ordered"

**Important:** Customer pays BEFORE you order from WoBrick = zero financial risk

---

### Step 3: You Order from WoBrick

**Timing:** Within 24 hours of customer payment

**Process:**
1. Export BOM from MosaPack Builder
2. Visit WoBrick product pages for each color
3. Add exact quantities to cart:
   - Tan 1x1 brick: 220 pieces
   - Brown 1x1 brick: 180 pieces
   - Black 1x1 brick: 120 pieces
   - etc.
4. Checkout and pay

**Cost Calculation:**
```
800 bricks × $0.04 = $32.00
WoBrick shipping to you: Included or minimal
TOTAL COST: ~$32.00
```

**Order Confirmation:**
- WoBrick sends confirmation email
- Note estimated delivery: 10-15 business days
- Update customer: "Your bricks are being manufactured!"

---

### Step 4: WoBrick Manufactures & Ships (10-15 days)

**What Happens:**
- WoBrick manufactures your exact order
- Quality control check
- Packages bricks by color (usually bagged)
- Ships to your address

**Tracking:**
- WoBrick provides tracking number
- Monitor delivery status
- Update customer if delays occur

**Customer Communication:**
```
Email template:
Subject: Your [Design Name] Mosaic is Being Made!

Hi [Customer Name],

Great news! Your custom brick mosaic is being manufactured by our supplier.

Current status: Bricks in production
Estimated arrival to you: [Date + 12-17 days from order]

We'll update you when your kit ships!

- MosaPack Team
```

---

### Step 5: Receive Bricks from WoBrick

**Upon Delivery:**
1. Inspect shipment for accuracy
   - Count bricks by color (verify against BOM)
   - Check for damaged/missing pieces
   - Verify colors match order
2. Report any issues to WoBrick immediately
3. Store bricks temporarily until packaging

**Quality Check:**
- [ ] All colors received
- [ ] Correct quantities
- [ ] No damaged bricks
- [ ] Colors match palette

---

### Step 6: Package for Customer

**What to Include:**
1. **Sorted bricks** - Organize by color in small bags (Ziploc or craft bags)
2. **Assembly instructions** - Printed PDF with:
   - Brick-by-brick layout grid
   - Color key
   - Assembly tips
   - Baseplate placement guide (if included)
3. **Baseplate** - If customer ordered (+$8.99)
4. **Branded packaging** - MosaPack sticker/insert (optional)
5. **Thank you note** - Personal touch

**Packaging Materials Needed:**
- Small plastic bags (2"x3" or 3"x4") for color sorting
- Sturdy shipping box or padded envelope
- Bubble wrap or packing paper
- Assembly instructions (printed)
- Shipping label

**Packaging Cost:** ~$2-3 per kit
- Bags: $0.50
- Box: $1.00
- Bubble wrap: $0.50
- Printing: $0.50
- Label: Included in shipping

---

### Step 7: Ship to Customer

**Shipping Method:** USPS Priority Mail (2-3 days)

**Cost:** $8.50 (800-brick kit weight ~1.5 lbs)

**Process:**
1. Print shipping label (already paid by customer)
2. Affix to package
3. Drop at USPS or schedule pickup
4. Update customer with tracking

**Customer Notification:**
```
Email template:
Subject: Your [Design Name] Mosaic Has Shipped! 🎨

Hi [Customer Name],

Your custom brick mosaic is on its way!

Tracking: [USPS Tracking Number]
Estimated delivery: [Date in 2-3 days]

Inside your kit:
✓ 800 bricks sorted by color
✓ Full-color assembly instructions
✓ [Baseplate (if ordered)]

Can't wait to see what you create!

- MosaPack Team
```

---

## Economics Breakdown

### Per-Order Profit (800-brick example)

| Item | Amount | Notes |
|------|--------|-------|
| **REVENUE** | | |
| Bricks (800 × $0.12) | $96.00 | Customer pays |
| Baseplate (optional) | $8.99 | If selected |
| **Total Revenue** | **$96.00** | (Without baseplate) |
| | | |
| **COSTS** | | |
| Bricks from WoBrick (800 × $0.04) | $32.00 | Your cost |
| Packaging materials | $2.50 | Bags, box, bubble wrap |
| Shipping to customer (USPS) | $8.50 | Included in price |
| Stripe/PayPal fees (3%) | $2.88 | Payment processing |
| Labor (your time, ~30 min) | $0 | Not counted initially |
| **Total Costs** | **$45.88** | |
| | | |
| **PROFIT** | **$50.12** | **52% margin** |

**Note:** If customer adds baseplate (+$8.99), profit increases by ~$5 (baseplate costs you ~$4 wholesale)

---

## Scaling Considerations

### Time Investment Per Order
- BOM export & WoBrick ordering: 10 minutes
- Receiving/QC check: 5 minutes
- Sorting & packaging: 15 minutes
- Shipping label & drop-off: 5 minutes
- **Total: ~35 minutes per order**

### Volume Thresholds

**1-10 orders/month:**
- Time: ~6 hours/month
- Profit: $500-600
- Status: Manageable solo

**10-30 orders/month:**
- Time: ~18 hours/month
- Profit: $1,500-1,800
- Status: Consider helper or efficiency improvements

**30+ orders/month:**
- Time: 30+ hours/month
- Profit: $1,800+
- Status: **Pivot to Base Kit Model** (stocking 600-brick kits for faster fulfillment)

---

## Automation Opportunities

### Phase 1 (Manual, Month 1-3)
- Manually export BOM from Builder
- Manually order from WoBrick website
- Manually sort and package

### Phase 2 (Semi-Automated, Month 4-6)
- **WoBrick API integration** (if available)
  - Auto-generate WoBrick cart from BOM
  - One-click ordering
- Pre-printed bag labels by color
- Standardized packaging checklist

### Phase 3 (Fully Automated, Month 7+)
- API direct integration: Builder → WoBrick (auto-order on customer payment)
- Auto-email customer with status updates
- Bulk ordering optimization (batch multiple orders if colors overlap)

---

## Risk Mitigation

### What if WoBrick is out of stock?
- **Backup suppliers:** Webrick, MyBricks (similar pricing)
- **Alternative palette:** Offer color substitution with customer approval
- **Refund option:** Full refund if customer doesn't want substitution

### What if bricks arrive late?
- **Set expectations:** Advertise 14-21 day fulfillment (under-promise)
- **Communication:** Update customer weekly
- **Compensation:** Offer discount code for future order if severely delayed

### What if bricks are damaged/missing?
- **QC check:** Inspect all shipments before packaging
- **WoBrick support:** Contact for replacements (usually fast)
- **Keep buffer:** Order 5-10% extra bricks for replacements

### What if customer wants refund?
- **Before WoBrick order:** Full refund (no cost to you)
- **After WoBrick order:** Partial refund minus brick cost ($32) + 20% restocking fee
- **After shipping:** No refund (custom product), offer replacement only

---

## Customer FAQs

**Q: How long until I receive my mosaic?**
A: 14-17 business days from order. We manufacture each brick kit custom for you!

**Q: Can I rush my order?**
A: Unfortunately, manufacturing time is fixed at 10-15 days. We ship via Priority Mail (2-3 days) once complete.

**Q: What if I'm missing bricks?**
A: We QC every kit! If anything is missing, email us and we'll ship replacements within 3-5 days at no charge.

**Q: Are the bricks LEGO compatible?**
A: Yes! Our bricks are 100% compatible with LEGO and other major brands.

**Q: Can I order extra bricks in specific colors?**
A: Absolutely! Use our "Custom Color Pack" option to add any quantity of any color.

---

## When to Pivot to Base Kit Model

**Indicators it's time to stock inventory:**

✅ Selling 30+ JIT orders/month consistently
✅ Spending >15 hours/month on packaging
✅ Customers requesting faster shipping
✅ High repeat customer rate (>20%)
✅ Profitable enough to invest $1,200-2,200

**Base Kit Advantages:**
- Ship same-day or next-day (vs 14-17 days)
- Less labor per order (pre-packaged)
- Higher perceived value (professional packaging)
- Repeat customers need only color packs (cheaper)

**How to Transition:**
1. Analyze 3 months of JIT orders
2. Identify top 12 most-used colors
3. Design 600-brick base kit with those colors
4. Order 50-100 base kits from WoBrick Custom MOC service
5. Keep JIT option for custom colors/rare requests

---

## Tools & Resources

### Required Tools
- [ ] MosaPack Builder (your platform)
- [ ] Stripe/PayPal account
- [ ] WoBrick account (sign up at wobrick.com)
- [ ] USPS account for shipping labels
- [ ] Small plastic bags (bulk order from Amazon)
- [ ] Shipping boxes or padded mailers
- [ ] Printer for instructions & labels

### Helpful Resources
- WoBrick product catalog: wobrick.com/shop
- USPS shipping calculator: usps.com/ship
- Packaging supplies: uline.com or Amazon
- Label printer: DYMO or Rollo (optional but saves time)

---

## Launch Checklist

### Pre-Launch (Week 1)
- [ ] Set up Stripe payment processing
- [ ] Create WoBrick account
- [ ] Order packaging supplies (bags, boxes, bubble wrap)
- [ ] Design assembly instruction template
- [ ] Test full workflow with 1 sample order (use your own money)

### Week 1-2
- [ ] Launch Builder with JIT brick option
- [ ] Process first 3-5 real customer orders
- [ ] Refine workflow based on experience
- [ ] Time yourself to verify profit margins

### Week 3-4
- [ ] Automate repetitive tasks (email templates, labels)
- [ ] Gather customer feedback
- [ ] Optimize packaging process
- [ ] Document any issues and solutions

---

## Success Metrics

### Month 1-2 Goals
- 10-15 JIT orders processed
- <40 minutes per order (time efficiency)
- 5-star customer reviews (quality)
- $500-750 profit (financial validation)

### Month 3-4 Goals
- 30+ JIT orders/month
- <30 minutes per order
- Consider pivot to Base Kit if demand strong
- $1,500+ profit/month

---

## Conclusion

**JIT Brick Ordering = Perfect Zero-Inventory Launch Strategy**

**Advantages:**
✅ $0 upfront investment
✅ Customer-funded (zero financial risk)
✅ 52% profit margin
✅ Access to 60+ brick colors
✅ Test demand before committing to inventory

**Trade-offs:**
❌ Slower fulfillment (14-17 days)
❌ Labor per order (~35 min)
❌ Not scalable beyond 50 orders/month

**Perfect for:**
- Launch phase (Month 1-4)
- Validating demand
- Testing pricing
- Building customer base
- Custom/rare color requests even after scaling

**Next Evolution:**
- Month 5-6: Transition to Base Kit Model ($1,200 investment)
- Keep JIT for custom orders outside base kit colors
- Best of both worlds: Fast fulfillment + full color range
