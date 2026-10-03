import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  APIProvider,
  Map,
  Marker,
  InfoWindow,
  useMap,
  useMapsLibrary,
  useMarkerRef,
  type MapMouseEvent,
} from '@vis.gl/react-google-maps'
import { PlaceAutocomplete } from './PlaceAutocomplete'
import { DiaryPlaceForm, type DiaryPlaceFormValues } from './DiaryPlaceForm'
import { StarRatingDisplay } from './StarRating'
import { PlaceThumbnail } from './PlaceThumbnail'
import { useMyDiaries } from '../lib/useDiaries'
import { supabase } from '../lib/supabase'
import { PLACE_FIELDS, toPickedPlace, type PickedPlace } from '../lib/places'

const DEFAULT_CENTER = { lat: 20, lng: 0 }
const DEFAULT_ZOOM = 2
const NEARBY_ZOOM = 13 // zoom level for "your area" once geolocated
const SELECTED_ZOOM = 15 // zoom level once a specific place is picked

const EMPTY_FORM: DiaryPlaceFormValues = { visitedOn: '', rating: 0, notes: '' }

interface ExistingEntry {
  id: string
  visited_on: string | null
  rating: number | null
  notes: string | null
}

interface SavedPlace {
  id: string
  google_place_id: string
  name: string
  lat: number
  lng: number
  visited_on: string | null
  rating: number | null
  notes: string | null
}

/**
 * Imperatively pans/zooms the map rather than passing center/zoom as
 * controlled props — controlled props would keep snapping the map back
 * on every render, which is what made the map un-pannable.
 */
interface FocusTarget {
  id: string
  lat: number
  lng: number
}

