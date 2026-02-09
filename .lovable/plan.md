

## Update WATI Template Name

The database currently has the template name set to `admin_new_enquiry`, but the approved WATI template is `enquiry_notification`. 

### What needs to change

**1. Update the template name in the database**
- Run a SQL update to change `template_name` from `admin_new_enquiry` to `enquiry_notification` in the `wati_settings` table.

That's it -- the edge function already reads `settings.template_name` dynamically, so no code changes are needed. Once the database value is updated, WhatsApp messages will use the correct approved template.

### Technical Details

SQL to execute:
```sql
UPDATE wati_settings SET template_name = 'enquiry_notification';
```

No file changes required. The edge function (`send-whatsapp/index.ts`) already references `settings.template_name` on line 72, which will automatically pick up the new value.
