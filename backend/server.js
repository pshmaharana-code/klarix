import express from 'express'
import cors from 'cors'
import multer from 'multer'
import dotenv from 'dotenv'
import { executeThreeAgentPipeline } from './services/runAnalysis.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

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
    version: '1.0.0', 
    timestamp: new Date().toISOString() 
  })
})

// Main AI Analysis Ingestion Endpoint
app.post('/api/analyse', upload.single('mediaFile'), async (req, res) => {
  try {
    console.log('\n======================================================')
    console.log('[Klarix API] Ingestion Request Received at /api/analyse')

    const file = req.file
    const {
      contentType,
      platform,
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
    if (file) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2)
      mediaInfo = `Uploaded Asset: ${file.originalname} (${file.mimetype}, ${sizeMB}MB), Content Type: ${contentType || 'Reel'} for ${platform || 'Instagram'}`
      console.log(`[Klarix API] Media attached: ${mediaInfo}`)
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
      platform: platform || 'Instagram',
      contentType: contentType || 'Reel'
    }

    console.log('[Klarix API] Extracted Analytics:', analytics)
    console.log('[Klarix API] Brand Context:', brandContext || 'None provided')
    console.log('[Klarix API] Activating 3-Agent AI Intelligence Pipeline...')

    const results = await executeThreeAgentPipeline({
      mediaInfo,
      transcript: null, // Agent 1 will evaluate visual/audio context
      analytics,
      brandContext
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

app.listen(PORT, () => {
  console.log(`\n======================================================`)
  console.log(`🚀 Klarix AI Backend Engine live at http://localhost:${PORT}`)
  console.log(`🛡️  CORS enabled | Multer initialized | OpenRouter/Gemini ready`)
  console.log(`======================================================\n`)
})
