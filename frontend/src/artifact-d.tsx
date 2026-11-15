// Entry for the shareable comment page: direction D (Field film) only. The page to draw comes from the root element's
// data-page ("regions" in page.html); FieldFilm maps the name, as it does the site's ?page=. app.html, the audit's old
// address, is a small redirect to the region page and loads no script.
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import FieldFilm from './directions/r2/FieldFilm'

const root = document.getElementById('root')!
// the artifact supplies the document around the region page; name its language
if (!document.documentElement.lang) document.documentElement.lang = 'en'
createRoot(root).render(<StrictMode><FieldFilm page={root.dataset.page} nav="artifact" /></StrictMode>)
