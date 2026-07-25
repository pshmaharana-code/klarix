# KLARIX ANALYSER — COMPLETE TECHNICAL SPECIFICATION
## Page 2: Core Product — The AI Analysis Engine
### Version 1.0 | Built for Antigravity / Any AI Coding Tool

---

## CRITICAL RULE — READ THIS FIRST

**The analyser must NEVER show output unless the AI agents have actually run and returned real data.**

- No placeholder text
- No static mock output
- No hardcoded strings that look like analysis
- If the API call fails → show an error message, NOT fake results
- If no file is uploaded → the Analyse button still works (text-only analysis)
- If the API key is missing → show a clear error: "API key not configured"

The output panel must be completely empty until a real API response arrives.

---

## WHAT THIS PAGE DOES — ONE PARAGRAPH

A user uploads a video reel, image, or carousel. They paste their Instagram/LinkedIn
analytics numbers. They write 2 lines about their brand. They click "Analyse My Content."
Three AI agents run in sequence — one watches the video and reads the numbers, one
builds a strategy, one writes a script. The results appear card by card as each agent
finishes. Everything the user sees in the output came from a live AI API call, not from
any hardcoded text.

---

## THE THREE AI AGENTS — WHAT EACH ONE DOES

### AGENT 1 — VISUAL ANALYST
**Trigger:** Runs first, immediately after the user clicks Analyse
**What it receives:**
- The uploaded video or image (as base64 or file URI)
- Extracted transcript from the video (if video uploaded)
- All analytics numbers the user typed in
- The user's brand context description
- Content type (reel/carousel/static) and platform (instagram/linkedin)

**What it does:**
- If a video is uploaded: watches it frame by frame using Gemini's multimodal capability
- Reads the transcript and cross-references it with the retention data
- Interprets every analytics metric in the context of THIS specific content
- Does NOT give advice — only diagnoses what happened and why

**What it returns (strict JSON):**
```json
{
  "hook_strength": "description of what happens in first 3 seconds",
  "retention_drop_point": "timestamp or percentage where viewers left",
  "retention_drop_reason": "specific reason why they left at that point",
  "visual_quality": "lighting, framing, text overlays, production notes",
  "transcript_quality": "clarity, pacing, vocabulary, energy level",
  "cta_strength": "how strong and timely the call to action was",
  "metric_interpretation": {
    "views": "what this view count means for this content",
    "watch_time": "what this watch time means specifically",
    "saves": "what this save count means for this content",
    "shares": "what this share count means",
    "comments": "what this comment count means"
  },
  "content_type_fit": "is reel/carousel/static the right format for this message",
  "what_worked": ["specific thing 1", "specific thing 2", "specific thing 3"],
  "what_failed": ["specific thing 1", "specific thing 2", "specific thing 3"],
  "overall_diagnosis": "3-4 sentence paragraph explaining what happened"
}
```

---

### AGENT 2 — STRATEGIST
**Trigger:** Runs immediately after Agent 1 returns its JSON
**What it receives:**
- The complete JSON output from Agent 1
- The user's brand context
- Content type and platform
- **TRENDING CONTENT CONTEXT** (see Trend Research section below)

**What it does:**
- Reads Agent 1's diagnosis
- Researches what content is currently trending for this creator's niche
- Compares the creator's content against trending patterns in their space
- Identifies the single highest-leverage next move
- Does NOT generate a list of tips — gives ONE clear strategic direction

**What it returns (strict JSON):**
```json
{
  "primary_bottleneck": "the single biggest thing holding growth back",
  "priority_fix": "the one change with most impact",
  "next_content_type": "reel OR carousel OR static",
  "next_content_angle": "the specific topic/angle for next post",
  "hook_direction": "what the opening 3 seconds should do or show",
  "format_recommendation": "length, pacing, structure advice",
  "trend_insight": "what is currently performing well in this creator's niche",
  "competitor_gap": "what similar creators are NOT doing that this creator should",
  "best_time_to_post": "day and time recommendation",
  "estimated_impact": "realistic improvement to expect",
  "strategic_reasoning": "2-3 sentence explanation of why this is the right move"
}
```

---

