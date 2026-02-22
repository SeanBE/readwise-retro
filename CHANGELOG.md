# Changelog

## 2026-02-22

### Improved error handling UX

- Replaced modal error dialog with an inline error state inside the links box. When the API fails, all article links are hidden and replaced with the error message and a Retry button.
- Articles are now restored to the list when an archive call fails, preventing "lost" articles that reappear on next load.
- Removed automatic re-fetching when the article list empties. Articles are fetched once on page load only, fixing a race condition where the last article click would trigger a re-fetch before the archive call completed.
- Removed the article limit UI — the backend never respected the limit parameter.
