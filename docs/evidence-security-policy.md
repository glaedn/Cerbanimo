# Evidence Security Policy

## Uploads

Uploaded images and documents are decoded strictly, MIME-sniffed from bytes, bounded by size, and stored using the sniffed type. Images are normalized and re-encoded through the configured sanitizer. SVG, executable content, archives, macros, unknown binaries, and mismatched types are rejected.

## URL Snapshots

URL evidence uses a reserve/fetch/finalize flow so network I/O does not hold evidence row locks. Fetching blocks localhost, private networks, reserved addresses, credentialed URLs, unsafe redirects, and unsupported media.

DNS resolution is pinned through `EvidenceNetworkResolver` and `EvidenceHttpTransport`. The timeout covers DNS, connect, headers, redirects, and the full streamed body.

HTML snapshots default to inert extracted text. Scripts, styles, iframes, objects, embeds, SVG, forms, templates, meta refresh, and active elements are not rendered.

## Visibility

Public task visibility is not raw evidence visibility. Public viewers and unrelated members receive summaries only. Raw content access is explicit, scoped, and audited.
