-- Free-text commentary for a diary (trip notes, description, etc).
alter table public.diaries
  add column commentary text;
