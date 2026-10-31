import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import cookieParser from 'cookie-parser'

// V2 Middlewares
import { requireAuth, requireBrandAccess } from './middleware/auth.js'

// V2 Routers
import authRouter from './routes/v2/auth.js'
import brandsRouter from './routes/v2/brands.js'
import connectionsRouter from './routes/v2/connections.js'
import jobsRouter from './routes/v2/jobs.js'
import { brandContentRouter, globalContentRouter } from './routes/v2/content.js'
import { brandPatternsRouter, patternDetailRouter } from './routes/v2/patterns.js'
import strategyRoutes from './routes/v2/strategy.js'
import ideaRoutes from './routes/v2/ideas.js'
import { brandMemoryRouter } from './routes/v2/memory.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

// Hide Express server signature from response headers
app.disable('x-powered-by')

// Strict CORS allowlist supporting local dev and configured tunnel/production URL
const allowedOrigins = [
  'http://localhost:5173',
  process.env.FRONTEND_URL
].filter(Boolean)

app.use(cors({
  origin: (origin, callback) => {
    // Allow same-origin/server-to-server requests or explicitly allowed origins
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true
}))

app.use(express.json({ limit: '2mb' }))
app.use(express.urlencoded({ extended: true, limit: '2mb' }))
app.use(cookieParser())

// ─── Health Check ───
app.get('/api/health', (req, res) => {
  res.json({
    status: 'Klarix V2 Engine Operational',
    version: '2.0.0',
    timestamp: new Date().toISOString()
  })
})

// ─── Public V2 Authentication Routes ───
app.use('/api/v2/auth', authRouter)

// ─── Protected V2 Global Routes (Require Valid Session) ───
app.use('/api/v2/brands', requireAuth, brandsRouter)
app.use('/api/v2/patterns', requireAuth, patternDetailRouter)
app.use('/api/v2/content', requireAuth, globalContentRouter)
app.use('/api/v2/ideas', requireAuth, ideaRoutes)

// ─── Protected V2 Brand-Scoped Routes (Require Session + Brand Ownership) ───
app.use('/api/v2/brands/:brandId', requireAuth, requireBrandAccess, connectionsRouter)
app.use('/api/v2/brands/:brandId/jobs', requireAuth, requireBrandAccess, jobsRouter)
app.use('/api/v2/brands/:brandId/content', requireAuth, requireBrandAccess, brandContentRouter)
app.use('/api/v2/brands/:brandId/patterns', requireAuth, requireBrandAccess, brandPatternsRouter)
app.use('/api/v2/brands/:brandId/strategy', requireAuth, requireBrandAccess, strategyRoutes)
app.use('/api/v2/brands/:brandId', requireAuth, requireBrandAccess, ideaRoutes)
app.use('/api/v2/brands/:brandId/memory', requireAuth, requireBrandAccess, brandMemoryRouter)

// ─── 404 Handler for Unknown API Routes ───
app.use('/api', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'NOT_FOUND',
    message: 'API endpoint not found'
  })
})

app.listen(PORT, () => {
  console.log(`\n======================================================`)
  console.log(`🚀 Klarix V2 Backend Engine live at http://localhost:${PORT}`)
  console.log(`🛡️  Zero-Trust Auth & Brand Isolation Middleware Active`)
  console.log(`======================================================\n`)
})