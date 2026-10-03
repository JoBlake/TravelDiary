import { useEffect, useState } from 'react'
import { useMapsLibrary } from '@vis.gl/react-google-maps'

/**
 * Fetches a small live photo for a place (not stored — see note in
 * LocationPicker about not persisting Google's own place data). Falls
 * back to a plain placeholder block if there's no photo.
 */
export function PlaceThumbnail({ googlePlaceId }: { googlePlaceId: string }) {
  const placesLibrary = useMapsLibrary('places')
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!placesLibrary) return
    let cancelled = false

    const place = new placesLibrary.Place({ id: googlePlaceId })
    place
      .fetchFields({ fields: ['photos'] })
      .then(() => {
        if (cancelled) return
        const photo = place.photos?.[0]
        setPhotoUrl(photo ? photo.getURI({ maxWidth: 160, maxHeight: 160 }) : null)
      })
      .catch(() => {
        if (!cancelled) setPhotoUrl(null)
      })

    return () => {
      cancelled = true
    }
  }, [placesLibrary, googlePlaceId])

  if (photoUrl) {
    return <img className="diary-place-thumb" src={photoUrl} alt="" loading="lazy" />
  }
  return <div className="diary-place-thumb diary-place-thumb-placeholder" aria-hidden="true" />
}
