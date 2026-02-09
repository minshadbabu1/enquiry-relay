

## Show Truncated PDF Links in Admin Panel

### What Changes

**File: `src/components/admin/EnquiriesTab.tsx`**

- When displaying or copying the PDF URL, show a truncated/friendly version in the table (e.g., `order-form.pdf`) while keeping the full URL for the "View" link and "Copy" button.
- Add a small text display next to the View/Copy buttons showing just the filename portion (`order-form.pdf`) or a short ID-based label like `PDF-9f74...` so it's easy to identify at a glance.
- The copy button will still copy the full working URL to clipboard.

### Details

- Extract the last segment of the PDF URL to display as a short label
- Show it as a compact, readable reference in the PDF column
- No backend changes needed -- this is purely a UI formatting change

