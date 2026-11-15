// Entry for the shareable comment pages: direction D (Field film) only, one bundle for every page. The page to draw
// comes from the root element's data-page ("regions" in page.html, "sim" in sim.html); FieldFilm maps the name, as it
// does the site's ?page=. app.html, the audit's old address, is a small redirect to the region page and loads no script.
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import FieldFilm from './directions/r2/FieldFilm'

const root = document.getElementById('root')!
// the artifact supplies the document around the region page; name its language
if (!document.documentElement.lang) document.documentElement.lang = 'en'
createRoot(root).render(<StrictMode><FieldFilm page={root.dataset.page} nav="artifact" /></StrictMode>)