function MapController({
  place,
  focusPlace,
}: {
  place: PickedPlace | null
  focusPlace: FocusTarget | null
}) {
  const map = useMap()
  const hasCenteredOnUser = useRef(false)
  const pickedRef = useRef(place)
  pickedRef.current = place

  // Once, on load: try to center on the user's current location, unless
  // a place has already been picked by the time the browser responds.
  useEffect(() => {
    if (!map || hasCenteredOnUser.current || !('geolocation' in navigator)) {
      return
    }
    hasCenteredOnUser.current = true

    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (pickedRef.current) return // a place was picked in the meantime
        map.panTo({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        })
        map.setZoom(NEARBY_ZOOM)
      },
      () => {
        // Permission denied or unavailable — keep the default world view.
      },
      { maximumAge: 5 * 60 * 1000, timeout: 8000 },
    )
  }, [map])

  // Whenever a new place is picked, pan/zoom to it once.
  useEffect(() => {
    if (!map || !place) return
    map.panTo({ lat: place.lat, lng: place.lng })
    map.setZoom(SELECTED_ZOOM)
  }, [map, place])

  // Whenever a sidebar entry is clicked, pan/zoom to it too.
  useEffect(() => {
    if (!map || !focusPlace) return
    map.panTo({ lat: focusPlace.lat, lng: focusPlace.lng })
    map.setZoom(SELECTED_ZOOM)
    // Only re-run when the target place itself changes, not on every
    // object identity change (focusPlace is recreated on each render).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, focusPlace?.id])

  return null
}

/** Popup for a freshly-searched place: rich Google info + add/edit-in-diary. */
function PlaceInfo({
  place,
  selectedDiaryId,
  selectedDiaryName,
  diaryCount,
  onSaved,
}: {
  place: PickedPlace
  selectedDiaryId: string | null
  selectedDiaryName: string | null
  diaryCount: number
  onSaved: () => void
}) {
  const [existingEntry, setExistingEntry] = useState<ExistingEntry | null | 'loading'>(
    'loading',
  )
  const [formOpen, setFormOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Look up whether this place is already saved in the selected diary.
  useEffect(() => {
    setFormOpen(false)
    setSaveError(null)

    if (!selectedDiaryId) {
      setExistingEntry(null)
      return
    }

    let cancelled = false
    setExistingEntry('loading')

    supabase
      .from('diary_places')
      .select('id, visited_on, rating, notes')
      .eq('diary_id', selectedDiaryId)
      .eq('google_place_id', place.placeId)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setExistingEntry(data ?? null)
      })

    return () => {
      cancelled = true
    }
  }, [selectedDiaryId, place.placeId])

  const handleSave = async (values: DiaryPlaceFormValues) => {
    if (!selectedDiaryId) return
    setSaving(true)
    setSaveError(null)

    const { data, error } = await supabase
      .from('diary_places')
      .upsert(
        {
          diary_id: selectedDiaryId,
          google_place_id: place.placeId,
          name: place.name,
          lat: place.lat,
          lng: place.lng,
          visited_on: values.visitedOn || null,
          rating: values.rating || null,
          notes: values.notes.trim() || null,
        },
        { onConflict: 'diary_id,google_place_id' },
      )
      .select('id, visited_on, rating, notes')
      .single()

    setSaving(false)
    if (error) {
      setSaveError(error.message)
      return
    }
    setExistingEntry(data)
    setFormOpen(false)
    onSaved() // refresh the persistent markers so this place shows up
  }

  const mapsUrl = `https://www.google.com/maps/place/?q=place_id:${place.placeId}`

  return (
    <div className="place-info">
      <strong className="place-info-name">{place.name}</strong>

      {typeof place.rating === 'number' && (
        <StarRatingDisplay value={place.rating} count={place.userRatingCount} />
      )}

      {place.address && <div className="place-info-address">{place.address}</div>}

      <a
        href={mapsUrl}
        target="_blank"
        rel="noreferrer"
        className="place-info-maps-link"
      >
        View on Google Maps
      </a>

      <div className="place-info-diary">
        {diaryCount === 0 ? (
          <p className="place-info-hint">
            <Link to="/diaries">Create a diary</Link> to save places to it.
          </p>
        ) : !selectedDiaryId ? (
          <p className="place-info-hint">Choose a diary above to add this place.</p>
        ) : formOpen ? (
          <DiaryPlaceForm
            initial={
              existingEntry && existingEntry !== 'loading'
                ? {
                    visitedOn: existingEntry.visited_on ?? '',
                    rating: existingEntry.rating ?? 0,
                    notes: existingEntry.notes ?? '',
                  }
                : EMPTY_FORM
            }
            onSave={handleSave}
            onCancel={() => setFormOpen(false)}
            saving={saving}
            error={saveError}
          />
        ) : existingEntry === 'loading' ? (
          <p className="place-info-hint">Checking…</p>
        ) : existingEntry ? (
          <div className="place-info-saved">
            <span>
              Saved to <strong>{selectedDiaryName}</strong>
              {existingEntry.rating ? ` · ${existingEntry.rating}★` : ''}
            </span>
            <button type="button" onClick={() => setFormOpen(true)}>
              Edit
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => setFormOpen(true)}>
            Add to {selectedDiaryName}
          </button>
        )}
      </div>
    </div>
  )
}