### AGENT 3 — SCRIPTWRITER
**Trigger:** Runs immediately after Agent 2 returns its JSON
**What it receives:**
- The complete JSON output from Agent 2 (strategy)
- The original transcript from the uploaded video (to match the creator's voice)
- The user's brand context

**What it does:**
- Writes a complete, ready-to-record video script
- Matches the creator's natural speaking style extracted from their transcript
- Fixes every weakness Agent 1 identified
- Follows the strategy Agent 2 recommended
- Includes B-roll suggestions and text overlay timing

**What it returns (strict JSON):**
```json
{
  "hook": "exact words for first 3 seconds",
  "body": "full middle section with natural paragraph breaks",
  "cta": "exact closing line",
  "text_overlays": [
    "0:00 — overlay text here",
    "0:08 — overlay text here",
    "0:18 — overlay text here"
  ],
  "b_roll_suggestions": [
    "specific shot description 1",
    "specific shot description 2",
    "specific shot description 3"
  ],
  "delivery_notes": "tone, energy, and pacing notes for recording",
  "estimated_length": "estimated seconds when spoken naturally"
}
```

---

## THE TREND RESEARCH FEATURE (NEW — ADD TO V1)

### What it is
Before Agent 2 runs its strategy, the system should perform a web search
to find what content is currently trending in the creator's specific niche.

### How it works
1. User describes their brand: "I'm a data science student building AI tools for founders"
2. System extracts the niche keywords: ["AI tools", "founders", "startup content", "tech creators"]
3. System performs a web search for: "trending Instagram reels [niche] 2025" and
   "top performing LinkedIn content [niche] July 2025"
4. The search results are summarised and passed to Agent 2 as context
5. Agent 2 uses this to compare the user's content against what's currently working

### Implementation using Gemini with Google Search grounding
```javascript
// In agentStrategist.js — before calling the strategy agent
// Use Gemini's built-in Google Search tool to find trending content

const trendResearchPrompt = `
Search for: "best performing ${niche} content on Instagram and LinkedIn in 2025"
Also search for: "trending ${niche} creator content formats July 2025"

Summarise in 3-4 sentences:
- What content formats are performing best in this niche right now
- What topics/angles are getting the most engagement
- What are top creators in this space doing that others aren't
`
```

### Fallback if search fails
If web search is not available, Agent 2 uses its training knowledge about
current platform trends. This is acceptable — trend research is an enhancement,
not a blocker. Never show fake trend data.

---

## THE COMPLETE USER FLOW — STEP BY STEP

```
1. User lands on /analyse page
   → Output panel is EMPTY. No text. No cards. Nothing.

2. User uploads a video or image (optional but recommended)
   → File preview appears in the upload zone
   → File is read into memory as base64

3. User fills in analytics numbers (optional except platform/content type)

4. User writes brand context (optional but improves output quality)

5. User clicks "Analyse My Content →"
   → Button changes to disabled state: "Analysing..."
   → Output panel shows loading state with progress steps

6. LOADING SEQUENCE (shown in output panel):
   Step 1: "Reading your content..." (if file uploaded)
   Step 2: "Extracting transcript..." (if video)
   Step 3: "Agent 1 running — Performance Analysis..." 
   Step 4: "Agent 2 running — Building Strategy..."
   Step 5: "Agent 3 running — Writing Your Script..."
   
   Each step shows which agent is active with a subtle animation.
   Progress bar fills as each agent completes.

7. Agent 1 finishes → "What Worked" and "What Failed" cards FADE IN
   (output panel is no longer empty — first real data appears)

8. Agent 2 finishes → "Your Next Post Strategy" card FADES IN

9. Agent 3 finishes → "Ready-to-Record Script" card FADES IN

10. All agents done → loading state disappears, all 4 cards visible
    → "Follow the build → @piyush._maharana" CTA appears at bottom

IMPORTANT: Steps 7, 8, 9 happen progressively as each agent finishes.
The user does NOT wait for all 3 agents to finish before seeing any output.
Each card appears the moment its agent returns data.
```

---

## API CONFIGURATION — EXACT IMPLEMENTATION

### Environment Variables Required
```
VITE_OPENROUTER_API_KEY=your_key_here
```
Get free key at: openrouter.ai

### Primary Model: Gemini Flash (Multimodal)
```javascript
const OPENROUTER_BASE = 'https://openrouter.ai/api/v1/chat/completions'
const PRIMARY_MODEL   = 'google/gemini-flash-1.5'
const FALLBACK_MODEL  = 'meta-llama/llama-3.3-70b-instruct:free'
```

### How to call the API (exact fetch structure)
```javascript
async function callAgent(systemPrompt, userMessage, useVision = false) {
  
  // Build the message content
  // For text-only: userMessage is a string
  // For vision: userMessage is an array with image_url + text objects
  
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${import.meta.env.VITE_OPENROUTER_API_KEY}`,
      'HTTP-Referer': 'https://klarix.ai',
      'X-Title': 'Klarix',
    },
    body: JSON.stringify({
      model: 'google/gemini-flash-1.5',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userMessage  }
      ],
      max_tokens: 2000,
      temperature: 0.4,
    })
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`API Error: ${error?.error?.message || response.status}`)
  }

  const data = await response.json()
  const rawText = data.choices[0].message.content

  // Strip markdown fences if present
  const cleaned = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  
  return JSON.parse(cleaned) // Always returns parsed JSON
}
```

### How to send a video or image to Gemini
```javascript
// For IMAGE files (JPG, PNG):
const userMessage = [
  {
    type: 'image_url',
    image_url: {
      url: `data:${file.type};base64,${base64String}`
    }
  },
  {
    type: 'text',
    text: `Analyse this content. Analytics: ${analyticsText}. Brand: ${brandContext}`
  }
]

