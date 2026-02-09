

## Fix PDF Generation -- Use pdf-lib for Proper Order Form

### Problem
The current PDF generator builds raw PDF bytes manually, producing a black/corrupt document. It also doesn't include all order details clearly.

### Solution
Replace the manual PDF builder with `pdf-lib`, a well-tested library that works in Deno via `esm.sh`. This will produce a clean, readable order form with all enquiry details and properly embedded images.

### Changes

**File: `supabase/functions/generate-pdf/index.ts`** -- Full rewrite

1. Import `pdf-lib` from `https://esm.sh/pdf-lib@1.17.1`
2. Replace the `buildPdf` function with `pdf-lib` API calls:
   - Create a new `PDFDocument`
   - Add a page (A4 size: 595 x 842)
   - Draw a styled header: "ORDER FORM / ENQUIRY DETAILS"
   - Draw all fields with labels in bold (using Helvetica-Bold) and values in regular font:
     - Name
     - Phone Number
     - District
     - Service
     - Square Feet Area
     - Requirements (with text wrapping for long content)
     - Submission Date
   - Draw a separator line between header and content
   - If images exist, embed each JPEG/PNG image on subsequent pages using `pdfDoc.embedJpg()` / `pdfDoc.embedPng()`, scaled to fit the page
3. Serialize with `pdfDoc.save()` which returns a proper `Uint8Array`
4. Keep the existing upload and URL update logic unchanged

### Technical Details

```text
Page 1: Order Details
+----------------------------------+
|  ORDER FORM / ENQUIRY DETAILS    |
|  ____________________________    |
|                                  |
|  Name:          John Doe         |
|  Phone:         9876543210       |
|  District:      Ernakulam        |
|  Service:       Interior Design  |
|  Area:          1200 sq.ft       |
|  Requirements:  Modern kitchen   |
|                 with island...   |
|  Date:          09/02/2026       |
|                                  |
|  Images:        3 attached       |
+----------------------------------+

Page 2+: One image per page (if any)
+----------------------------------+
|                                  |
|        [Embedded Image]          |
|                                  |
+----------------------------------+
```

**Key improvements:**
- Uses `pdf-lib` (proven library) instead of hand-crafted PDF bytes
- Embeds actual JPEG/PNG images into the PDF instead of placeholder references
- Includes all order fields with clear formatting
- Handles long requirement text with word wrapping
- White background with black text (fixes the "all black" issue)

