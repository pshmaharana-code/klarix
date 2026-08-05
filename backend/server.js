import express from 'express'
import cors from 'cors'
import multer from 'multer'
import dotenv from 'dotenv'
import { executeThreeAgentPipeline } from './services/runAnalysis.js'
import { scrapeInstagramPost } from './services/instagramScraper.js'
import { runVisualAnalyst } from './services/agentVisualAnalyst.js'
import { runStrategist } from './services/agentStrategist.js'
import { runScriptwriter } from './services/agentScriptwriter.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

// In-memory background jobs registry for "Sleight of Hand" asynchronous processing
const backgroundJobs = new Map()

// Enable CORS and JSON parsing
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Configure Multer in-memory upload handler (up to 60MB for video content)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 60 * 1024 * 1024 }
})

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'Klarix 3-Agent AI Engine Operational',
    version: '2.0.0 (Sleight of Hand Enabled)',
    timestamp: new Date().toISOString()
  })
})

// Main AI Analysis Ingestion Endpoint (Direct file / traditional upload)
app.post('/api/analyse', upload.single('mediaFile'), async (req, res) => {
  try {
    console.log('\n======================================================')
    console.log('[Klarix API] Ingestion Request Received at /api/analyse')

    const file = req.file
    const {
      contentType,
      platform,
      url,
      views,
      watchTime,
      likes,
      comments,
      shares,
      saves,
      profileVisits,
      followersGained,
      brandContext
    } = req.body

    let mediaInfo = "No media file attached; relying on numerical analytics and brand context."
    let mediaFilePayload = null
    let transcript = null

    if (file) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2)
      mediaInfo = `Uploaded Asset: ${file.originalname} (${file.mimetype}, ${sizeMB}MB), Content Type: ${contentType || 'Reel'} for Instagram`

      const b64 = file.buffer.toString('base64')
      mediaFilePayload = `data:${file.mimetype};base64,${b64}`

      console.log(`[Klarix API] Media attached: ${mediaInfo}`)
    } else if (url && typeof url === 'string' && url.trim() !== '') {
      console.log(`[Klarix API] URL Asset detected: ${url.trim()}. Activating Instagram Scraper...`)
      const scraped = await scrapeInstagramPost(url.trim())
      mediaInfo = scraped.mediaInfo || `Extracted Instagram Reel asset from URL: ${url.trim()}`
      transcript = scraped.caption || null
      console.log(`[Klarix API] Scraped URL media context: ${mediaInfo}`)
    }

    const analytics = {
      views: views ? parseInt(views, 10) : 0,
      watchTime: watchTime ? parseInt(watchTime, 10) : null,
      likes: likes ? parseInt(likes, 10) : 0,
      comments: comments ? parseInt(comments, 10) : 0,
      shares: shares ? parseInt(shares, 10) : 0,
      saves: saves ? parseInt(saves, 10) : 0,
      profileVisits: profileVisits ? parseInt(profileVisits, 10) : 0,
      followersGained: followersGained ? parseInt(followersGained, 10) : 0,
      platform: 'Instagram',
      contentType: contentType || 'Reel'
    }

    console.log('[Klarix API] Extracted Analytics:', analytics)
    console.log('[Klarix API] Brand Context:', brandContext || 'None provided')
    console.log('[Klarix API] Activating 3-Agent AI Intelligence Pipeline...')

    const results = await executeThreeAgentPipeline({
      mediaInfo,
      transcript,
      analytics,
      brandContext,
      mediaFilePayload
    })

    console.log('[Klarix API] Pipeline completed successfully. Transmitting payload to frontend.')
    console.log('======================================================\n')

    res.status(200).json(results)
  } catch (error) {
    console.error('[Klarix API] Error processing analysis request:', error)
    res.status(500).json({
      success: false,
      error: error.message || 'An internal error occurred while executing the AI pipeline.'
    })
  }
})

