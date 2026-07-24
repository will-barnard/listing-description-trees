---
name: listing-trees
description: >
  Read and edit product description trees in the Listing Trees app, which is the
  single source of truth for listing copy. Use this whenever the user wants to
  pull, review, generate, or update description "trees" or "nodes" (labels + copy)
  for online listings, or is about to push listing copy to Shopify. Always read
  the current tree from the app before editing, and write changes back to the app
  — never treat a local JSON file as the master copy.
---

# Listing Trees integration

Listing Trees is a web app that stores **description trees** for online product
listings. Each tree is a nested set of **nodes**; every node has a `label` and
optional `copy` (the description text). This app is the **single source of
truth** for listing copy. Local JSON files are only ever throwaway scratch — do
not treat them as canonical.

## Golden rules

1. **Read before you write.** Always `GET` the current tree/node from the app
   before changing it, so you never overwrite newer edits with stale data.
2. **Write back to the app.** Persist every change via the API (`import`, `POST`,
   `PUT`). Do not hand the user a JSON file and call it done.
3. **The app is upstream of Shopify.** When pushing to a store, read copy from
   Listing Trees first, then use the Shopify tools to update the listing. If they
   diverge, Listing Trees wins unless the user says otherwise.
4. **Confirm destructive actions.** `DELETE` on a node cascades to its children.
   Confirm with the user before deleting a tree or a node with children.

## Setup / auth

The app authenticates programmatic clients with a Bearer API token. Configure two
values (either as environment variables or in `config.json` next to this skill —
copy `config.example.json`):

- `LISTING_TREES_URL` — base URL of the app, e.g. `https://trees.example.com`
- `LISTING_TREES_TOKEN` — the API token (matches `API_TOKEN` in the app's env)

Every request sends `Authorization: Bearer $LISTING_TREES_TOKEN`. To mint a
token, the app owner runs `openssl rand -hex 32` and sets it as `API_TOKEN` in
the backend environment (comma-separate multiple tokens to rotate).

## Helper CLI

`scripts/lt.mjs` wraps auth and the common calls. Run with Node 18+:

```bash
node scripts/lt.mjs trees                       # list all trees
node scripts/lt.mjs tree <treeId>               # get a tree with all nodes
node scripts/lt.mjs import <file.json>          # create a tree from nested JSON
node scripts/lt.mjs node <nodeId>               # get one node
node scripts/lt.mjs update-node <nodeId> --copy "New copy" [--label "New label"]
node scripts/lt.mjs create-node --tree <id> [--parent <id>] --label "..." [--copy "..."]
node scripts/lt.mjs children --tree <id> [--parent <id>]
node scripts/lt.mjs templates                   # list node templates
```

Anything the CLI doesn't cover, call the REST API directly with `curl` using the
same base URL and Bearer header (see reference below).

## Data shapes

A **tree**: `{ id, name, description, created_by, created_at, updated_at }`.
`GET /api/trees/:id` also returns `nodes: [{ id, parent_id, label, copy, sort_order }]`
(flat list; reconstruct the hierarchy via `parent_id`).

The **import** shape (nested — this is what to generate for a brand-new tree):

```json
{
  "name": "Acme Widget",
  "description": "optional",
  "nodes": [
    {
      "label": "Overview",
      "copy": "Top-level description copy...",
      "children": [
        { "label": "Materials", "copy": "..." },
        { "label": "Dimensions", "copy": "..." }
      ]
    }
  ]
}
```

## REST reference

Base path `/api`. All routes below require the Bearer token.

Trees:
- `GET  /api/trees` — list trees
- `GET  /api/trees/:id` — tree + all nodes
- `POST /api/trees` — create empty tree `{ name, description? }`
- `POST /api/trees/import` — create tree with nested nodes (shape above)
- `PUT  /api/trees/:id` — update `{ name, description? }`
- `DELETE /api/trees/:id` — delete tree (cascades to all nodes)

Nodes:
- `GET  /api/nodes/children?tree_id=&parent_id=` — children (omit `parent_id` for roots)
- `GET  /api/nodes/:id` — one node
- `POST /api/nodes` — create `{ tree_id, parent_id?, label, copy?, sort_order? }`
- `POST /api/nodes/batch` — create many under one parent `{ tree_id, parent_id?, nodes: [...] }`
- `PUT  /api/nodes/:id` — update `{ label?, copy?, sort_order? }` (partial)
- `PUT  /api/nodes/:id/move` — reparent `{ new_parent_id }`
- `DELETE /api/nodes/:id` — delete node (cascades; returns deleted nodes for undo)

Templates:
- `GET  /api/templates` · `POST /api/templates` · `PUT /api/templates/:id` · `DELETE /api/templates/:id`

Health/config (no auth): `GET /api/health`, `GET /api/config`.

## Typical workflows

**Update copy for an existing listing**
1. `node scripts/lt.mjs tree <id>` to load current tree + nodes.
2. Draft the new copy for the relevant node(s).
3. `node scripts/lt.mjs update-node <nodeId> --copy "..."` for each change.
4. Re-fetch to confirm, then (if asked) push to Shopify with the Shopify tools.

**Create a new listing tree**
1. Build the nested import JSON.
2. `node scripts/lt.mjs import tree.json`.
3. Report the new tree id and node count.
