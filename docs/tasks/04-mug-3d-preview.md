# 04 — 3D mug preview

**Branch:** `feat/mug-3d` · **Suggested owner:** Lead dev or a second Claude Code session

## Goal

A `<MugPreview textureUrl baseColor />` component that wraps the flat design around a
3D 11oz mug the customer can rotate with a finger, and use it on the Preview screen.

## You may edit

- `src/features/preview-3d/` (scenes, materials, hooks, components)
- `public/models/mug-11oz.glb` (+ textures in `public/textures/`)
- `src/features/editor/components/design-preview.tsx` — **only** to swap the flat `<img>`
  for the lazily-loaded `<MugPreview>` (keep the flat image as the loading fallback)
- `tests/e2e/preview-3d.spec.ts`

## Do not touch

`src/features/preview-3d/types.ts` (contract), the editor engine/hooks.

## Contract

`MugPreviewProps` in `src/features/preview-3d/types.ts`. The texture is the image from
`renderDesignToDataUrl` (see `tests/fixtures/design-mug-preview.png`) — aspect 216:89,
left edge and right edge meet at the handle, centre = front of the mug.

## Requirements

- `three` + `@react-three/fiber` + `@react-three/drei`, loaded with `next/dynamic` +
  `ssr: false` **only** on the Preview screen. They must not appear in the editor's bundle.
- Model: GLB with Draco, < 1.5 MB total with textures. UV the printable band so the texture
  maps 1:1 onto the wrap area (not the handle, rim or base). If buying/downloading a
  model, check the licence allows commercial use.
- Glossy white ceramic look (MeshPhysicalMaterial, clearcoat), soft studio lighting,
  one contact shadow. Start facing the front (texture centre).
- Drag to rotate around the vertical axis only; no zoom on phones. Respect
  `prefers-reduced-motion` (no idle spin).
- Dispose geometries, materials and textures on unmount. Cap DPR at 2.
- Fallback to the flat image if WebGL is unavailable or the model fails to load.

## Acceptance criteria

- 60 fps target on a mid-range Android (test on the founder's phone); acceptable ≥ 30 fps.
- The editor page's initial JS stays < 200 KB gz (check with the method in `CLAUDE.md`).
- E2E test: Preview screen shows a canvas, and falls back to the image when WebGL is disabled.
- `pnpm check` + `pnpm e2e` green.
