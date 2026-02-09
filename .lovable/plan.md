
# Interior Design Enquiry Form with WATI WhatsApp Integration

## Overview
A clean, minimal web app with a public enquiry form and a secure admin panel. Enquiries are sent to multiple WhatsApp numbers via WATI API and stored in a database for tracking.

---

## 1. Public Enquiry Form
- Clean, minimal form with fields: **Name**, **Mobile Number**, **Place**, **Sq Feet Area**
- Input validation (required fields, valid mobile number format, numeric sq feet)
- Success confirmation message after submission
- Mobile-responsive design

## 2. WhatsApp Notification via WATI
- On form submission, send enquiry details to all configured WhatsApp numbers simultaneously using WATI API
- Message will include all enquiry details formatted clearly
- Backend edge function to securely call WATI API (API key never exposed to browser)

## 3. Admin Panel (Login Protected)
- Simple email/password login to access admin area
- **Dashboard**: View all submitted enquiries in a table with date, name, mobile, place, sq feet, and delivery status
- **WhatsApp Numbers**: Add, edit, and remove recipient WhatsApp numbers (2-3+)
- **WATI Settings**: Configure WATI API endpoint and API key securely

## 4. Database (Lovable Cloud)
- **Enquiries table**: Stores all form submissions with timestamps
- **WhatsApp numbers table**: Stores recipient numbers
- **Settings table**: Stores WATI API credentials securely

## 5. Tech Approach
- Lovable Cloud for database, auth, edge functions, and secrets storage
- Edge function to handle WATI API calls securely
- Admin panel behind authentication
