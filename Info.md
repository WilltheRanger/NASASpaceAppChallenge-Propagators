https://www.spaceappschallenge.org/resources/ <----- data for the nasa app challenge. If there is any other nasa data that we missed and can be used please tell the user. 
Use NASA information to build something people can explore use or learn from

Create a document answering these questions:
- What exact problem are we addressing?
- Why is the problem important?
- Why are existing satellite records insufficient?
- Which NASA datasets are we using?
- What is scientifically new about our approach?
- How do we know our results are reliable?
- Who benefits from this project?
- What can our application demonstrate that a static NASA fire map cannot?

Prepare the NASA data correctly
Your repository should contain more than raw hotspot coordinates.

I would prioritize these data sources:
Dataset	What your team needs it for
NASA FIRMS	Main source for MODIS and VIIRS active-fire observations
VIIRS Fire Data	VIIRS detection attributes and sensor characteristics
NASA FIRMS data overview	Understanding product resolution and coverage
VIIRS algorithm guide	Understanding how detections are generated

One important scientific detail:
- MODIS active-fire products have approximately 1 km spatial resolution.
- VIIRS 375 m active-fire detections have finer spatial resolution.
- VIIRS can detect smaller fires more effectively in many circumstances.
These differences are not just technical details. They're central to the challenge.

Record the official source URL for every dataset.
[ ] Record the satellite and sensor for every observation.
[ ] Preserve original acquisition date and UTC time.
[ ] Preserve latitude and longitude.
[ ] Preserve confidence and fire radiative power (FRP), where available.
[ ] Record product version and processing status.
[ ] Document missing values and data-quality limitations.
[ ] Document the units of every numerical field.
[ ] Keep raw and processed data separate.
[ ] Include a reproducible data download and cleaning process.
[ ] Check licensing, attribution and NASA citation requirements.
[ ] Create a small sample dataset for development and testing.

3. Prepare an AI knowledge base, not just an AI dataset
This is particularly important for your project.

Your AI needs to understand the difference between scientific facts, raw observations, assumptions and conclusions.

I would prepare these six files:
File	Contents
scientific-glossary.md	MODIS, VIIRS, FRP, hotspots, confidence, overpass
sensor-differences.md	Resolution, sensitivity, observation differences
data-dictionary.md	Every column, unit, definition and data type
data-limitations.md	Missing data, false positives, uncertainties
analysis-methodology.md	How measurements and comparisons are calculated
evaluation-cases.md	Examples where AI outputs can be checked against known facts

Do not let your AI assume:
- One hotspot equals one fire.
- More detected hotspots always mean more severe fires.
- No detected hotspots means no burning.
- MODIS and VIIRS hotspot counts are directly interchangeable.
- Every hotspot represents a wildfire.
These assumptions could undermine your scientific credibility.

For example, NASA FIRMS explicitly documents thermal anomalies including volcanoes and gas flares, not just vegetation fires. VIIRS also provides confidence and inferred hotspot-type attributes for relevant products.

This is where your team can distinguish itself.

Don't just build an AI model and hope its results are correct. Prepare experiments that demonstrate whether your analysis is scientifically credible.

I recommend preparing these four experiments:

Experiment A — Sensor comparison
- Compare MODIS and VIIRS observations in the same geographical region.
- Examine their detection counts.
- Examine their confidence values.
- Compare their fire radiative power.
- Investigate why their observations differ.
Experiment B — Historical consistency
- Examine historical burning activity.
- Identify periods with available observations from both sensors.
- Separate sensor coverage differences from actual changes in detected activity.
Experiment C — Unusual activity
- Establish what normal burning activity looks like for a particular region and season.
- Identify periods that differ substantially from the historical baseline.
- Document how unusual activity is measured.
Experiment D — Data reliability
- Investigate missing observations.
- Investigate duplicate or nearby detections.
- Examine low-confidence observations.
- Determine how these affect the conclusions.
A particularly important point: VIIRS S-NPP observations begin in January 2012, according to NASA FIRMS. This gives you an overlapping period for comparing the instruments. Earlier historical periods need separate treatment. 
NASA FIRMS+1

Preffered structure:

nasa-fire-project/
│
├── README.md
│
├── research/
│   ├── challenge-understanding.md
│   ├── problem-statements.md
│   ├── modis-explanation.md
│   ├── viirs-explanation.md
│   ├── sensor-comparison.md
│   ├── scientific-limitations.md
│   └── research-sources.md
│
├── data/
│   ├── raw/
│   ├── processed/
│   ├── sample/
│   └── metadata/
│
├── ai/
│   ├── system-instructions.md
│   ├── data-dictionary.md
│   ├── scientific-context.md
│   ├── anomaly-definitions.md
│   └── evaluation-cases.md
│
├── analysis/
│   ├── exploratory-analysis/
│   ├── sensor-comparison/
│   └── validation/
│
├── frontend/
│
├── backend/
│
├── docs/
│   ├── architecture.md
│   ├── feature-priorities.md
│   └── demo-script.md
│
└── requirements.txt

