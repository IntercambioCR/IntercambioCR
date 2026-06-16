# Supabase Storage

Create these buckets:

- `listing-images`: public read, authenticated uploads.
- `intake-images`: private, only owner and admins can read.
- `chat-images`: private, only purchase participants can read.
- `Avatars`: public read, authenticated uploads.

You can create them manually in the Supabase dashboard or run
`supabase/storage-policies.sql` after `supabase/schema.sql`.

Recommended image rules:

- Minimum 3 photos for marketplace listings.
- Required angles: front, back or side, defect closeup if applicable.
- High-value electronics require proof of function photo or short video.
- Block screenshots, stock images and watermarked images during admin review.
