-- User's own 1-5 star rating for a saved place.
alter table public.diary_places
  add column rating integer check (rating between 1 and 5);

-- Prevent the same place being added to the same diary twice; re-adding
-- an existing place is treated as an edit (upsert) instead.
alter table public.diary_places
  add constraint diary_places_diary_google_place_unique unique (diary_id, google_place_id);
