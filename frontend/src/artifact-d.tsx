// Entry for the shareable comment page: direction D (Field film) only.
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import FieldFilm from './directions/r2/FieldFilm'

createRoot(document.getElementById('root')!).render(<StrictMode><FieldFilm /></StrictMode>)
