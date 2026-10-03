export interface PickedPlace {
  placeId: string
  name: string
  lat: number
  lng: number
  address?: string
  rating?: number
  userRatingCount?: number
}

/** Fields fetched for both a search-box selection and a map-click selection. */
export const PLACE_FIELDS = [
  'displayName',
  'location',
  'id',
  'formattedAddress',
  'rating',
  'userRatingCount',
] as const

/** Maps a fetched Place (fetchFields already called) to our plain shape. */
export function toPickedPlace(place: google.maps.places.Place): PickedPlace | null {
  if (!place.location) return null
  return {
    placeId: place.id,
    name: place.displayName ?? 'Unnamed place',
    lat: place.location.lat(),
    lng: place.location.lng(),
    address: place.formattedAddress ?? undefined,
    rating: place.rating ?? undefined,
    userRatingCount: place.userRatingCount ?? undefined,
  }
}
