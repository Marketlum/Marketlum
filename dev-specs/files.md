## Claude Code Spec — Files Module (Media Library like WordPress)

### Goal

Implement a **Files** management module similar to **WordPress Media Library**, where users can:

* Upload files (drag & drop, multi-upload)
* Organize files into **folders** (hierarchical)
* Browse, search, filter, sort files
* Preview files (image/pdf/video/audio/other)
* Perform **basic image editing** (crop, remove color/grayscale, resize) for images only
* Use files as attachments in other modules (e.g., Agreements)

This module must be usable as a standalone “Media Library” UI.

---

# 1) Core Concepts

## Entities

### Entity: `Folder`

Fields:

* `id: UUID`
* `name: string` *(required, 1–120 chars)*
* `parentId: UUID | null` *(null = root folder)*
* `createdAt: datetime`
* `updatedAt: datetime`

Constraints:

* `name` unique per `parentId` (case-insensitive)
* Prevent cycles

---

### Entity: `FileUpload`.

Fields:

* `id: UUID`
* `folderId: UUID | null` *(null = root)*
* `originalName: string` *(required)*
* `fileName: string` *(required, internal storage name)*
* `mimeType: string` *(required)*
* `sizeBytes: number` *(required)*
* `width: number | null` *(images only)*
* `height: number | null` *(images only)*
* `checksum: string | null` *(optional, for dedupe)*
* `storageProvider: "local" | "s3"` *(configurable)*
* `storageKey: string` *(path/key)*
* `url: string` *(public or signed URL)*
* `thumbnailUrl: string | null` *(images only, generated)*
* `altText: string | null`
* `caption: string | null`
* `tags: string[]` *(optional; can be omitted for MVP)*
* `isArchived: boolean` *(optional; default false)*
* `createdAt: datetime`
* `updatedAt: datetime`

Notes:

* For non-image files: `width/height/thumbnailUrl = null`
* `url` should be usable in frontend for preview/download

---

# 2) Backend API

## Uploading

### 2.1 Upload file(s)

`POST /files/upload`

* multipart/form-data
* fields:

  * `files[]` (multiple)
  * `folderId` (optional)

Response:

```json
{
  "uploaded": [
    {
      "id": "...",
      "originalName": "logo.png",
      "mimeType": "image/png",
      "sizeBytes": 12345,
      "folderId": null,
      "url": "...",
      "thumbnailUrl": "...",
      "width": 512,
      "height": 512
    }
  ],
  "failed": [
    { "originalName": "bad.exe", "reason": "File type not allowed" }
  ]
}
```

Validation:

* Max file size configurable (e.g. 25MB default)
* Allowed MIME types configurable
* Virus scanning optional (out of scope for MVP)

---

## Browsing / Library

### 2.2 List files (media library grid)

`GET /files`
Query params:

* `folderId` (optional; null = root)
* `q` (search by name/caption/altText)
* `mimeGroup` (optional): `image | video | audio | pdf | doc | other`
* `sort` (default `createdAt_desc`)
* `page`, `pageSize`

Returns:

```json
{
  "data": [FileUpload...],
  "total": 123
}
```

### 2.3 Get file details

`GET /files/:id`
Returns full metadata + optional variants.

### 2.4 Delete file

`DELETE /files/:id`
Behavior:

* soft delete (`isArchived=true`) OR hard delete (choose one; MVP can hard delete)
* if file is referenced by another entity (e.g. Agreement.fileId), return:

  * `409 Conflict` `"File is in use and cannot be deleted."`

### 2.5 Move file to folder

`POST /files/:id/move`
Body:

```json
{ "folderId": "uuid-or-null" }
```

### 2.6 Update file metadata

`PATCH /files/:id`
Body:

```json
{ "altText": "...", "caption": "...", "folderId": "..." }
```

---

## Folders

### 2.7 List folders as tree

`GET /folders/tree`
Returns:

```json
[
  { "id": "...", "name": "Root", "children": [...] }
]
```

### 2.8 Create folder

`POST /folders`
Body:

```json
{ "name": "Contracts", "parentId": null }
```

### 2.9 Rename folder

`PATCH /folders/:id`
Body:

```json
{ "name": "New name" }
```

### 2.10 Delete folder

`DELETE /folders/:id`
Rules:

* If folder has subfolders → block with 409
* If folder contains files → either:

  * block with 409 (recommended for safety), OR
  * allow delete and move files to root (explicitly decide)
    MVP: **block deletion if not empty**.

---

# 3) Image Editing API (Images Only)

## 3.1 Crop

`POST /files/:id/edit/crop`
Body:

```json
{
  "x": 10,
  "y": 20,
  "width": 200,
  "height": 200,
  "outputFormat": "png" // optional
}
```