/** Popup for an already-saved place: our own data, with edit/remove. */
function SavedPlaceInfo({
  place,
  onChanged,
  onClose,
}: {
  place: SavedPlace
  onChanged: () => void
  onClose: () => void
}) {
  const [formOpen, setFormOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const handleSave = async (values: DiaryPlaceFormValues) => {
    setSaving(true)
    setSaveError(null)

    const { error } = await supabase
      .from('diary_places')
      .update({
        visited_on: values.visitedOn || null,
        rating: values.rating || null,
        notes: values.notes.trim() || null,
      })
      .eq('id', place.id)

    setSaving(false)
    if (error) {
      setSaveError(error.message)
      return
    }
    setFormOpen(false)
    onChanged()
  }

  const handleRemove = async () => {
    setSaving(true)
    const { error } = await supabase.from('diary_places').delete().eq('id', place.id)
    setSaving(false)
    if (error) {
      setSaveError(error.message)
      return
    }
    onClose()
    onChanged()
  }

  return (
    <div className="place-info">
      <strong className="place-info-name">{place.name}</strong>

      {formOpen ? (
        <DiaryPlaceForm
          initial={{
            visitedOn: place.visited_on ?? '',
            rating: place.rating ?? 0,
            notes: place.notes ?? '',
          }}
          onSave={handleSave}
          onCancel={() => setFormOpen(false)}
          saving={saving}
          error={saveError}
        />
      ) : (
        <>
          {place.rating && <StarRatingDisplay value={place.rating} />}
          {place.visited_on && (
            <div className="place-info-address">{place.visited_on}</div>
          )}
          {place.notes && <p className="diary-commentary">{place.notes}</p>}
          <div className="place-info-diary place-info-saved">
            <button type="button" onClick={() => setFormOpen(true)}>
              Edit
            </button>
            <button
              type="button"
              className="danger-button"
              onClick={handleRemove}
              disabled={saving}
            >
              {saving ? 'Removing…' : 'Remove'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

/**
 * Search a place, see it marked on the map, and save it into a diary
 * with a visit date, a 1-5 star rating, and notes. Places already saved
 * to the selected diary stay pinned on the map as their own markers.
 */
export function LocationPicker() {
  const [picked, setPicked] = useState<PickedPlace | null>(null)
  const [infoOpen, setInfoOpen] = useState(false)
  const [markerRef, marker] = useMarkerRef()
  const placesLibrary = useMapsLibrary('places')

  const { diaries, loading: diariesLoading } = useMyDiaries()
  const [selectedDiaryId, setSelectedDiaryId] = useState<string | null>(null)

  const [diaryPlaces, setDiaryPlaces] = useState<SavedPlace[]>([])
  const [openSavedPlaceId, setOpenSavedPlaceId] = useState<string | null>(null)
  const [focusedPlaceId, setFocusedPlaceId] = useState<string | null>(null)

  const loadDiaryPlaces = useCallback(async () => {
    if (!selectedDiaryId) {
      setDiaryPlaces([])
      return
    }
    const { data, error } = await supabase
      .from('diary_places')
      .select('id, google_place_id, name, lat, lng, visited_on, rating, notes')
      .eq('diary_id', selectedDiaryId)
    if (!error) setDiaryPlaces(data ?? [])
  }, [selectedDiaryId])

  useEffect(() => {
    void loadDiaryPlaces()
  }, [loadDiaryPlaces])

  // Auto-pick the diary when there's only one, so there's nothing to choose.
  useEffect(() => {
    if (diaries.length === 1) {
      setSelectedDiaryId(diaries[0].id)
    } else if (diaries.length === 0) {
      setSelectedDiaryId(null)
    } else if (selectedDiaryId && !diaries.some((d) => d.id === selectedDiaryId)) {
      setSelectedDiaryId(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diaries])

  const selectedDiaryName =
    diaries.find((d) => d.id === selectedDiaryId)?.name ?? null

  const handlePlaceSelect = (place: PickedPlace) => {
    setPicked(place)
    setInfoOpen(true)
  }

  // Clicking a point-of-interest icon directly on the map shows the same
  // popup as picking one from the search box.
  const handleMapClick = async (event: MapMouseEvent) => {
    const placeId = event.detail.placeId
    if (!placeId || !placesLibrary) return
    event.stop() // suppress Google's own default POI card

    const place = new placesLibrary.Place({ id: placeId })
    await place.fetchFields({ fields: [...PLACE_FIELDS] })
    const clickedPlace = toPickedPlace(place)
    if (clickedPlace) handlePlaceSelect(clickedPlace)
  }

  // Avoid a duplicate pin for the place currently being searched/saved.
  const persistentPlaces = diaryPlaces.filter(
    (dp) => dp.google_place_id !== picked?.placeId,
  )

  const focusedPlace = diaryPlaces.find((dp) => dp.id === focusedPlaceId) ?? null

  const handleSidebarEntryClick = (dp: SavedPlace) => {
    setFocusedPlaceId(dp.id)
    if (picked?.placeId === dp.google_place_id) {
      setInfoOpen(true) // it's the currently-searched marker, not a saved one
    } else {
      setOpenSavedPlaceId(dp.id)
    }
  }

  return (
    <div className="location-picker">
      <header className="location-picker-header">
        <h1>Find a location</h1>
        <div className="location-picker-controls">
          <PlaceAutocomplete onPlaceSelect={handlePlaceSelect} />
          {!diariesLoading && (
            <label className="diary-select">
              Diary
              {diaries.length === 0 ? (
                <span className="place-info-hint">
                  <Link to="/diaries">Create a diary</Link> to get started.
                </span>
              ) : (
                <select
                  value={selectedDiaryId ?? ''}
                  onChange={(e) => setSelectedDiaryId(e.target.value || null)}
                >
                  {diaries.length > 1 && (
                    <option value="" disabled>
                      Choose a diary…
                    </option>
                  )}
                  {diaries.map((diary) => (
                    <option key={diary.id} value={diary.id}>
                      {diary.name}
                    </option>
                  ))}
                </select>
              )}
            </label>
          )}
        </div>
      </header>

      <div className="location-picker-body">
        <div className="map-container">
          <Map
            defaultCenter={DEFAULT_CENTER}
            defaultZoom={DEFAULT_ZOOM}
            gestureHandling="greedy"
            disableDefaultUI={false}
            onClick={handleMapClick}
          >
            <MapController place={picked} focusPlace={focusedPlace} />

            {persistentPlaces.map((dp) => (
              <SavedPlaceMarker
                key={dp.id}
                place={dp}
                isOpen={openSavedPlaceId === dp.id}
                onOpen={() => setOpenSavedPlaceId(dp.id)}
                onClose={() => setOpenSavedPlaceId(null)}
                onChanged={loadDiaryPlaces}
              />
            ))}

            {picked && (
              <Marker
                ref={markerRef}
                position={{ lat: picked.lat, lng: picked.lng }}
                onClick={() => setInfoOpen(true)}
              />
            )}

            {picked && infoOpen && marker && (
              <InfoWindow anchor={marker} onCloseClick={() => setInfoOpen(false)}>
                <PlaceInfo
                  key={picked.placeId}
                  place={picked}
                  selectedDiaryId={selectedDiaryId}
                  selectedDiaryName={selectedDiaryName}
                  diaryCount={diaries.length}
                  onSaved={loadDiaryPlaces}
                />
              </InfoWindow>
            )}
          </Map>
        </div>

        {selectedDiaryId && (
          <aside className="diary-places-sidebar">
            <h2>{selectedDiaryName}</h2>
            {diaryPlaces.length === 0 ? (
              <p className="empty-note">
                No places yet — search or click the map to add one.
              </p>
            ) : (
              <ul>
                {diaryPlaces.map((dp) => (
                  <li
                    key={dp.id}
                    className={
                      focusedPlaceId === dp.id
                        ? 'diary-place-card diary-place-card-active'
                        : 'diary-place-card'
                    }
                  >
                    <button
                      type="button"
                      className="diary-place-card-button"
                      onClick={() => handleSidebarEntryClick(dp)}
                    >
                      <PlaceThumbnail googlePlaceId={dp.google_place_id} />
                      <div className="diary-place-card-info">
                        <strong>{dp.name}</strong>
                        {dp.rating && <StarRatingDisplay value={dp.rating} />}
                        {dp.notes && (
                          <p className="diary-place-card-notes">{dp.notes}</p>
                        )}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </aside>
        )}
      </div>
    </div>
  )
}

/** A persistent marker for a place already saved to the selected diary. */
function SavedPlaceMarker({
  place,
  isOpen,
  onOpen,
  onClose,
  onChanged,
}: {
  place: SavedPlace
  isOpen: boolean
  onOpen: () => void
  onClose: () => void
  onChanged: () => void
}) {
  const [markerRef, marker] = useMarkerRef()

  return (
    <>
      <Marker
        ref={markerRef}
        position={{ lat: place.lat, lng: place.lng }}
        onClick={onOpen}
      />
      {isOpen && marker && (
        <InfoWindow anchor={marker} onCloseClick={onClose}>
          <SavedPlaceInfo place={place} onChanged={onChanged} onClose={onClose} />
        </InfoWindow>
      )}
    </>
  )
}

export function LocationPickerScreen() {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined

  if (!apiKey) {
    return (
      <p>
        Missing <code>VITE_GOOGLE_MAPS_API_KEY</code>. Add it to{' '}
        <code>.env.local</code> and restart the dev server.
      </p>
    )
  }

  return (
    <APIProvider apiKey={apiKey}>
      <LocationPicker />
    </APIProvider>
  )
}