// ─── SLEIGHT OF HAND ENDPOINT 1: INSTAGRAM URL INGESTION & PARALLEL AI ENGINE ───
app.post('/api/ingest-url', async (req, res) => {
  try {
    const { url, platform, contentType } = req.body
    if (!url) {
      return res.status(400).json({ success: false, error: "Please provide a valid Instagram Reel or Post URL." })
    }
    
    const jobId = "job_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7)
    console.log(`\n======================================================`)
    console.log(`[Klarix API] Sleight-of-Hand URL Ingestion triggered: ${url} (Job ID: ${jobId})`)

    // Initialize Job State in memory
    backgroundJobs.set(jobId, {
      status: 'extracting',
      url,
      mediaContext: null,
      diagnosis: null,
      error: null
    })

    // Return immediately to frontend so UI instantly opens processing state & Sleight-of-Hand Modal
    res.status(202).json({
      success: true,
      jobId,
      message: "Extracting Media & Public Telemetry..."
    })

    // Execute heavy Node 1 (Visual Analyst & Transcription) in background while user interacts with UI
    setTimeout(async () => {
      try {
        const mediaContext = await scrapeInstagramPost(url)
        const job = backgroundJobs.get(jobId)
        if (job) {
          job.mediaContext = mediaContext
          job.status = 'node_1_running'
        }
        
        console.log(`[Job ${jobId}] Executing Node 1 (Visual Analyst & Audio Speech Transcript) in parallel background...`)
        const diagnosis = await runVisualAnalyst({
          mediaInfo: mediaContext.mediaInfo,
          transcript: mediaContext.caption,
          analytics: { 
            note: "Private numeric metrics (views, watch time, saves) will be provided in Step 3 via UI modal. Focus strictly on visual hook strength, structural editing cuts, typography overlays, and spoken script pacing without mentioning view counts.",
            platform: 'Instagram',
            contentType: contentType || 'Reel'
          },
          brandContext: "Creator seeking retention optimization and algorithmic velocity."
        })
        
        if (job) {
          job.diagnosis = diagnosis
          job.status = 'node_1_complete'
          console.log(`[Job ${jobId}] Node 1 Background Processing COMPLETE! Ready for private stats payoff.`)
        }
      } catch (bgError) {
        console.error(`[Job ${jobId}] Background exception in Node 1:`, bgError)
        const job = backgroundJobs.get(jobId)
        if (job) {
          job.status = 'error'
          job.error = bgError.message || "Failed during Node 1 execution."
        }
      }
    }, 50)
  } catch (err) {
    console.error('[Klarix API] Error initiating ingest-url:', err)
    res.status(500).json({ success: false, error: err.message })
  }
})

