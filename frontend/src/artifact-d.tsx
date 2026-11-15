// Entry for the shareable comment pages: direction D (Field film) only, one bundle for every page. The page to draw
// comes from the root element: data-page="landing" (the artifact's main page), "app" (app.html) or "sim" (sim.html).
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import FieldFilm from './directions/r2/FieldFilm'

const root = document.getElementById('root')!
// the artifact supplies the document around the landing page; name its language
if (!document.documentElement.lang) document.documentElement.lang = 'en'
const page = root.dataset.page === 'app' ? 'app' : root.dataset.page === 'sim' ? 'sim' : 'landing'
createRoot(root).render(<StrictMode><FieldFilm page={page} nav="artifact" /></StrictMode>)
