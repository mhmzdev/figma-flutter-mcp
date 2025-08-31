## Figma-Framework MCP
Since [Figma Context MCP](https://github.com/gLips/Figma-Context-MCP/) is framework‑agnostic, it does not output code or artifacts tailored to React, Angular, Vue, Flutter, etc. This repository adds a concrete implementation for Flutter (see `docs/figma-flutter-mcp.md`) and documents how to adapt the same architecture to any other framework.

### What you get out of the box
- **Extractors (framework‑agnostic):** Parse Figma nodes into consistent, rich, typed models for components, screens, colors, and typography.
- **Framework tools (Flutter today):** Wrap extractors, add framework‑specific heuristics, asset export, guidance, and code generation.
- **CLI/MCP entry points:** Commands and tools to analyze Figma nodes and generate artifacts into a project.

## Architecture overview

### 1) Extractors (framework‑agnostic core)
Extractors live under `src/extractors/` and work the same regardless of the target framework. They are responsible for traversing Figma nodes and producing structured analysis results that downstream tools can consume.

- **Components:** `src/extractors/components/`
  - Entry points: `analyzeComponent`, `analyzeComponentWithVariants`
  - Outputs `ComponentAnalysis` with metadata, layout, styling, children, nested components, and variants when applicable.
- **Screens:** `src/extractors/screens/`
  - Entry point: `analyzeScreen`
  - Outputs `ScreenAnalysis` with sections (header/content/footer/navigation), assets, and nested components.
- **Colors:** `src/extractors/colors/`
  - Entry points: `extractThemeColors`, `extractColorsFromThemeFrame`
  - Outputs normalized theme color swatches.
- **Typography:** `src/extractors/typography/`
  - Entry point: `extractThemeTypography`
  - Outputs normalized text styles with font family, size, weight, and line height.

These modules use Figma API types (e.g., `FigmaNode`, `FigmaColor`, `FigmaEffect`) and heuristics (e.g., `node.type === 'TEXT' | 'FRAME' | 'COMPONENT'`) to create consistent data across frameworks. The output types are intentionally neutral so they can be mapped to any target tech stack.

> ⚠️ You can add more in the list if the targeted framework needs it.

### 2) Framework tools (target‑specific glue)
Tools live under `src/tools/<framework>/` and are responsible for turning extractor outputs into actionable, framework‑specific results (code, guidance, assets, configuration). For Flutter these are under `src/tools/flutter/`.

Tools typically do the following:
- **Orchestrate extractors** (call `analyzeComponent`, `analyzeScreen`, etc.).
- **Apply classification** (e.g., treat `COMPONENT`/`INSTANCE` as reusable widgets; treat `FRAME` as a screen).
- **Map design semantics** to framework widgets/components (containers, text, icons, layout primitives).
- **Generate code or guidance** (e.g., Flutter widget tree suggestions in `src/tools/flutter/components/helpers.mts`).
- **Export assets** and update project manifests (images, SVGs, `pubspec.yaml` for Flutter).
- **Integrate theming** by referencing color schemes and text themes rather than hardcoding styles when possible.

In other words, extractors give you high‑quality design insights; tools translate those insights into framework‑specific outputs.

## 📝 Porting to a new framework (React, React Native, Angular, Vue)

The fastest path is to keep the extractors intact and replace the Flutter‑specific tools with your framework’s equivalents.

### Folder layout
- Create `src/tools/react/` (or `react-native`, `angular`, `vue`).
- Add submodules as needed, mirroring the Flutter structure:
  - `components/` (analyze and generate component code)
  - `screens/` (analyze frames as screens/pages)
  - `assets/` (export images/SVGs and manage paths)
  - `theme/` (map colors/typography to your framework’s theming system)
  - `helpers.mts` (framework‑specific guidance and code snippets)

### Minimal tool set to implement
- A tool to analyze a component or component set (wraps `analyzeComponent` and optionally variant handling).
- A tool to analyze a full screen (wraps `analyzeScreen`).
- Optional generators to emit framework code:
  - React: `.tsx` components in `src/components/`, pages in `src/pages/` or routes.
  - React Native: `.tsx` components using `View`, `Text`, `Image`, `StyleSheet`.
  - Angular: `.ts/.html/.scss` with schematics for components and modules.
  - Vue: `.vue` Single File Components with `<template>`, `<script>`, and `<style>`.

### Mapping guidelines (how to translate extractor output)
- **Layout**
  - Auto‑layout (direction + spacing) → React/React Native: `display: flex; flexDirection: row|column; gap/margins`; Angular/Vue: templates + CSS.
  - Absolute/stacked → React/React Native: `position: 'absolute'`/wrapper; Angular/Vue: positioned containers.
- **Styling**
  - Fills, strokes, corner radii, shadows → map to CSS/CSS‑in‑JS/StyleSheet equivalents.
  - Effects (`DROP_SHADOW`, `INNER_SHADOW`, blurs) → CSS `box-shadow`, `filter`, or platform‑specific fallbacks.
- **Text**
  - Use `textInfo` to choose the right semantic component (e.g., `h1/h2`, `Button`, `Link`) or apply a `Text` with style.
- **Components vs screens**
  - Treat `COMPONENT`/`INSTANCE` as reusable components.
  - Treat `FRAME` as a screen/page (with a child‑count threshold if you adopt the same heuristic as Flutter tools).
- **Theming**
  - Reference theme tokens (colors/typography) instead of hardcoding styles. For React, prefer ThemeProvider (e.g., MUI, styled‑components, or your design system).
- **Assets**
  - Export images/SVGs and write importable paths using your framework’s conventions (e.g., `public/` for Vite/Next.js, Android/iOS asset catalogs for React Native).

### Example: replacing Flutter guidance with React guidance
Flutter’s helper (`src/tools/flutter/components/helpers.mts`) produces guidance like "Use Row/Column" or `BoxDecoration` for containers. For React, your equivalent helper would:

- Recommend `div`/`section` structure with `display: flex` and `flexDirection`.
- Map paddings/margins/spacing to CSS or a CSS‑in‑JS solution.
- Suggest semantic elements for headings/links/buttons.
- Show small code snippets using your preferred stack (e.g., React + CSS Modules or styled‑components).

Example guidance output snippet (React):

```tsx
// Container layout
<div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 16 }}>
  {/* ...children */}
</div>
```

### Code generation (optional but recommended)
Just like the Flutter tools can emit widgets, you can add a lightweight generator to create files and wire imports:

- **React**
  - Components → `src/components/<PascalName>/<PascalName>.tsx`
  - Screens/Pages → `src/pages/<kebab-name>.tsx` (or Next.js routes)
  - Styles → collocate via CSS Modules, styled‑components, Tailwind, etc.
- **React Native**
  - Components → `src/components/<PascalName>.tsx`
  - Use `StyleSheet.create({...})` for styles. Map shadows/radius/fills accordingly.
- **Angular**
  - Use schematics to scaffold `component.ts/html/scss` and update module declarations.
- **Vue**
  - Generate `.vue` SFCs with `<template>` mapped from layout and `<style>` from styling info.

### Assets and theme integration
- Reuse color/typography extractors to populate your theme tokens.
- Export image/SVG assets and centralize paths/constants for your framework.
- Keep asset policies explicit (e.g., which scales to export, where to write constants) and append new entries rather than overwriting existing ones.

### Suggested workflow to add a new framework
1. Create `src/tools/<framework>/` with `components/`, `screens/`, `assets/`, `helpers.mts`.
2. Wrap extractors (`analyzeComponent`, `analyzeScreen`) and print a minimal analysis report.
3. Add guidance helpers that output idiomatic snippets for your framework.
4. Add asset export and theme token mapping.
5. (Optional) Add code generation and a small registry to prevent duplicate components.
6. Register your tools in `src/tools/index.mts` so they’re available via MCP/CLI.
7. Update docs with usage examples and flags.

## 🤨 FAQs

### What is the role of extractors?
Extractors are the framework‑agnostic heart of the system. They convert Figma data into structured, typed models (components, screens, colors, typography) that downstream tools can map to any framework without re‑implementing Figma traversal.

### What is the role of tools?
Tools are the framework‑specific bridge. They orchestrate extractors, apply heuristics (e.g., classify component vs screen), generate guidance or code, export assets, and integrate with a project’s conventions (file layout, theming, configuration).

### I’m building for React. What do I change?
- Do not modify extractors.
- Create `src/tools/react/` with your own helpers and generators.
- Replace Flutter‑specific guidance with React guidance (flexbox, semantic HTML, CSS‑in‑JS, etc.).
- Implement asset export paths and theme references that match your React app setup.

If you’d like a concrete Flutter reference, see `src/tools/flutter/components/helpers.mts` and `src/tools/flutter/screens/screen-tool.mts` and mirror their responsibilities for your framework.

---

If you fork this repository to support another framework (React, React Native, Angular, Vue), please keep it open source so others can build on top of the extractor core and share improvements to the tooling layers.