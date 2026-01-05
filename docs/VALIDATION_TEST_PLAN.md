# Vibration Monitoring Tool - Validation Test Plan

## Executive Summary
This document outlines the testing procedures to validate that the vibration monitoring application delivers real, actionable value for preventative maintenance in industrial settings.

---

## 1. TEST OBJECTIVES

### Primary Goals
1. **Validate sensor accuracy** - Ensure accelerometer readings are accurate and consistent
2. **Verify fault detection capability** - Confirm the tool can detect common mechanical faults
3. **Assess user value** - Determine if the tool provides actionable insights for maintenance decisions
4. **Benchmark against known standards** - Compare readings with ISO 10816 vibration severity standards

### Success Criteria
- [ ] RMS values correlate within ±10% of reference equipment
- [ ] Tool correctly identifies 80%+ of induced faults
- [ ] Users can make correct maintenance decisions based on tool output
- [ ] False positive rate < 15%
- [ ] False negative rate < 5% (critical - missing real faults)

---

## 2. TEST EQUIPMENT REQUIRED

### Reference Equipment
| Item | Purpose | Specification |
|------|---------|---------------|
| Calibrated vibration meter | Reference measurements | ISO 10816 compliant, 0.1-1000 Hz |
| Vibration calibrator | Sensor validation | 10mm/s @ 159.2 Hz reference |
| Tachometer | RPM verification | ±0.1 RPM accuracy |
| Temperature sensor | Environmental logging | ±1°C accuracy |

### Test Machines (Recommended)
1. **Electric Motor** (3-phase, 1-10 HP) - Common industrial workhorse
2. **Belt-driven Fan** - Tests belt/pulley issues
3. **Centrifugal Pump** - Tests bearing/cavitation detection
4. **Gearbox** - Tests gear mesh frequency detection

### Mobile Devices for Testing
- iPhone 12 or newer (iOS accelerometer)
- Samsung Galaxy S21 or newer (Android accelerometer)
- Mounting bracket/holder for consistent positioning

---

## 3. TEST PHASES

### Phase 1: Sensor Validation (Week 1)

#### Test 1.1: Static Calibration Check
**Objective:** Verify phone accelerometer accuracy at rest

**Procedure:**
1. Place phone on flat, level surface
2. Record 30 seconds of data
3. Expected: Z-axis ≈ 9.81 m/s² (±0.2), X/Y ≈ 0 (±0.1)

**Data Collection:**
```
| Trial | X (m/s²) | Y (m/s²) | Z (m/s²) | Expected Z | Error % |
|-------|----------|----------|----------|------------|---------|
| 1     |          |          |          | 9.81       |         |
| 2     |          |          |          | 9.81       |         |
| 3     |          |          |          | 9.81       |         |
```

#### Test 1.2: Dynamic Calibration (if calibrator available)
**Objective:** Verify accuracy against known vibration source

**Procedure:**
1. Attach phone to vibration calibrator
2. Set calibrator to 10 mm/s @ 159.2 Hz
3. Record 30 seconds
4. Compare RMS velocity to reference

#### Test 1.3: Repeatability Test
**Objective:** Ensure consistent readings

**Procedure:**
1. Mount phone on running motor
2. Record 5 consecutive 30-second samples
3. Calculate coefficient of variation (CV) for RMS values
4. Accept if CV < 5%

---

### Phase 2: Baseline Establishment (Week 2)

#### Test 2.1: Healthy Machine Baseline
**Objective:** Establish "good" vibration signatures for each test machine

**Procedure for EACH machine:**
1. Ensure machine is in known-good condition
2. Record operating parameters:
   - RPM
   - Load condition (no load, 50%, 100%)
   - Temperature
   - Time since last maintenance
3. Mount phone at consistent location (mark with paint pen)
4. Record minimum 60 seconds at each load condition
5. Repeat 3 times on different days