// ─── SLEIGHT OF HAND ENDPOINT 2: PAYLOAD COMPLETION AFTER PRIVATE METRICS MODAL ───
app.post('/api/complete-analysis', async (req, res) => {
  try {
    const { jobId, analytics, brandContext } = req.body
    console.log(`\n[Klarix API] Payoff step triggered for Job ID: ${jobId}`)
    console.log(`[Klarix API] Received private user stats from modal:`, analytics)

    const job = backgroundJobs.get(jobId)
    if (!job) {
      return res.status(404).json({ success: false, error: "Processing job expired or invalid. Please re-ingest your media." })
    }

    if (job.status === 'error') {
      return res.status(500).json({ success: false, error: job.error || "Background processing encountered an error." })
    }

    // If Node 1 is still running while user was typing stats, await completion
    let waited = 0
    while (job.status !== 'node_1_complete' && job.status !== 'error' && waited < 20000) {
      await new Promise(r => setTimeout(r, 500))
      waited += 500
      console.log(`[Job ${jobId}] Waiting for Node 1 to finish background execution (${waited/1000}s)...`)
    }

    if (!job.diagnosis) {
      return res.status(500).json({ success: false, error: "Node 1 AI timed out. Please try again." })
    }

    // Now rapidly execute Node 2 and Node 3 with the verified private stats!
    const fullAnalytics = {
      views: analytics?.views ? parseInt(analytics.views, 10) : 67000,
      watchTime: analytics?.watchTime ? parseInt(analytics.watchTime, 10) : 57,
      saves: analytics?.saves ? parseInt(analytics.saves, 10) : 88,
      likes: analytics?.likes ? parseInt(analytics.likes, 10) : 8000,
      comments: analytics?.comments ? parseInt(analytics.comments, 10) : 53,
      shares: analytics?.shares ? parseInt(analytics.shares, 10) : 89,
      profileVisits: analytics?.profileVisits ? parseInt(analytics.profileVisits, 10) : 22000,
      followersGained: analytics?.followersGained ? parseInt(analytics.followersGained, 10) : 9000,
      platform: 'Instagram',
      contentType: 'Reel'
    }

    // Embed empirical telemetry into diagnosis for deep strategic pattern recognition
    job.diagnosis.verified_analytics = fullAnalytics

    const activeBrandContext = brandContext || "Ambitious personal brand and creator scaling authority and conversions in 2026."

    console.log(`[Job ${jobId}] Executing Node 2 (Strategist) with verified private retention metrics...`)
    const strategy = await runStrategist({ diagnosis: job.diagnosis, brandContext: activeBrandContext })

    console.log(`[Job ${jobId}] Executing Node 3 (Scriptwriter) for high-velocity script synthesis...`)
    const scriptOutput = await runScriptwriter({ strategy, diagnosis: job.diagnosis, brandContext: activeBrandContext })

    const formattedTranscript = job.diagnosis.extracted_transcript || job.mediaContext?.caption || "No audio transcript detected."
    const whatWorked = Array.isArray(job.diagnosis.what_worked) ? job.diagnosis.what_worked : [job.diagnosis.hook_strength, job.diagnosis.visual_quality].filter(Boolean)
    const whatFailed = Array.isArray(job.diagnosis.what_failed) ? job.diagnosis.what_failed : [job.diagnosis.retention_drop_reason, job.diagnosis.cta_strength].filter(Boolean)

    const nextPostStrategy = {
      title: `${strategy.next_content_type || 'Short-Form Reel'} — ${strategy.next_content_angle || 'Algorithmic Hook Angle'}`,
      advice: `${strategy.priority_fix || 'Open directly with the primary result.'}\n\n• Hook Direction: ${strategy.hook_direction}\n• Production Guidance: ${strategy.format_recommendation}\n• Trend Insight (2026): ${strategy.trend_insight}\n• Predicted Impact: ${strategy.estimated_impact}`
    }

    const script = {
      hook: scriptOutput.hook,
      body: scriptOutput.body,
      cta: scriptOutput.cta,
      bRoll: scriptOutput.b_roll_suggestions || [],
      textOverlays: scriptOutput.text_overlays || []
    }

    // Cleanup memory after completion
    backgroundJobs.delete(jobId)

    console.log(`[Job ${jobId}] Sleight-of-Hand Payoff sequence COMPLETE! Instant diagnostic delivery sent.`)
    console.log(`======================================================\n`)

    res.status(200).json({
      success: true,
      transcript: formattedTranscript,
      whatWorked,
      whatFailed,
      nextPostStrategy,
      script,
      raw: { diagnosis: job.diagnosis, strategy, scriptOutput }
    })
  } catch (error) {
    console.error('[Klarix API] Error completing analysis:', error)
    res.status(500).json({ success: false, error: error.message || "Failed during final synthesis." })
  }
})

app.listen(PORT, () => {
  console.log(`\n======================================================`)
  console.log(`🚀 Klarix AI Backend Engine live at http://localhost:${PORT}`)
  console.log(`🛡️  CORS enabled | Multer initialized | OpenRouter/Gemini ready`)
  console.log(`✨ Sleight-of-Hand Asynchronous Parallel Intelligence Active`)
  console.log(`======================================================\n`)
})

