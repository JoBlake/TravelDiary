import { useEffect, useRef, useState } from 'react'
import { useMapsLibrary } from '@vis.gl/react-google-maps'
import { PLACE_FIELDS, toPickedPlace, type PickedPlace } from '../lib/places'

export type { PickedPlace }

interface PlaceAutocompleteProps {
  onPlaceSelect: (place: PickedPlace) => void
}

/**
 * Wraps Google's <gmp-place-autocomplete> custom element (the current,
 * non-deprecated Places widget) since it isn't a built-in React component.
 */
export function PlaceAutocomplete({ onPlaceSelect }: PlaceAutocompleteProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const placesLibrary = useMapsLibrary('places')
  const [element, setElement] =
    useState<google.maps.places.PlaceAutocompleteElement | null>(null)

  // Create the element once the Places library has loaded.
  useEffect(() => {
    if (!placesLibrary || !containerRef.current) return

    const autocomplete = new placesLibrary.PlaceAutocompleteElement()
    containerRef.current.appendChild(autocomplete)
    setElement(autocomplete)

    return () => {
      autocomplete.remove()
      setElement(null)
    }
  }, [placesLibrary])

  // Listen for a selection and hand back a plain object.
  useEffect(() => {
    if (!element) return

    const listener = (event: Event) => {
      const { placePrediction } = event as unknown as {
        placePrediction: google.maps.places.PlacePrediction | null
      }
      if (!placePrediction) return

      const place = placePrediction.toPlace()
      void place
        .fetchFields({ fields: [...PLACE_FIELDS] })
        .then(() => {
          const picked = toPickedPlace(place)
          if (picked) onPlaceSelect(picked)
        })
    }

    element.addEventListener('gmp-select', listener)
    return () => element.removeEventListener('gmp-select', listener)
  }, [element, onPlaceSelect])

  return <div ref={containerRef} className="place-autocomplete" />
}
