import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Note: StrictMode is intentionally omitted. Its dev-only double
// mount/unmount/remount of effects causes Google's PlaceAutocompleteElement
// (a web component with async internal setup) to hang. StrictMode's extra
// checks don't run in production anyway, so this only affects local dev.
createRoot(document.getElementById('root')!).render(<App />)
