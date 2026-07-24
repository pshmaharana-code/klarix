# KLARIX V1 — COMPLETE BUILD PLAN
### AI-Powered Social Media Performance Analyser
**Brand:** Klarix | **Builder:** Piyush Maharana, IIT Madras
**Target launch:** 18 days from Day 1

---

## THE ONE-LINE PRODUCT BRIEF

> A founder uploads their Instagram reel or post, pastes their analytics,
> and Klarix tells them exactly what worked, what failed, and hands them
> a ready-to-record script for their next post — in under 15 seconds.

Every feature decision in V1 gets measured against this sentence.
If it doesn't serve this brief, it does not go in V1.

---

## WHAT V1 IS AND IS NOT

### V1 IS:
- A multimodal AI analysis tool (reads video + images + numbers)
- A 3-agent pipeline that thinks like an analyst, strategist, and scriptwriter
- A free tool anyone can use from a link in your Instagram bio
- Your public proof that Klarix works

### V1 IS NOT:
- A user account / login system
- A database storing past analyses
- An auto-posting or scheduling tool
- A paid product (yet)
- A mobile app

All of the above is V2 and beyond. Scope creep at V1 kills projects.

---

## THE FOUR PAGES

---

### PAGE 1 — Landing Page (`/`)

**Purpose:** Someone lands here from your Instagram bio.
They must understand what Klarix does in under 5 seconds
and feel compelled to click "Try It Free."

**Sections in order:**

```
┌─────────────────────────────────────────┐
│  NAVBAR                                 │
│  [Klarix logo]              [Try Free →]│
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  HERO                                   │
│                                         │
│  "Stop guessing why your               │
│   posts aren't growing."               │
│                                         │
│  Upload your content. Paste your stats. │
│  Klarix tells you exactly what          │
│  to fix — and writes your next post.   │
│                                         │
│  [ Analyse My Post Free → ]            │
│                                         │
│  [mockup of output card]               │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  PROBLEM SECTION                        │
│                                         │
│  "You post. You guess. You repeat."    │
│                                         │
│  Most founders spend hours creating     │
│  content, get confusing numbers back,   │
│  and have no idea what to change.      │
│  So they post again and repeat the     │
│  same mistakes.                         │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  HOW IT WORKS — 3 steps                │
│                                         │
│  01  Upload your reel, carousel,       │
│      or static post                    │
│                                         │
│  02  Paste your analytics              │
│      (views, watch time, saves, etc.)  │
│                                         │
│  03  Get your full analysis +          │
│      a ready-to-record script          │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  EXAMPLE OUTPUT (teaser)               │
│  Show a real-looking output card       │
│  with sample analysis                  │
│  CTA: "See the full demo →"           │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  SOCIAL PROOF                          │
│  "Used by X founders"                  │
│  (start at 0, update as users come in) │
│  + quote placeholder                   │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  FOOTER                                │
│  Built by @piyush._maharana            │
│  IIT Madras · Data Science & AI        │
│  [Instagram] [LinkedIn] [GitHub]       │
└─────────────────────────────────────────┘
```

---

### PAGE 2 — The Analyser Tool (`/analyse`) ← CORE PRODUCT

**Purpose:** This is where the magic happens.
One clean page, no clutter, three input steps, one output panel.

**Layout:** Split screen on desktop. Stacked on mobile.

```
┌──────────────────┬──────────────────────┐
│   INPUT PANEL    │   OUTPUT PANEL       │
│   (left side)    │   (right side)       │
│                  │                      │
│   Step 1         │   [empty on load]    │
│   Step 2         │                      │
│   Step 3         │   Populates after    │
│   [Analyse →]    │   analysis runs      │
└──────────────────┴──────────────────────┘
```

---

#### INPUT PANEL — Three Steps

**STEP 1 — Upload Your Content**

```
Upload Your Content
─────────────────────────────────────────
[ Drag & drop your file here ]
[ or click to browse ]

Supported formats:
  Video  → MP4, MOV (max 50MB)
  Image  → JPG, PNG (max 10MB)
  Carousel → Upload slides as images (up to 10)

[ video/image preview appears after upload ]
```