// For VIDEO files (MP4, MOV):
// Gemini can process video the same way via base64
// For files over 20MB, use the Gemini File API separately
const userMessage = [
  {
    type: 'image_url',  // Gemini accepts video as image_url via OpenRouter
    image_url: {
      url: `data:video/mp4;base64,${base64String}`
    }
  },
  {
    type: 'text',
    text: `This is a video reel. Analyse it frame by frame. 
    Extract the transcript. Analytics: ${analyticsText}. Brand: ${brandContext}`
  }
]
```

### Converting uploaded file to base64
```javascript
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result.split(',')[1]) // Remove data:...;base64, prefix
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
```

---

## ERROR HANDLING — REQUIRED BEHAVIOUR

### If API key is missing or invalid:
```
Show in output panel:
"API key not configured. Add your OpenRouter key to the .env file."
Do NOT show any analysis output.
```

### If the API call fails (network error, rate limit, etc.):
```
Show in output panel:
"Analysis failed: [actual error message from API]"
Show a "Try Again" button that re-runs the analysis
Do NOT show any analysis output.
Do NOT show fake/cached output.
```

### If JSON parsing fails (model returned non-JSON):
```
Retry the same agent once with a stricter prompt addition:
"IMPORTANT: Return ONLY valid JSON. No explanation. No markdown. Just the JSON object."
If retry also fails → show error message
```

### If no file uploaded (text-only mode):
```
This is VALID. Run all 3 agents using only the analytics numbers
and brand context as input. Tell Agent 1 in the system prompt:
"No video or image was provided. Analyse based on the analytics
numbers and brand context only."
The analysis will be less specific but still useful.
```

---

## OUTPUT PANEL — EXACT CARD SPECIFICATIONS

### Card 1: Extracted Transcript
- **Visibility:** Only shows if a video was uploaded
- **Default state:** Collapsed (shows "Show transcript ▼" toggle)
- **Content:** The transcript text extracted from the video by Agent 1
- **Styling:** Monospace font, muted color, collapsible

### Card 2: What Worked ✓
- **Color scheme:** Green accent (#22C55E), green tinted background
- **Content source:** `diagnosis.what_worked` array from Agent 1
- **Display:** Bulleted list, each item on its own line
- **Copy button:** Copies all bullet points as plain text

### Card 3: What Failed ✗
- **Color scheme:** Red accent (#EF4444), red tinted background  
- **Content source:** `diagnosis.what_failed` array from Agent 1
- **Display:** Bulleted list + `diagnosis.overall_diagnosis` paragraph below
- **Copy button:** Copies all points + diagnosis paragraph

### Card 4: Your Next Post Strategy →
- **Color scheme:** Blue accent (#3B82F6), blue tinted background
- **Content source:** Strategy JSON from Agent 2
- **Display:** Key-value rows:
  - Priority fix: [value]
  - Content type: [value]
  - Angle: [value]
  - Hook direction: [value]
  - Trend insight: [value] ← NEW from trend research
  - Best time to post: [value]
  - Expected impact: [value]
- **Copy button:** Copies all fields as formatted text

### Card 5: Ready-to-Record Script ✎
- **Color scheme:** Purple accent (#A855F7), purple tinted background
- **Content source:** Script JSON from Agent 3
- **Display:** Clearly labeled sections:
  - HOOK · 0:00–0:03 → script text
  - BODY · 0:03–0:25 → script text  
  - CTA · 0:25–0:32 → script text
  - TEXT OVERLAYS → numbered list
  - B-ROLL SHOTS → numbered list
  - DELIVERY NOTES → paragraph
- **Copy button:** "Copy Full Script" — copies entire script as plain text

---

## STATE MANAGEMENT RULES

```javascript
// These are the ONLY valid states for the output panel:

const STATES = {
  IDLE:     'idle',      // Empty. No output shown. Initial state.
  LOADING:  'loading',   // Agents are running. Show progress only.
  PARTIAL:  'partial',   // Some agents done. Show completed cards only.
  COMPLETE: 'complete',  // All agents done. Show all 4 cards.
  ERROR:    'error',     // Something failed. Show error message only.
}

// NEVER transition from IDLE or ERROR directly to showing output cards.
// Output cards ONLY appear when real data exists in the store.
```

---

## THE SYSTEM PROMPTS — COPY THESE EXACTLY

### Agent 1 — Visual Analyst System Prompt
```
You are a senior social media performance analyst specialising in short-form video 
and visual content for founders and personal brands.

You will receive:
- The actual content (video or image) — analyse it thoroughly
- Analytics numbers (views, watch time, saves, shares, comments, etc.)
- Brand context (who the creator is and their audience)
- Content type (reel, carousel, or static post) and platform

YOUR JOB IS ONLY TO DIAGNOSE. Do not give strategic advice yet.

Analyse the content and return a JSON object with EXACTLY these keys:
hook_strength, retention_drop_point, retention_drop_reason, visual_quality,
transcript_quality, cta_strength, metric_interpretation (object with keys: 
views, watch_time, saves, shares, comments), content_type_fit, 
what_worked (array of 3-4 strings), what_failed (array of 3-4 strings),
overall_diagnosis (string).

Be SPECIFIC to this content. Do not give generic advice. Every insight must 
reference something you actually observed in the video/image or the actual 
numbers provided.

Return ONLY a valid JSON object. No preamble. No explanation. No markdown fences.
```

### Agent 2 — Strategist System Prompt
```
You are a social media growth strategist who works exclusively with founders 
and personal brands. You have access to current platform trends.

You will receive:
- A performance diagnosis from the analyst (JSON)
- Brand context
- Current trending content research in the creator's niche

YOUR JOB: Identify the single highest-leverage next move. ONE direction, not a list.

Return a JSON object with EXACTLY these keys:
primary_bottleneck, priority_fix, next_content_type (reel/carousel/static),
next_content_angle, hook_direction, format_recommendation, trend_insight,
competitor_gap, best_time_to_post, estimated_impact, strategic_reasoning.

Be SPECIFIC. "Post more consistently" is not acceptable. 
"Create a 25-second transformation reel showing result first then process" is acceptable.

Return ONLY a valid JSON object. No preamble. No markdown fences.
```

### Agent 3 — Scriptwriter System Prompt
```
You are an expert short-form video scriptwriter for founder content and personal brands.

You will receive:
- A strategic direction from the strategist (JSON)
- The creator's original transcript (to match their voice and speaking style)
- Brand context

Write a complete ready-to-record script that:
1. Has a hook that lands in under 3 seconds
2. Fits 25-35 seconds when spoken at natural pace
3. Matches the creator's exact speaking style from their transcript
4. Fixes every weakness the analyst identified
5. Has a specific, low-friction CTA (not "like and subscribe")