**Data Collection Template:**
```
Machine: _________________
Date: ____________________
RPM: ______ | Load: ______% | Temp: ______°C

| Axis | RMS (g) | Peak (g) | Crest Factor | Notes |
|------|---------|----------|--------------|-------|
| X    |         |          |              |       |
| Y    |         |          |              |       |
| Z    |         |          |              |       |

Observations: _________________________________
```

#### Test 2.2: ISO 10816 Classification
**Objective:** Classify baseline readings per ISO standards

**ISO 10816-3 Vibration Severity (mm/s RMS):**
| Class | Good | Acceptable | Unsatisfactory | Unacceptable |
|-------|------|------------|----------------|--------------|
| I (Small machines) | < 0.71 | 0.71-1.8 | 1.8-4.5 | > 4.5 |
| II (Medium machines) | < 1.12 | 1.12-2.8 | 2.8-7.1 | > 7.1 |
| III (Large rigid) | < 1.8 | 1.8-4.5 | 4.5-11.2 | > 11.2 |
| IV (Large flexible) | < 2.8 | 2.8-7.1 | 7.1-18 | > 18 |

**Convert app readings:** Velocity (mm/s) = Acceleration (g) × 9.81 × 1000 / (2π × frequency)

---

### Phase 3: Fault Injection Tests (Weeks 3-4)

#### Test 3.1: Imbalance Detection
**Objective:** Verify detection of rotating imbalance

**Procedure:**
1. Attach known mass to rotating component (fan blade, coupling)
2. Suggested: 5g, 10g, 20g weights at known radius
3. Record vibration at each imbalance level
4. Compare to baseline

**Expected Results:**
- 1X RPM vibration amplitude increases proportionally
- App should show elevated RMS values
- Crest factor should remain relatively stable

**Data Collection:**
```
| Imbalance (g×mm) | RMS X | RMS Y | RMS Z | % Change from Baseline |
|------------------|-------|-------|-------|------------------------|
| 0 (baseline)     |       |       |       | 0%                     |
| 50               |       |       |       |                        |
| 100              |       |       |       |                        |
| 200              |       |       |       |                        |
```

#### Test 3.2: Misalignment Detection
**Objective:** Verify detection of shaft misalignment

**Procedure:**
1. Intentionally misalign motor-pump or motor-fan coupling
2. Angular misalignment: Insert shim under motor feet
3. Parallel misalignment: Offset motor laterally
4. Record vibration at mild, moderate, severe levels

**Expected Results:**
- 1X and 2X RPM vibration increases
- Axial vibration (typically Z-axis) increases significantly
- App should show change in vibration pattern

#### Test 3.3: Bearing Defect Detection
**Objective:** Verify detection of bearing wear

**Option A - Natural Wear Test (Long-term):**
1. Monitor machine weekly over 3-6 months
2. Track RMS and Crest Factor trends
3. Correlate with actual bearing condition at replacement

**Option B - Defective Bearing Test (Accelerated):**
1. Install bearing with known defect (available from test equipment suppliers)
2. Or carefully create small defect on outer race
3. Record vibration and compare to healthy baseline

**Expected Results:**
- Crest Factor increases (impulsive hits)
- Kurtosis increases (peakiness)
- High-frequency content increases
- RMS may not change significantly in early stages

#### Test 3.4: Looseness Detection
**Objective:** Verify detection of mechanical looseness

**Procedure:**
1. Slightly loosen mounting bolts on motor or bearing housing
2. Record vibration
3. Tighten and record again

**Expected Results:**
- Multiple harmonics of 1X RPM
- Subharmonics (0.5X) may appear
- Erratic vibration pattern
- Higher Crest Factor

#### Test 3.5: Belt Problems (for belt-driven equipment)
**Objective:** Verify detection of belt issues

**Procedure:**
1. Test with worn belt vs new belt
2. Test with loose tension vs proper tension
3. Test with misaligned pulleys

**Expected Results:**
- Belt frequency vibration (typically 2-4X belt RPM)
- Slapping or irregular pattern for loose belt

---