## 3.2 Resize

`POST /files/:id/edit/resize`
Body:

```json
{
  "width": 512,
  "height": 512,
  "keepAspectRatio": true
}
```

## 3.3 Remove color (Grayscale)

`POST /files/:id/edit/grayscale`
Body:

```json
{ "mode": "grayscale" }
```

Response for edits:

```json
{
  "variantFile": {
    "id": "...",
    "originalName": "logo (edited).png",
    "mimeType": "image/png",
    "width": 512,
    "height": 512,
    "url": "...",
    "thumbnailUrl": "..."
  }
}
```

Validation:

* Only allow edits when `mimeType` starts with `image/`
* For crop: bounds must be within image dimensions

Implementation note:

* Use server-side image processing library (e.g., Sharp in Node.js)
* Store edited output as a new FileUpload 

---

# 4) Frontend Requirements (React, Media Library UI)

## Page: `/files`

Layout similar to WordPress:

* Left sidebar: **Folder Tree**
* Top bar: search, filters, upload button
* Main area: grid of files
* Right panel: details + preview for selected file

### 4.1 Folder Sidebar

* Tree view with:

  * Root (“All Media”)
  * Nested folders
* Actions:

  * New folder
  * Rename folder (inline)
  * Delete folder

### 4.2 Upload UX

* Primary button: **Upload**
* Drag & drop zone in main area
* Multi-upload supported
* Show upload progress per file
* On upload success: new items appear instantly in grid

### 4.3 Grid View

* Thumbnail cards for images
* Icon cards for non-images
* Each card shows:

  * thumbnail/icon
  * filename (truncated)
  * size
* Multi-select (shift/cmd) optional (nice-to-have)

### 4.4 Preview & Details Panel (Right)

When a file is selected, show:

* Preview:

  * image preview
  * pdf preview (embedded)
  * video/audio player (basic)
  * fallback: download link
* Metadata:

  * name
  * mime type
  * size
  * created date
  * folder
  * alt text + caption (editable)
* Actions:

  * Download
  * Move to folder
  * Delete
  * For images: **Edit Image**

---

# 5) Image Editor UI (Images Only)

Open “Edit Image” panel or route:

* `Crop` tool:

  * drag selection rectangle
  * apply crop
* `Resize` tool:

  * width/height inputs
  * keep aspect ratio toggle
* `Remove color` tool:

  * one click grayscale

Output handling:

* On save, create a **new edited file**
* Show “Edited version created” with option:

  * “Use this version”
  * “Keep original”
* Variants should appear in the same folder as original (default)

---

# 6) Integration With Other Modules

## Agreements module integration

* Agreement can reference one file:

  * `Agreement.fileId -> FileUpload.id`
* Agreement form should allow:

  * “Choose from Media Library”
  * “Upload new file”
* If file deleted and referenced:

  * block deletion with 409 conflict

---

# 7) Seed Data

## Seed folders

* `Contracts`
* `Brand`
* `Screenshots`
* `Product`

## Seed files

Provide sample placeholder files:

* `marketlum-logo.png` (Brand)
* `sample-agreement.pdf` (Contracts)
* `dashboard-screenshot.png` (Screenshots)

Seed behavior:

* idempotent
* if local dev: store seed files in repo under `/seed-assets/` and upload programmatically

Endpoint:
`POST /files/seed`

---

# 8) Sorting, Filtering, Search

## Sorting options

* Newest first (default)
* Oldest first
* Name A–Z / Z–A
* Largest / smallest

## Filtering options

* Images
* PDFs
* Video
* Audio
* Other

Search (`q`) matches:

* originalName
* caption
* altText

---

# 9) Error Handling & Edge Cases

* Upload unsupported file type → show inline error
* Upload too large → show error with max size
* Folder delete not empty → 409 with message:
  `"Folder is not empty. Move or delete its contents first."`
* Image edit on non-image → 400:
  `"Editing is only supported for images."`
* File in use by other module → 409:
  `"File is in use and cannot be deleted."`

---

# 10) Testing Requirements

## Backend

* upload file → creates FileUpload
* list files with folder filter
* create folder tree and move file
* delete blocked if file referenced
* crop/resize/grayscale create variant

## Frontend

* upload flow works (drag/drop + button)
* folder create/rename/delete rules
* selecting file shows preview and metadata editing
* image edit creates new variant and updates grid

---

# 11) Acceptance Criteria

* Users can upload files and browse them in a media-library grid.
* Users can create folders and move files between folders.
* Users can preview common file types.
* Users can edit images (crop, grayscale, resize) producing new files.
* Files can be selected/attached from Agreements module.
* Seed data creates EU/USA-friendly sample assets and folders (idempotent).
