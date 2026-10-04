# Design system: Atlys admin destinations

## Product
Visa operations console for an Atlys-style site. The destinations screen (`/en-EG/admin/destinations`) manages every public visa page: name, slug, fees, documents, official sources, visibility, card image, cover image, flag, and a destination video. Arabic labels. The admin shell stays left-to-right. Do not restyle the public marketing site, header, or footer.

## Job
An operator finds one destination among about 55, edits it without a wall of fields, and replaces its images and video by uploading files instead of pasting URLs.

## Color
Use only these values:
- Ink #000000 for titles and primary text
- Muted #69727B for descriptions and secondary labels
- Slate #728197 for group labels
- Hairline #E0E0E0 for borders
- Strong line #D6D9DC for input borders
- Surface #F8FAFC for quiet panels and inactive chips
- White #FFFFFF for page and cards
- Brand indigo #5057EA for the primary action, active nav, and selected row
- Brand wash #F1F2FD for the active nav and selected list row
- Brand deep #1D24B7 for wash text
- Success #35CC6D for a visible destination
- Warning #FFD873 for a light status only
- Danger text #B91C1C on #FEF2F2, danger border #FECACA

No purple gradients, no neon, no new accent colors.

## Type
- Titles: Outfit, weight 600
- Body and forms: Inter, 14px
- Do not introduce serif, display, or other families on this screen
- Arabic titles have normal letter-spacing

## Shape
- Page title is 30px
- Cards: white, 1px hairline, 16px radius, 20px padding, no heavy shadow
- Inputs: 40px tall, 8px radius, white, hairline border, label above
- Buttons: full pills. Save is indigo with white text. Secondary is white with a hairline. Delete is white with a red border and red text.
- Sidebar width 224px. Active item: wash background, indigo text, 8px radius.

## Motion
Keep motion quiet. A selected row and an uploaded preview can fade in. No page-load theatrics, no parallax, no custom cursor.

## Current destinations screen (ground truth)
Admin shell: left nav groups التشغيل / المحتوى / الإدارة. الوجهات is the active content item.
Main column:
- Title الوجهات and a short description
- Black pill إضافة وجهة
- Search input and three pills: الكل، الظاهرة، المخفية
- A wrapping row of many destination-name pills. The selected pill is indigo.
- One white card with a two-column form: name, slug, country code, region, visa type select, stay, validity, entry, ports, method, government fee, service fee, processing hours, express hours, express fee, sort, card image URL, cover URL, flag URL, a small image preview, documents, cities, official sources textarea (`name | url`), rejection reasons textarea, two checkboxes, حفظ and حذف.
This is dense and hard to scan. The redesign changes structure, not the brand.

## Redesign direction for later iterations
A master-detail workspace inside the same shell:
- Left: search, visibility filters, and a vertical list of destinations. Each row shows the flag or card thumbnail, name, country code, visa type, and a visible/hidden mark.
- Right: the selected destination, with a live page link. Sections, not one long grid: basics, fees and timing, media, documents and sources.
- Media section: three upload tiles (card image, cover image, flag) with previews, plus one video tile that accepts an uploaded file and shows a preview player. Empty tiles are dashed drop areas. A text URL remains as a fallback under each tile.
- Adding a destination opens the same detail pane empty, with the media tiles ready.

## Must stay
Existing Arabic copy for fields. Same admin nav. Same indigo pills and hairline cards. Public site look is out of scope.