### Phase 4: Comparative Analysis (Week 5)

#### Test 4.1: Side-by-Side Comparison
**Objective:** Compare app readings to professional equipment

**Procedure:**
1. Take simultaneous readings with:
   - This app
   - Professional vibration analyzer
   - Another vibration app (if available)
2. Record at identical measurement points
3. Use mounting bracket to ensure identical positioning

**Data Collection:**
```
| Measurement Point | App RMS | Reference RMS | Error % | Notes |
|-------------------|---------|---------------|---------|-------|
| Motor DE Bearing  |         |               |         |       |
| Motor NDE Bearing |         |               |         |       |
| Fan Bearing       |         |               |         |       |
```

#### Test 4.2: AI Analysis Validation
**Objective:** Validate AI recommendations are accurate

**Procedure:**
1. Present known fault conditions to the AI analysis
2. Record AI diagnosis and recommendations
3. Compare to actual known fault

**Data Collection:**
```
| Test Condition | AI Diagnosis | Confidence | Correct? | Notes |
|----------------|--------------|------------|----------|-------|
| Imbalance      |              |            | Y/N      |       |
| Misalignment   |              |            | Y/N      |       |
| Bearing Defect |              |            | Y/N      |       |
| Looseness      |              |            | Y/N      |       |
```

---

### Phase 5: User Acceptance Testing (Week 6)

#### Test 5.1: Maintenance Technician Evaluation
**Objective:** Validate real-world usability and value

**Procedure:**
1. Recruit 3-5 maintenance technicians
2. Brief them on app usage (15 min training)
3. Have them use app on real equipment
4. Collect feedback via survey

**Survey Questions:**
```
1. How easy was the app to use? (1-5)
2. How clear were the metrics displayed? (1-5)
3. How useful was the AI analysis? (1-5)
4. Would this help you make maintenance decisions? (1-5)
5. What features are missing?
6. What would you change?
7. Would you use this tool regularly? (Y/N)
```

#### Test 5.2: Blind Fault Detection Test
**Objective:** Can users identify issues using only app data?