What happens on upload:
- Video: uploaded to Gemini File API, returns a file URI
- Image/carousel: base64 encoded, sent inline
- Preview shown in panel so user confirms correct file

---

**STEP 2 — Your Analytics**

```
Post Details
─────────────────────────────────────────
Content type:  [ Reel ] [ Carousel ] [ Static Post ]
Platform:      [ Instagram ] [ LinkedIn ]

Performance Numbers
─────────────────────────────────────────
Views / Impressions     [ _________ ]
Watch Time %            [ _________ ]  ← reels only
Likes                   [ _________ ]
Comments                [ _________ ]
Shares                  [ _________ ]
Saves                   [ _________ ]
Profile Visits          [ _________ ]
Followers Gained        [ _________ ]
```

Note: Watch Time % field only shows when Reel is selected.
All fields are optional except Views — AI handles missing data gracefully.

---

**STEP 3 — Your Brand Context**

```
Tell Klarix about your brand
─────────────────────────────────────────
[ Textarea — 2-3 lines ]
"e.g. I'm a data science student building
an AI tool for founders. My audience is
early-stage founders and personal brands."

This helps Klarix give you personalised
advice instead of generic tips.
```

---

**SUBMIT**

```
[ Analyse My Content → ]

By clicking, you agree to our terms.
Your content is not stored or shared.
```

---

#### OUTPUT PANEL — After Analysis

Output populates in 4 cards, appearing one by one as agents finish:

```
┌─────────────────────────────────────────┐
│  TRANSCRIPT                            │
│  (extracted automatically from video)  │
│  [collapsible — closed by default]     │
│                                         │
│  00:00 "I'm going to show you..."      │
│  00:04 "The biggest mistake founders..." │
│  ...                                   │
│  [ Show full transcript ↓ ]            │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  ✓ WHAT WORKED                         │  ← green accent
│                                         │
│  • Your hook created pattern interrupt  │
│  • Strong visual contrast at 0:02      │
│  • Save rate (8.2%) is above average   │
│  • Clear value delivered within 15s    │
│                                         │
│  [ Copy ]                              │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  ✗ WHAT FAILED                         │  ← red accent
│                                         │
│  • Retention dropped sharply at 0:11   │
│  • You explained the process before    │
│    showing the result — viewers left   │
│  • No text overlay in first 3 seconds  │
│  • CTA was buried at 0:38 — too late   │
│                                         │
│  [ Copy ]                              │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  → YOUR NEXT POST                      │  ← blue accent
│                                         │
│  Create a 28-second transformation     │
│  reel. Show the result in the first    │
│  3 seconds, then explain how.          │
│  Use text overlay on the hook line.    │
│  Post Tuesday 7–9PM for best reach.   │
│                                         │
│  [ Copy ]                              │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  ✎ YOUR READY-TO-RECORD SCRIPT        │  ← purple accent
│                                         │
│  HOOK (0:00–0:03)                      │
│  "Here's why 90% of founder reels     │
│   get ignored in the first second."   │
│                                         │
│  BODY (0:03–0:22)                      │
│  "Most people open with who they are. │
│   Nobody cares yet. Open with the     │
│   result instead. Show them what       │
│   they'll get — then explain how..."  │
│                                         │
│  CTA (0:22–0:28)                       │
│  "Follow if you want the full         │
│   system. I post it every week."      │
│                                         │
│  B-ROLL SUGGESTIONS                    │
│  • Screen recording of analytics      │
│  • Close-up of your face at hook      │
│  • Text overlay: "90% get ignored"    │
│                                         │
│  [ Copy Full Script ]                  │
└─────────────────────────────────────────┘
```

Footer of output panel:
```
Found this useful? Follow the build →
@piyush._maharana on Instagram
```

---

### PAGE 3 — Demo (`/demo`)

**Purpose:** Remove doubt before people try it.
Show a realistic pre-built example — fake but real-looking input
and the full output Klarix produced. No login. No upload needed.
Just: "Here's what Klarix actually does."

