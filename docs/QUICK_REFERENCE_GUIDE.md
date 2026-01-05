# Quick Reference: Vibration Metrics Interpretation

## Understanding Your Readings

### RMS (Root Mean Square) - Overall Vibration Level
| RMS Value (g) | Approx. Velocity (mm/s) | Status | Action |
|---------------|-------------------------|--------|--------|
| < 0.05 | < 0.5 | 🟢 Excellent | Normal operation |
| 0.05 - 0.15 | 0.5 - 1.5 | 🟢 Good | Monitor normally |
| 0.15 - 0.3 | 1.5 - 3.0 | 🟡 Acceptable | Watch for trends |
| 0.3 - 0.5 | 3.0 - 5.0 | 🟠 Warning | Schedule inspection |
| 0.5 - 1.0 | 5.0 - 10.0 | 🔴 Alert | Investigate soon |
| > 1.0 | > 10.0 | ⛔ Critical | Immediate action |

*Note: These are general guidelines. Establish your own baselines for each machine.*

---

### Crest Factor - Indicates Impulsive Events
| Crest Factor | Meaning | Possible Cause |
|--------------|---------|----------------|
| 2.0 - 3.5 | Normal | Healthy machine |
| 3.5 - 4.5 | Elevated | Early bearing wear, minor impacts |
| 4.5 - 6.0 | High | Bearing defect developing, looseness |
| > 6.0 | Very High | Significant bearing damage, severe impacts |

**Key insight:** High Crest Factor with low RMS = Early-stage bearing defect

---

### Kurtosis - Signal "Peakiness"
| Kurtosis | Meaning | Typical Cause |
|----------|---------|---------------|
| ~3.0 | Normal (Gaussian) | Healthy operation |
| 3.0 - 4.0 | Slightly peaked | Minor issues |
| 4.0 - 6.0 | Peaked | Bearing wear, impacts |
| > 6.0 | Highly peaked | Severe damage, metal-to-metal contact |

---

### Skewness - Signal Asymmetry
| Skewness | Meaning |
|----------|---------|
| ~0 | Symmetric vibration (normal) |
| Positive | More high peaks than low |
| Negative | More low peaks than high |
| |Skewness| > 1 | Investigate asymmetric loading |

---

## Common Fault Signatures

### 🔄 Imbalance
- **RMS:** Increases at 1X RPM
- **Crest Factor:** Normal
- **Pattern:** Smooth, sinusoidal
- **Axis:** Radial (horizontal/vertical) dominant
- **Check:** Rotating components for missing/added mass

### ↔️ Misalignment  
- **RMS:** Increases at 1X and 2X RPM
- **Crest Factor:** Normal to slightly elevated
- **Pattern:** 2X component prominent
- **Axis:** Axial vibration high
- **Check:** Coupling alignment, soft foot

### 🔵 Bearing Defect (Early Stage)
- **RMS:** May be normal initially
- **Crest Factor:** INCREASES first (key indicator!)
- **Kurtosis:** Increases
- **Pattern:** Impulsive hits
- **Check:** Listen for grinding/clicking sounds

### 🔵 Bearing Defect (Late Stage)
- **RMS:** Elevated
- **Crest Factor:** May decrease (masking)
- **Pattern:** Broadband noise increase
- **Check:** Immediate replacement needed

### 🔩 Looseness
- **RMS:** Elevated with harmonics
- **Crest Factor:** High
- **Pattern:** Multiple harmonics (1X, 2X, 3X...)
- **Possible:** 0.5X subharmonic
- **Check:** Foundation bolts, bearing housings

### ⚡ Electrical Issues (Motors)
- **RMS:** Elevated at 2X line frequency (100/120 Hz)
- **Pattern:** Disappears instantly when power off
- **Check:** Rotor bars, stator issues, power quality

---

## Decision Matrix

```
                    RMS Normal          RMS Elevated
                ┌─────────────────┬─────────────────┐
Crest Factor    │                 │                 │
Normal          │  ✅ HEALTHY     │  ⚠️ IMBALANCE   │
                │  Continue       │  or MISALIGNMENT│
                │  monitoring     │  Schedule check │
                ├─────────────────┼─────────────────┤
Crest Factor    │                 │                 │
High            │ 🔶 EARLY        │  🔴 SEVERE      │
                │ BEARING ISSUE   │  PROBLEM        │
                │ Plan inspection │  Act NOW        │
                └─────────────────┴─────────────────┘
```

---

## Trending Guidelines

### How Often to Sample
| Equipment Criticality | Recommended Frequency |
|----------------------|----------------------|
| Critical (production stops if fails) | Daily to Weekly |
| Important (backup available) | Weekly to Monthly |
| Non-critical | Monthly to Quarterly |

### What to Watch For
1. **Sudden spike** - Investigate immediately
2. **Gradual increase > 25%** - Plan maintenance
3. **Change after maintenance** - Verify repair quality
4. **Seasonal patterns** - Normal for some equipment

---

## Baseline Best Practices

### When to Record Baseline
✅ After new installation
✅ After major maintenance/overhaul
✅ After bearing replacement
✅ When machine is "running well"

### How to Get Good Baseline
1. Machine at normal operating temperature
2. Normal load conditions
3. Same measurement location every time
4. Record at least 60 seconds
5. Take 3+ samples on different days
6. Average them for baseline

---

## Red Flags - Act Immediately If:

🚨 **RMS doubles from baseline**
🚨 **Crest Factor exceeds 6**
🚨 **Unusual noise or smell**
🚨 **Temperature spike on bearing**
🚨 **Visible vibration (can see it moving)**
🚨 **Oil analysis shows metal particles**

---

## Converting Units

### Acceleration to Velocity
```
Velocity (mm/s) ≈ Acceleration (g) × 9810 / (2π × freq)

At 50 Hz (3000 RPM):
1g ≈ 31 mm/s

At 25 Hz (1500 RPM):
1g ≈ 62 mm/s
```

### Acceleration Units
```
1 g = 9.81 m/s² = 386 in/s²
1 m/s² = 0.102 g
```

---

## Phone Accelerometer Tips

### For Best Results:
1. **Mount rigidly** - No hand-holding
2. **Same location** - Mark with paint pen
3. **Same orientation** - Camera up, consistent
4. **Warm machine** - 15+ min running
5. **Steady state** - No startup/shutdown

### Limitations to Know:
- Max frequency typically 50-100 Hz
- Won't detect high-speed bearing defects
- Less sensitive than professional tools
- Best for trending and screening