**Procedure:**
1. Set up machines with hidden faults (technicians don't know which)
2. Have technicians use app to assess each machine
3. Record their diagnoses
4. Compare to actual conditions

---

## 4. DATA COLLECTION PROTOCOLS

### Measurement Location Standards
Always measure at same locations for consistency:
- **DE (Drive End):** Horizontal, Vertical, Axial
- **NDE (Non-Drive End):** Horizontal, Vertical, Axial
- Mark measurement points with paint pen

### Phone Mounting Protocol
1. Use rigid mount (not handheld) for consistent results
2. Mount options:
   - Magnetic phone holder on metal surface
   - 3D printed bracket with strap
   - Rubber band to flat surface (least preferred)
3. Ensure phone is firmly attached with no movement
4. Consistent orientation (camera up, USB port toward axial direction)

### Recording Protocol
1. Let machine reach operating temperature (minimum 15 min)
2. Record for minimum 30 seconds (60 seconds preferred)
3. Avoid recording during transient conditions (startup/shutdown)
4. Note any abnormal sounds, smells, or observations
5. Record environmental conditions (temp, humidity)

### Data Management
```
Folder Structure:
/TestData
  /Phase1_Calibration
  /Phase2_Baselines
    /Motor_1
    /Pump_1
    /Fan_1
  /Phase3_FaultTests
    /Imbalance
    /Misalignment
    /Bearing
  /Phase4_Comparison
  /Phase5_UserTesting
```

---

## 5. SUCCESS METRICS & ACCEPTANCE CRITERIA

### Quantitative Metrics
| Metric | Target | Minimum Acceptable |
|--------|--------|-------------------|
| Measurement repeatability (CV) | < 3% | < 5% |
| Accuracy vs reference | ±5% | ±10% |
| Fault detection rate | > 90% | > 80% |
| False positive rate | < 10% | < 15% |
| False negative rate | < 2% | < 5% |

### Qualitative Metrics
| Metric | Target |
|--------|--------|
| User satisfaction score | > 4.0/5.0 |
| "Would use regularly" | > 80% yes |
| Training time to competency | < 30 minutes |

---

## 6. KNOWN LIMITATIONS

### Phone Accelerometer Limitations
1. **Frequency Range:** Most phones: 0-100 Hz (some up to 200 Hz)
   - Adequate for: Imbalance, misalignment, looseness, low-speed bearing faults
   - May miss: High-frequency bearing defects (> 1000 Hz), gear mesh frequencies

2. **Sensitivity:** Consumer accelerometers less sensitive than industrial
   - May not detect very small vibration changes
   - Better for detecting moderate to severe issues

3. **Sampling Rate:** Typically 100-400 Hz
   - Limits detection of high-frequency components
   - Nyquist limit means max detectable frequency = sample_rate / 2

4. **Mounting:** Without rigid mounting, readings will be inconsistent

### Recommended Use Cases
✅ **Good for:**
- Trending vibration levels over time
- Detecting significant changes from baseline
- Screening for obvious problems
- Basic condition monitoring where no other tools available

⚠️ **Use with caution:**
- Precise diagnosis of fault type
- High-frequency defect detection
- Critical equipment where failure cost is very high

❌ **Not recommended as sole tool for:**
- Safety-critical equipment
- High-speed machinery (> 6000 RPM)
- Situations requiring precise spectrum analysis

---

## 7. TEST SCHEDULE

| Week | Phase | Activities |
|------|-------|------------|
| 1 | Sensor Validation | Static/dynamic calibration, repeatability |
| 2 | Baseline | Establish baselines for all test machines |
| 3 | Fault Injection | Imbalance, misalignment tests |
| 4 | Fault Injection | Bearing, looseness, belt tests |
| 5 | Comparison | Reference equipment comparison |
| 6 | User Testing | Technician evaluation, blind tests |
| 7 | Analysis | Compile results, generate report |

---

## 8. DELIVERABLES

1. **Calibration Report** - Sensor accuracy validation results
2. **Baseline Database** - Healthy machine signatures
3. **Fault Detection Report** - Detection rates by fault type
4. **Accuracy Report** - Comparison with reference equipment
5. **User Feedback Report** - Survey results and recommendations
6. **Final Validation Report** - Overall assessment and recommendations

---

## 9. QUICK START: MINIMUM VIABLE TEST

If resources are limited, prioritize these tests:

### Day 1: Basic Validation
1. Static calibration check (Test 1.1)
2. Repeatability on one machine (Test 1.3)

### Day 2-3: Baseline + Simple Fault
1. Record baseline on one motor (Test 2.1)
2. Add known imbalance weight (Test 3.1)
3. Verify app shows increased vibration

### Day 4: Comparison
1. Compare one reading to reference meter (Test 4.1)
2. Calculate error percentage

### Day 5: User Test
1. One technician uses app on 3 machines
2. Collect feedback

**Minimum success criteria for MVP:**
- Repeatability CV < 10%
- Detects 2X imbalance weight as significant change
- Within 20% of reference meter
- User rates usability > 3/5

---

## 10. APPENDIX

### A. ISO 10816 Reference Chart
[Include full severity chart]

### B. Fault Frequency Calculations
- Imbalance: 1X RPM
- Misalignment: 1X, 2X RPM (axial high)
- Bearing BPFO: (N/2) × RPM × (1 - Bd/Pd × cos(θ))
- Bearing BPFI: (N/2) × RPM × (1 + Bd/Pd × cos(θ))
- Belt: RPM × (π × pulley_diameter) / belt_length

### C. Sample Data Forms
[Printable data collection sheets]

### D. Troubleshooting
- If readings seem wrong, check mounting
- If no data, check sensor permissions
- If high noise, move away from other vibrating equipment

---

**Document Version:** 1.0
**Created:** December 2024
**Author:** Vibration Monitoring App Development Team