Content: One realistic founder persona (e.g. "Arjun, founder of a
productivity app") with a full worked example showing all 4 output cards.

CTA at bottom: "Try it with your own content →"

---

### PAGE 4 — About (`/about`)

**Purpose:** Build the personal brand alongside the product.
People want to know who built the thing they're using.

Content:
- Your photo
- Your name and IIT Madras background
- Why you built Klarix (your story in 3 paragraphs)
- What's coming in V2
- Instagram link (@piyush._maharana)
- @buildklarix brand page link

---

## THE AI AGENT ARCHITECTURE

Three specialised agents running in sequence.
Each does one job and passes its output to the next.

---

### AGENT 1 — THE VISUAL ANALYST

**Input:** Video file URI (or image) + transcript + analytics numbers + brand context

**Job:** Watch the content. Read the numbers. Cross-reference both.
Produce a structured diagnosis of what actually happened.

**Why it's powerful:** It doesn't just read "watch time 42%" and guess.
It watches the video, sees exactly where the pacing changed at 11 seconds,
reads the transcript at that point, and says "you lost them when you started
explaining instead of showing."

**System Prompt:**
```
You are a senior social media performance analyst with deep expertise
in short-form video psychology and content analytics.

You will receive:
1. A video file or image (the actual content)
2. A transcript (extracted from the video)
3. Analytics numbers (views, watch time, saves, shares, etc.)
4. Brand context (who the creator is and their audience)

Your job is ONLY to analyse and diagnose. Do not give advice yet.

Analyse the following and return structured JSON:
- hook_strength: what happens in the first 3 seconds visually and verbally
- retention_analysis: where viewers likely dropped and why (based on pacing,
  content shifts, and the transcript at that timestamp)
- visual_quality: lighting, framing, text overlays, production notes
- transcript_quality: clarity, pacing, vocabulary, CTA strength
- metric_interpretation: what each metric actually means for THIS content
  (not generic advice — specific to what you saw in the video)
- content_type_fit: is this format right for the message being delivered
- overall_diagnosis: 3-4 sentence summary of what happened

Return ONLY valid JSON. No preamble. No explanation outside the JSON.
```

**Output format:**
```json
{
  "hook_strength": "string",
  "retention_drop_point": "string",
  "retention_drop_reason": "string",
  "visual_quality": "string",
  "transcript_quality": "string",
  "cta_strength": "string",
  "metric_interpretation": {
    "views": "string",
    "watch_time": "string",
    "saves": "string",
    "shares": "string",
    "comments": "string"
  },
  "content_type_fit": "string",
  "overall_diagnosis": "string"
}
```

---

### AGENT 2 — THE STRATEGIST

**Input:** Agent 1's full JSON diagnosis + brand context

**Job:** Turn the diagnosis into a single clear strategic direction.
What is the ONE most impactful change this creator should make?
What should their next post be?

**System Prompt:**
```
You are a social media growth strategist who works exclusively with
founders and personal brands.

You will receive a detailed performance diagnosis of a piece of content.
Your job is to identify the single highest-leverage next move for this creator.

Do not give a list of 10 tips. Give ONE clear strategic direction.
Then specify what the next post should be — format, angle, and approach.

Consider:
- What is the creator's actual bottleneck right now?
- What content format will fix it fastest?
- What angle will resonate with their specific audience?
- What is a realistic improvement to expect?

Return ONLY valid JSON. No preamble.
```

**Output format:**
```json
{
  "primary_bottleneck": "string",
  "priority_fix": "string",
  "next_content_type": "string",
  "next_content_angle": "string",
  "hook_direction": "string",
  "format_recommendation": "string",
  "estimated_impact": "string",
  "strategic_reasoning": "string"
}
```

---

### AGENT 3 — THE SCRIPTWRITER

**Input:** Agent 2's strategy JSON + original transcript + brand context

**Job:** Write the actual script the founder can pick up and record today.
Uses the original transcript as a reference for the creator's natural voice.
Fixes every weakness identified by Agent 1.
Follows the strategy set by Agent 2.

**System Prompt:**
```
You are an expert short-form video scriptwriter specialising in
founder content and personal brand videos.

You will receive:
1. A strategic direction (what to create and why)
2. The original transcript (to understand the creator's natural voice)
3. Brand context (audience, tone, goals)

Your job is to write a complete, ready-to-record script.

Requirements:
- Hook must land within 3 seconds
- Total script must fit 25–35 seconds when spoken naturally
- Match the creator's natural speaking style from the transcript
- Every line must earn its place — no filler
- CTA must be specific and low-friction
- Include B-roll suggestions and text overlay recommendations

Return ONLY valid JSON. No preamble.
```

**Output format:**
```json
{
  "hook": "string (0:00–0:03)",
  "body": "string (0:03–0:25)",
  "cta": "string (0:25–0:32)",
  "text_overlays": ["string", "string", "string"],
  "b_roll_suggestions": ["string", "string", "string"],
  "delivery_notes": "string",
  "estimated_length": "string"
}
```

---

### AGENT ORCHESTRATION FLOW

```javascript
// services/runAnalysis.js

async function runKlarixAnalysis(videoFile, analytics, brandContext) {

  // Step 1: Upload file to Gemini File API
  const fileUri = await uploadToGemini(videoFile)

  // Step 2: Extract transcript from video
  const transcript = await extractTranscript(fileUri)

  // Step 3: Agent 1 — Visual Analyst
  const diagnosis = await agentVisualAnalyst({
    fileUri,
    transcript,
    analytics,
    brandContext
  })

  // Step 4: Agent 2 — Strategist
  const strategy = await agentStrategist({
    diagnosis,
    brandContext
  })

  // Step 5: Agent 3 — Scriptwriter
  const script = await agentScriptwriter({
    strategy,
    transcript,
    brandContext
  })

  // Return all outputs
  return { transcript, diagnosis, strategy, script }
}
```

Each agent call updates the UI progressively:
- File uploaded → "Watching your content..."
- Agent 1 done → What Worked / What Failed cards appear
- Agent 2 done → Next Post card appears
- Agent 3 done → Script card appears

User sees results building in real time, not one big wait.

---

## TECH STACK — FINAL CONFIRMED

| Layer | Technology | Reason |
|---|---|---|
| Frontend framework | Vue 3 + Composition API | You know it, fast to build |
| State management | Pinia | Clean, lightweight |
| Styling | Tailwind CSS v4 | Consistent, fast |
| Build tool | Vite | Fast dev + HMR |
| AI Gateway | OpenRouter API | Free, one key, model-agnostic |
| Primary AI model | Gemini 2.5 Flash | Free, native video/image support |
| File upload | Gemini File API | Free, handles video up to 2GB |
| Fallback model | Llama 3.3 70B | Text-only fallback if Gemini fails |
| Deployment | Vercel | Free tier, auto-deploy from GitHub |
| Domain | klarix.ai or klarix.io | Check availability |
| Analytics | Vercel Analytics | Free, built-in |
| Version control | GitHub | Push to deploy on Vercel |

**No backend server needed for V1.**
Everything runs client-side. OpenRouter and Gemini File API are
called directly from the frontend. Simple, nothing to break.

---

## COMPLETE FOLDER STRUCTURE

```
/klarix
  /public
    favicon.svg              ← Klarix K mark
    og-image.png             ← social share image

  /src
    /assets
      logo.svg               ← Klarix K mark (full)
      logo-wordmark.svg      ← K mark + KLARIX text

    /components
      NavBar.vue             ← logo + CTA button
      HeroSection.vue        ← headline + subline + CTA
      ProblemSection.vue     ← "you post, you guess, you repeat"
      HowItWorks.vue         ← 3-step process
      OutputTeaser.vue       ← example output card on landing
      SocialProof.vue        ← founder count + testimonials
      Footer.vue             ← links + built by
      ─────────────────────────────────
      FileUploader.vue       ← drag/drop upload + preview
      VideoPreview.vue       ← shows uploaded video
      AnalyticsForm.vue      ← views, watch time, saves etc
      BrandContextInput.vue  ← 2-line brand description
      AnalyseButton.vue      ← submit + loading state
      ─────────────────────────────────
      TranscriptCard.vue     ← collapsible transcript display
      WhatWorkedCard.vue     ← green output card
      WhatFailedCard.vue     ← red output card
      NextPostCard.vue       ← blue strategy card
      ScriptCard.vue         ← purple script display
      CopyButton.vue         ← reusable copy to clipboard
      LoadingState.vue       ← progressive loading animation
      ─────────────────────────────────
      DemoExample.vue        ← pre-built worked example

    /views
      Home.vue               ← landing page
      Analyser.vue           ← core tool (split layout)
      Demo.vue               ← demo page
      About.vue              ← about page

    /services
      geminiFileApi.js       ← upload video to Gemini File API
      transcriptExtractor.js ← pull transcript from video
      agentVisualAnalyst.js  ← Agent 1 system prompt + call
      agentStrategist.js     ← Agent 2 system prompt + call
      agentScriptwriter.js   ← Agent 3 system prompt + call
      runAnalysis.js         ← orchestrates all 3 agents
      openRouter.js          ← API config, model selection, error handling

    /stores
      analysisStore.js       ← holds all input + output state
      uiStore.js             ← loading states, active step

    App.vue
    main.js
    router.js

  .env                       ← VITE_OPENROUTER_API_KEY (never commit)
  .gitignore
  index.html
  vite.config.js
  tailwind.config.js
  package.json
  README.md
```

---

## THE COMPLETE USER FLOW

```
User sees @piyush._maharana Instagram reel
              ↓
Clicks link in bio → lands on klarix.ai
              ↓
Reads hero: understands in 5 seconds
              ↓
Clicks "Analyse My Post Free"
              ↓
Lands on /analyse
              ↓
STEP 1: Uploads reel/post (drag and drop)
Video preview appears — confirms correct file
              ↓
STEP 2: Fills in analytics numbers
(or skips fields they don't know)
              ↓
STEP 3: Writes 2-line brand context
              ↓
Clicks "Analyse My Content →"
              ↓
Loading state begins:
"Uploading your content..."     (1-2 sec)
"Watching your video..."        (2-3 sec)
"Extracting transcript..."      (1-2 sec)
"Running performance analysis..." (3-4 sec)
"Building your strategy..."     (2-3 sec)
"Writing your script..."        (2-3 sec)
              ↓
Transcript card appears (collapsed)
              ↓
What Worked card fades in ✓
              ↓
What Failed card fades in ✗
              ↓
Next Post card fades in →
              ↓
Script card fades in ✎
              ↓
User reads, copies sections they need
              ↓
Footer: "Follow the build → @piyush._maharana"
              ↓
User follows on Instagram
```

Total time from submit to full results: **12–18 seconds**

---

## DESIGN SYSTEM

**Colors:**
```
Background:     #0A0A0F  (near-black, not pure black)
Surface:        #13131A  (cards and panels)
Border:         #1E1E2E  (subtle card borders)
Text primary:   #FFFFFF
Text secondary: #888899
Accent:         #6366F1  (indigo — Klarix signature)
Success:        #22C55E  (What Worked — green)
Error:          #EF4444  (What Failed — red)
Strategy:       #3B82F6  (Next Post — blue)
Script:         #A855F7  (Script — purple)
```

**Typography:**
```
Display:  Space Grotesk — headlines, hero text
Body:     Inter — paragraphs, labels, UI text
Mono:     JetBrains Mono — script output, transcript
```

**Spacing:** 4px base unit. Everything is a multiple of 4.

**Border radius:** 12px cards, 8px inputs, 6px buttons.

**Motion:** Cards fade + slide up on appearance (200ms ease-out).
Progressive loading dots between agent steps.

---

## BUILD ORDER — DAY BY DAY (18 Days)

**Days 1–2: Project Setup**
- Scaffold Vue 3 + Vite + Tailwind + Pinia
- Set up router (4 routes)
- Get localhost running
- Push to GitHub
- Connect GitHub to Vercel (auto-deploy active from Day 2)
- Set up .env for API keys

**Days 3–4: Landing Page**
- Build NavBar, HeroSection, ProblemSection
- Build HowItWorks, Footer
- Deploy — you have a live URL from Day 4
- Post on Instagram: "Klarix is live — just a landing page but the URL works"

**Days 5–6: Analyser Input Panel**
- Build FileUploader with drag/drop
- Build VideoPreview component
- Build AnalyticsForm with conditional fields
- Build BrandContextInput
- Wire all inputs to Pinia store

**Days 7–8: Gemini File API + Transcript**
- Build geminiFileApi.js — upload video, get URI
- Build transcriptExtractor.js — pull transcript
- Test with a real video upload
- Handle errors gracefully (file too large, wrong format)

**Days 9–10: The Three AI Agents**
- Build agentVisualAnalyst.js — write + test system prompt
- Build agentStrategist.js — write + test system prompt
- Build agentScriptwriter.js — write + test system prompt
- Build runAnalysis.js — chain all three
- Test entire pipeline with real content

**Days 11–12: Output Panel**
- Build TranscriptCard (collapsible)
- Build WhatWorkedCard, WhatFailedCard
- Build NextPostCard, ScriptCard
- Build CopyButton (clipboard API)
- Wire output panel to analysis store
- Build progressive loading state animation

**Day 13: Demo Page**
- Write realistic founder persona and content scenario
- Pre-populate all 4 output cards with realistic data
- Add CTA: "Try it with your own content →"

**Day 14: About Page**
- Your photo, story, IIT Madras, why you built Klarix
- Instagram links, brand page link

**Days 15–16: Polish**
- Mobile responsiveness (test on actual phone)
- Error handling for all edge cases
- Empty state for missing analytics fields
- File size validation on upload
- Loading states for every async action

**Days 17–18: Launch Prep**
- Set up custom domain on Vercel
- Add Vercel Analytics
- Add OG image for social sharing
- Final cross-browser testing
- Write Instagram launch post caption
- GO LIVE

---

## INSTAGRAM CONTENT DURING THE BUILD

Every day of building is content. Do not wait until launch to post.

```
Day 1  → "Starting to build Klarix today. Here's the architecture."
Day 4  → "Klarix.ai is live. It's just a landing page. Watch it grow."
Day 8  → "Just got the file upload working. You can drop a reel and
           Klarix reads it frame by frame. Here's what that looks like."
Day 10 → "First full 3-agent analysis just ran. Watched it analyse
           my own reel. Found things I completely missed."
Day 14 → "Demo page is live. Try it without uploading anything.
           Link in bio."
Day 18 → "Klarix V1 is live. Upload your reel. Free. No login.
           Tell me what's broken."
```

The build IS the content.
The content builds the audience.
The audience becomes the first users.
The first users give you the feedback for V2.

---

## WHAT COMES AFTER V1

Do not build any of this now. Document it so you know where you're going.

**V1.5 (Month 2):**
- Save analyses to local storage (no backend yet)
- Analysis history — see your last 5 results
- Improved script templates per content type

**V2.0 (Month 3–4):**
- User accounts + database (Supabase)
- Brand memory — Klarix remembers your brand across sessions
- Auto-post scheduling to Instagram + LinkedIn
- Content calendar view

**V3.0 (Month 5–6):**
- Team access (agency tier)
- Client management dashboard
- White-label option for agencies
- Pricing: Free / Pro ₹999/mo / Agency ₹4999/mo

---

## BEFORE YOU WRITE LINE ONE OF CODE

Three things to do right now:

1. Create an OpenRouter account at openrouter.ai — get your free API key
2. Create a Google AI Studio account at aistudio.google.com — enable Gemini API
3. Create a GitHub repo named "klarix" — this is where the code lives

Once those three are done, come back and say "ready to build."
Day 1 starts immediately.

---

*Klarix V1 Build Plan — Piyush Maharana, IIT Madras*
*Built with Vue 3 · OpenRouter · Gemini 2.5 Flash · Vercel*