Return a JSON object with EXACTLY these keys:
hook, body, cta, text_overlays (array of strings with timestamps),
b_roll_suggestions (array of 3-4 strings), delivery_notes, estimated_length.

Every word of the script must sound natural when spoken aloud, not like it was 
written by an AI. Match the creator's vocabulary and sentence length.

Return ONLY a valid JSON object. No preamble. No markdown fences.
```

---

## FILE SIZE HANDLING

```
Under 5MB  → Convert to base64, send inline with the API request
5MB–20MB   → Convert to base64, send inline (Gemini handles this)
20MB–50MB  → Use Gemini File API (upload separately, get URI, pass URI to model)
Over 50MB  → Show error: "File too large. Please compress your video to under 50MB."

For the MVP (V1), supporting up to 20MB inline is sufficient.
Add File API support in V1.5.
```

---

## WHAT ANTIGRAVITY / ANY AI CODING TOOL MUST NOT DO

1. ❌ Do NOT hardcode any analysis text anywhere in the codebase
2. ❌ Do NOT show output cards on page load or before the API returns
3. ❌ Do NOT use setTimeout() or any delay to fake a "loading" state and then show static text
4. ❌ Do NOT catch API errors silently and show fake output instead
5. ❌ Do NOT call the API with an empty prompt and display whatever random text comes back
6. ❌ Do NOT use placeholder lorem ipsum text anywhere in the output panel
7. ❌ Do NOT call all three agents simultaneously — they MUST run in sequence (1 → 2 → 3)
8. ❌ Do NOT skip the JSON parsing step — all agent outputs must be parsed as JSON before display

---

## WHAT ANTIGRAVITY / ANY AI CODING TOOL MUST DO

1. ✅ Start with an empty output panel that only populates from real API data
2. ✅ Show a loading state with step labels while agents are running
3. ✅ Run agents in strict sequence: Agent 1 finishes → Agent 2 starts → Agent 2 finishes → Agent 3 starts
4. ✅ Populate each output card the moment its agent returns (not waiting for all 3)
5. ✅ Parse all API responses as JSON using try/catch with retry logic
6. ✅ Show clear error messages when the API fails
7. ✅ Send the actual uploaded file as base64 to Agent 1 for visual analysis
8. ✅ Pass Agent 1's output as input to Agent 2
9. ✅ Pass Agent 2's output AND original transcript as input to Agent 3
10. ✅ Use the environment variable VITE_OPENROUTER_API_KEY for the API key

---

## TESTING CHECKLIST

Before considering the analyser complete, verify:

- [ ] Output panel is empty on page load
- [ ] Clicking Analyse with no file and no analytics → agents still run, text-only analysis appears
- [ ] Clicking Analyse with an image → Agent 1 receives and processes the image
- [ ] Clicking Analyse with a video → Agent 1 receives and processes the video
- [ ] Each card appears one at a time as agents finish (not all at once)
- [ ] If API key is wrong → error message appears, no fake output
- [ ] If network fails → error message appears, no fake output
- [ ] Copy buttons copy actual AI-generated text, not placeholder text
- [ ] Console shows actual API calls being made (check Network tab in DevTools)
- [ ] Console shows no hardcoded analysis strings anywhere in the JS files

---

## SUMMARY FOR ANTIGRAVITY

Build the `/analyse` page with:

1. **Input panel (left):** File upload (drag/drop), analytics number fields, brand context textarea, submit button

2. **Output panel (right):** Starts EMPTY. Shows loading progress during analysis. Populates with 4 real AI-generated cards after analysis completes.

3. **3 AI agents chained in sequence** using the OpenRouter API (Gemini Flash model), each receiving the previous agent's output as its input

4. **Real file analysis** — uploaded videos and images are converted to base64 and sent to Gemini for actual visual analysis

5. **No fake data anywhere** — every word in the output panel comes from a live API call

The test is simple: open DevTools → Network tab → click Analyse.
You should see real HTTP requests going to openrouter.ai.
If you don't see those requests, the implementation is wrong.

