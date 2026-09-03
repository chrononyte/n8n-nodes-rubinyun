# Changelog

## 0.1.1

Same code as 0.1.0, published from GitHub Actions with npm provenance (the way n8n asks for verified community nodes).

## 0.1.0

First release.

- Credential `Rubinyun API` (key + secret, sent as `X-WS-Key` / `X-WS-Secret`), with a connection test on `action=ping`.
- Node `Rubinyun`: Post (create, update, delete, retry, get many), Channel (get many), Best Time (get), Queue (run now), Insight (get), Account (get).
- Refusals keep the API's stable `code` in front of the message.
