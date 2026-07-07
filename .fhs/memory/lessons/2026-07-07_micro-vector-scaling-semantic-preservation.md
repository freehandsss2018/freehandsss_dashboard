# CJK Emoji to SVG Conversion in Micro Layouts (Scaling & Semantic Preservation)

- Date: 2026-07-07
- Session: Session 153
- Category: Pitfall

## Symptom

When converting CJK emojis representing limb parts or material types (e.g. `🖐️ 左手` -> `icon-hand`, `👑 925金` -> `icon-crown`) to SVG line-art icons in micro layouts (12px to 16px badges), the icons appeared distorted, unrecognizable, or rendered as meaningless open curves (like simple hook contours or single diagonal lines). This completely ruined UI semantic readability.

## Root Cause

1. **Oversimplified Path Data**: The initial vector sprite paths for `icon-hand` and `icon-footprint` were over-simplified by earlier automated tools into single, unclosed, low-vertex line curves to reduce token weight. At small dimensions (like 12px), they lost all details and visual indicators of a hand (fingers) or foot.
2. **Incorrect Symbol Selection**: Emojis like `👑` (Gold crown) or `🧴` (Glass bottle) were mapped to unrelated generic icons like `icon-star` or `icon-smile` due to a lack of matching symbols in the SVG sprite block, resulting in wrong semantic icons.

## Prevention & Remediations

1. **Enclosed Multi-Path Standard Icons**: Always use standard, fully-enclosed, multi-path SVG definitions from established libraries (e.g. Lucide) for micro-icons. For example:
   - For hand (`icon-hand`), use the standard 4-path Lucide hand outline that renders all finger loops clearly even at 12px.
   - For foot (`icon-footprint`), use standard pair footprints that fit neatly and centrally on a 24x24 canvas.
2. **Dynamic UI innerHTML Injection**: When updating dynamic status text labels, use `.innerHTML` instead of `.textContent` to correctly copy inline SVG `<svg><use href="..."/></svg>` markup across containers (e.g. from table buttons to modal buttons).
3. **Explicit SVGs in Dimension Parsers**: Modify structural dimension parsers (e.g., `getProductDimensions`) to return standard HTML-wrapped `<svg>` tags directly alongside strings, ensuring that all dynamic layouts render vector graphics uniformly.
