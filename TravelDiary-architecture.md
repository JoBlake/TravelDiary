# TravelDiary Architecture Recommendations

Based on `TravelDiary-spec.md`. Cost figures are ballpark USD per month; verify against vendor pricing pages before committing.

## Requirements Summary
- Document and share locations and experiences within a community of friends.
- Use Google Maps to identify locations.
- User accounts and user management.
- Central storage for locations, comments, reviews and photos.
- Browser-only access with no installs.

The data model is small: User, Place (Google `place_id` plus lat/lng), Entry (visit or review, with rating and text), Comment and Photo. Photos are the only part with real infrastructure weight.

## Architecture Options

| | **A. Serverless BaaS**<br>React/Next SPA + Firebase or Supabase | **B. Traditional full-stack**<br>Node or .NET API + Postgres + blob storage | **C. Next.js on a managed platform**<br>Vercel + Supabase or Neon + S3/R2 |
|---|---|---|---|
| **Auth** | Built in (email, Google sign-in) | You build it or add a library | Auth.js or Supabase Auth |
| **Photos** | Built-in storage with CDN | S3 or Azure Blob, which you wire up | R2 or S3 with signed uploads |
| **Time to first version** | Fastest | Slowest | Fast |
| **Cost for a friend group** | Free tier is likely enough | A small VM or app service costs about $10-30/mo | Free tier is likely enough |
| **Control and portability** | Lower. Firebase locks you in more than Supabase, which is Postgres underneath. | Highest | Medium-high |
| **Ops burden** | Minimal | Highest (patching, backups, scaling) | Low |
| **Main drawback** | Security rules or row-level security must be written carefully. Firestore is awkward for relational queries. | Most code and maintenance for a hobby-scale app | Two or three vendors to manage |

## Recommendation
**Option A with Supabase**, or C if you want server-side rendering. Supabase gives you:
- Postgres, which fits the relational data.
- Auth, including Google sign-in, which suits Maps users.
- File storage.
- Row-level security, which is how you enforce "friends only".

Pair it with a **React + Vite (or Next.js) front end**. It runs in any browser, and can become a PWA later.

## Google Maps Notes
- Use the **Maps JavaScript API** with the **Places API (New)** autocomplete widget. Store the `place_id`, name, and lat/lng.
- Google's terms restrict caching Places content. Storing `place_id` is explicitly allowed. Refetch other details when needed.
- Restrict the API key by HTTP referrer, and set a budget alert. Maps is the only component that can cost real money.
- A free alternative is Leaflet with OpenStreetMap. It is less polished, but there is no billing risk.

## Cross-Cutting Decisions
1. **Community membership:** invite-only (invite codes or an approved email list) versus open signup. For "friends", invite-only is recommended.
2. **Visibility model:** start with one shared community, and add per-trip or per-group privacy later.
3. **Photos:** resize on the client before upload (about 1600px), store thumbnails, and serve through the CDN. Strip GPS EXIF data unless you intend to keep it, since it is a privacy concern.
4. **Hosting:** Vercel, Netlify or Cloudflare Pages for the front end, all with free tiers.
5. **Suggested build order:** auth and invites, then map with place picker, then entries, then photos, then comments and reviews.

## Cost Estimates

### Assumptions
- Each user uploads about 20 photos a month, resized to about 300 KB each.
- Each user has about 20 map sessions a month.
- **100 users:** about 2,000 map loads and 600 MB of new photos a month, roughly 7 GB after a year.
- **1,000 users:** about 20,000 map loads and 6 GB of new photos a month, roughly 70 GB after a year.

### Google Maps (same in every option)
Google gives free monthly usage per SKU, about 10,000 map loads and 10,000 autocomplete requests, then roughly $7 per 1,000 map loads.

| | 100 users | 1,000 users |
|---|---|---|
| Google Maps | **$0** | **$0-$100**. At or over the free tier, depending on how often people open the map. |
| OpenStreetMap + Leaflet | $0 | $0. Tile hosting may need a paid provider at higher volume, about $0-$25. |

### Backend and Hosting

| | **A. Supabase** | **A'. Firebase** | **B. Traditional** | **C. Vercel + Neon + R2** |
|---|---|---|---|---|
| **100 users** | **$0-$25**. Free tier fits, but it pauses after about a week of inactivity, so Pro at $25 is safer. | **$0-$5**. Storage needs the pay-as-you-go plan, but usage stays tiny. | **$20-$40** for a small VM, managed DB and storage | **$0-$5** |
| **1,000 users** | **$25-$50**. Pro includes 100 GB of storage. You may pay a little for extra egress. | **$10-$40**. Photo egress is the main cost driver. | **$40-$100** | **$20-$60**. Vercel Pro is $20 per seat, needed beyond hobby use. |
| **Your time** | Low | Low | High (patching, backups) | Low-medium |

### Total (backend plus Maps)

| | 100 users | 1,000 users |
|---|---|---|
| **A. Supabase** | $0-$25 | $25-$150 |
| **A'. Firebase** | $0-$5 | $10-$140 |
| **B. Traditional** | $20-$40 | $40-$200 |
| **C. Vercel + Neon + R2** | $0-$5 | $20-$160 |

### Cost Takeaways
- At under 100 users, nearly everything is free or under $25. Cost should not drive the decision. Ease of build and lock-in should.
- At about 1,000 users, Google Maps is the biggest variable cost. Photos are cheap if you resize on upload and use a CDN.
- Cloudflare R2 has no egress fees, which makes it the cheapest photo store if photo traffic grows. It can be paired with Supabase or Firebase.
- Option B costs the most in money and in time. It only makes sense if you want full control or already have infrastructure.
- Set a Google Cloud budget alert and a per-API quota cap on day one, so a bug or abuse cannot produce a surprise bill.

## Next Steps
Start on the Supabase free tier, move to Pro at $25 when launching to friends, and add an R2 photo bucket only if egress grows.

Open questions:
- Managed backend, or own everything?
- One shared community, or multiple groups?
- Is a small monthly Google Maps bill acceptable, or prefer OpenStreetMap?