I would prepare these five screens:

1. Global Fire Overview

Global hotspot distribution, selected date range, sensor filters and geographic navigation.


2. Burning Activity Calendar

Month-by-month and year-by-year burning activity for a selected region.

3. Sensor Comparison

MODIS versus VIIRS observations, differences and confidence.

4. Anomaly Explorer

Unusual periods, historical baselines and explanations.

5. AI Research Assistant

Natural-language questions about selected regions, observations and historical patterns.


These are the major problems your team should understand before writing a single line of code.
Problem 1: Incompatible satellite measurements
Major scientific problem
MODIS and VIIRS do not observe Earth in exactly the same way.

Their:
- Spatial resolutions differ.
- Sensor characteristics differ.
- Detection sensitivities differ.
- Observation conditions and coverage differ.
Consequently, the same fire event may produce different observations depending on which instrument detects it.

The big question: How can scientists compare two different satellite records without misleading themselves?
Problem 2: Inconsistent historical fire records
Major historical problem
NASA has accumulated more than 20 years of fire observations.

However, the records are split across different sensors.

This creates problems when someone wants to understand:
- How burning activity has changed over decades.
- Whether a particular region is experiencing more fires.
- Whether burning seasons are shifting.
- Whether a region has experienced unusually intense burning.
The historical record does not provide one consistent picture.

The big question: Can we reliably understand long-term global burning patterns when the underlying records are inconsistent?
Problem 3: Agricultural burning versus wildfires
Major interpretation problem
Not every hotspot represents a dangerous wildfire.

Some hotspots come from agricultural burning, which may be intentional.

Others come from uncontrolled wildfires.

Both can be detected by satellite instruments.

This creates an important interpretation problem:
- Is the observed burning associated with agriculture?
- Is it an uncontrolled wildfire?
- Is it another type of thermal event?
- How confidently can the event be classified?
Misinterpreting burning activity can lead to incorrect conclusions.

The big question: How do we understand what kind of burning is happening instead of treating every hotspot as the same event?
Problem 4: Missing or inconsistent spatial coverage
Major geographic problem
Satellite observations are not necessarily continuous.

A region's observations can be affected by:
- Satellite observation schedules.
- Cloud cover.
- Atmospheric conditions.
- Sensor limitations.
- Data gaps.
- Differences in observation frequency.
This means a map with fewer detected hotspots does not automatically mean there was less burning.

The big question: How can researchers distinguish genuinely low burning activity from incomplete observations?
Problem 5: Inconsistent fire-season patterns
Major climate and temporal problem
Burning activity changes throughout the year.

Different regions have different burning seasons.

For example:
- Some regions experience increased burning during dry seasons.
- Agricultural burning can occur during specific periods.
- Other areas experience seasonal wildfire activity.
Historical satellite records may make it difficult to compare these patterns consistently.

The big question: How can we understand when burning normally occurs in a particular region and whether those patterns are changing?
Problem 6: Identifying unusual burning activity
Major early-warning problem
Imagine a region normally experiences relatively low burning activity during a particular month.

Suddenly, satellite observations show a significant increase.

That could be an important warning sign.

However, identifying unusual activity requires reliable historical comparisons.

If the satellite datasets are inconsistent, the apparent increase might be caused by differences between instruments rather than an actual change in burning.

The big question: How can we identify genuinely unusual burning activity without confusing sensor differences with real-world changes?
Problem 7: Delayed understanding during critical periods
Major emergency-management problem
Fire managers and emergency responders need to understand when and where burning activity is occurring.

Without a consistent historical picture, they may struggle to:
- Recognize critical periods.
- Understand regional fire patterns.
- Compare current conditions with historical activity.
- Prioritize monitoring efforts.
- Interpret unusual burning conditions.
The challenge specifically identifies early warning and emergency response as important applications.

The big question: What happens when the people responsible for managing fire risk cannot obtain a reliable picture of historical and current burning activity?

5. The most important thing your team must understand
There is a difference between these three things:
1. Fire detection: Where did satellites detect active hotspots?
2. Fire activity understanding: How is burning distributed across geography and time?
3. Fire intelligence: What does the observed activity mean for scientists, land managers and emergency responders?
NASA's challenge is primarily about moving from fragmented satellite detections toward consistent understanding of burning activity.

It is not asking you to solve every wildfire problem on Earth.

Before designing your project, make sure you can answer these questions:
1. Why do MODIS and VIIRS detect different numbers of hotspots in the same region?
2. How much do their spatial resolutions and detection characteristics differ?
3. How can agricultural burns be distinguished from wildfires?
4. How much historical satellite observation data is missing or incomplete?
5. How do we know whether an increase in hotspots is real or caused by sensor differences?
6. What makes burning activity unusual for a particular geographical area and time of year?
7. What information do emergency responders and land managers actually lack?
