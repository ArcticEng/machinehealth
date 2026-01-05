# Data Collection Spreadsheet Templates

Copy these tables into Excel or Google Sheets for your testing.

---

## Template 1: Sensor Calibration Log

| Date | Time | Device Model | Test Type | Expected Value | Measured Value | Error % | Pass/Fail | Notes |
|------|------|--------------|-----------|----------------|----------------|---------|-----------|-------|
| | | | Static X | 0 m/s² | | | | |
| | | | Static Y | 0 m/s² | | | | |
| | | | Static Z | 9.81 m/s² | | | | |
| | | | Repeatability Trial 1 | | | | | |
| | | | Repeatability Trial 2 | | | | | |
| | | | Repeatability Trial 3 | | | | | |

---

## Template 2: Machine Baseline Record

### Machine Information
| Field | Value |
|-------|-------|
| Machine Name | |
| Machine ID | |
| Type | |
| Manufacturer | |
| Model | |
| Serial Number | |
| RPM (Rated) | |
| Power (HP/kW) | |
| Location | |
| Last Maintenance | |
| Measurement Point ID | |

### Baseline Readings

| Date | Time | RPM | Load % | Temp °C | RMS X (g) | RMS Y (g) | RMS Z (g) | Peak X | Peak Y | Peak Z | Crest X | Crest Y | Crest Z | Kurt X | Kurt Y | Kurt Z | Notes |
|------|------|-----|--------|---------|-----------|-----------|-----------|--------|--------|--------|---------|---------|---------|--------|--------|--------|-------|
| | | | | | | | | | | | | | | | | | |
| | | | | | | | | | | | | | | | | | |
| | | | | | | | | | | | | | | | | | |

### Baseline Summary (Average of 3+ readings)
| Metric | X-Axis | Y-Axis | Z-Axis |
|--------|--------|--------|--------|
| RMS (g) | | | |
| Peak (g) | | | |
| Crest Factor | | | |
| Kurtosis | | | |

---

## Template 3: Fault Injection Test Log

### Test Information
| Field | Value |
|-------|-------|
| Test ID | |
| Test Date | |
| Machine Used | |
| Fault Type | [ ] Imbalance [ ] Misalignment [ ] Bearing [ ] Looseness [ ] Belt |
| Fault Severity | [ ] Mild [ ] Moderate [ ] Severe |
| Fault Description | |
| Tester Name | |

### Baseline (Before Fault)
| RMS X | RMS Y | RMS Z | Crest X | Crest Y | Crest Z | Kurtosis X | Kurtosis Y | Kurtosis Z |
|-------|-------|-------|---------|---------|---------|------------|------------|------------|
| | | | | | | | | |

### With Fault Induced
| RMS X | RMS Y | RMS Z | Crest X | Crest Y | Crest Z | Kurtosis X | Kurtosis Y | Kurtosis Z |
|-------|-------|-------|---------|---------|---------|------------|------------|------------|
| | | | | | | | | |

### Change Analysis
| Metric | Baseline | With Fault | % Change | Significant? |
|--------|----------|------------|----------|--------------|
| RMS X | | | | Y/N |
| RMS Y | | | | Y/N |
| RMS Z | | | | Y/N |
| Crest Factor X | | | | Y/N |
| Crest Factor Y | | | | Y/N |
| Crest Factor Z | | | | Y/N |

### AI Analysis Results
| Field | Value |
|-------|-------|
| AI Severity Rating | |
| AI Diagnosis | |
| AI Confidence Score | |
| Matches Actual Fault? | [ ] Yes [ ] No [ ] Partial |
| AI Recommendations | |

---

## Template 4: Trending Log

### Machine: _________________ | Measurement Point: _________________

| Date | Time | RMS X | RMS Y | RMS Z | Crest X | Crest Y | Crest Z | Notes/Observations | Action Taken |
|------|------|-------|-------|-------|---------|---------|---------|-------------------|--------------|
| | | | | | | | | | |
| | | | | | | | | | |
| | | | | | | | | | |
| | | | | | | | | | |
| | | | | | | | | | |
| | | | | | | | | | |
| | | | | | | | | | |
| | | | | | | | | | |
| | | | | | | | | | |
| | | | | | | | | | |

### Alert Thresholds for This Machine
| Metric | Warning Level | Critical Level |
|--------|---------------|----------------|
| RMS X | | |
| RMS Y | | |
| RMS Z | | |
| Crest Factor | | |

---

## Template 5: Comparison Test (App vs Reference)

| Test ID | Date | Machine | Measurement Point | App RMS (g) | Reference RMS (g) | Difference | Error % | App Crest | Ref Crest | Notes |
|---------|------|---------|-------------------|-------------|-------------------|------------|---------|-----------|-----------|-------|
| | | | | | | | | | | |
| | | | | | | | | | | |
| | | | | | | | | | | |

### Summary Statistics
| Metric | Value |
|--------|-------|
| Total Comparisons | |
| Average Error % | |
| Max Error % | |
| Min Error % | |
| Within ±10%? | |

---

## Template 6: User Feedback Survey

### Participant Information
| Field | Value |
|-------|-------|
| Name (Optional) | |
| Role | |
| Years of Experience | |
| Date | |

### Usability Ratings (1-5, where 5 is best)
| Question | Rating | Comments |
|----------|--------|----------|
| How easy was the app to set up? | | |
| How easy was recording a sample? | | |
| How clear are the displayed metrics? | | |
| How useful is the comparison feature? | | |
| How useful is the AI analysis? | | |
| How helpful are the recommendations? | | |
| Overall satisfaction | | |

### Open Questions
| Question | Response |
|----------|----------|
| What did you like most? | |
| What did you like least? | |
| What features are missing? | |
| What would you change? | |
| Would you use this regularly? Why/why not? | |
| Would you recommend to colleagues? | |

---

## Template 7: Test Results Summary

### Overall Test Results
| Test Phase | Pass | Fail | Pass Rate | Notes |
|------------|------|------|-----------|-------|
| Sensor Calibration | | | | |
| Repeatability | | | | |
| Imbalance Detection | | | | |
| Misalignment Detection | | | | |
| Bearing Detection | | | | |
| Looseness Detection | | | | |
| Accuracy vs Reference | | | | |
| AI Diagnosis Accuracy | | | | |
| User Acceptance | | | | |

### Key Findings
1. 
2. 
3. 

### Recommendations
1. 
2. 
3. 

### Final Assessment
| Criteria | Target | Achieved | Status |
|----------|--------|----------|--------|
| Repeatability CV | < 5% | | ✅/❌ |
| Accuracy | ±10% | | ✅/❌ |
| Fault Detection | > 80% | | ✅/❌ |
| False Positive Rate | < 15% | | ✅/❌ |
| False Negative Rate | < 5% | | ✅/❌ |
| User Satisfaction | > 4/5 | | ✅/❌ |

---

## How to Use These Templates

1. **Copy to spreadsheet software** (Excel, Google Sheets)
2. **Customize thresholds** for your specific equipment
3. **Add conditional formatting** for pass/fail highlighting
4. **Create charts** from trending data
5. **Archive completed forms** for audit trail

### Suggested File Naming Convention
```
YYYYMMDD_MachineName_TestType_TesterInitials.xlsx

Examples:
20241226_Pump01_Baseline_JS.xlsx
20241226_Motor03_ImbalanceTest_JS.xlsx
20241226_Fan02_Trending_Weekly.xlsx
```
