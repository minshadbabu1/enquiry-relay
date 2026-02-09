import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Simple PDF builder - creates a minimal valid PDF with text and images
function buildPdf(enquiry: any, imageDataList: { data: Uint8Array; mime: string; width: number; height: number }[]) {
  const objects: string[] = [];
  let objectCount = 0;
  const offsets: number[] = [];

  const newObj = (content: string) => {
    objectCount++;
    offsets.push(-1); // placeholder
    objects.push(content);
    return objectCount;
  };

  // We'll build a simple text-based PDF without embedded images for reliability
  // Instead we'll create a nicely formatted order form

  const lines: string[] = [];
  lines.push("ORDER FORM / ENQUIRY DETAILS");
  lines.push("========================================");
  lines.push("");
  lines.push(`Name: ${enquiry.name}`);
  lines.push(`Phone: ${enquiry.mobile}`);
  lines.push(`District: ${enquiry.district || enquiry.place || "N/A"}`);
  lines.push(`Service: ${enquiry.service || enquiry.place || "N/A"}`);
  lines.push(`Area: ${enquiry.sq_feet_area ? enquiry.sq_feet_area + " sq.ft" : "N/A"}`);
  lines.push(`Requirements: ${enquiry.requirements || "N/A"}`);
  lines.push(`Date: ${new Date(enquiry.created_at).toLocaleDateString()}`);
  lines.push("");
  lines.push("========================================");

  if (enquiry.image_urls && enquiry.image_urls.length > 0) {
    lines.push(`Attached Images: ${enquiry.image_urls.length}`);
    enquiry.image_urls.forEach((url: string, i: number) => {
      lines.push(`  Image ${i + 1}: ${url}`);
    });
  }

  // Build PDF content
  const pageWidth = 595;
  const pageHeight = 842;
  const margin = 50;
  const lineHeight = 16;
  const fontSize = 11;
  const titleFontSize = 18;

  // Build stream content
  let streamContent = "";
  let y = pageHeight - margin;

  // Title
  streamContent += `BT /F1 ${titleFontSize} Tf ${margin} ${y} Td (${escPdf(lines[0])}) Tj ET\n`;
  y -= lineHeight * 1.5;

  for (let i = 1; i < lines.length; i++) {
    if (y < margin) break;
    streamContent += `BT /F1 ${fontSize} Tf ${margin} ${y} Td (${escPdf(lines[i])}) Tj ET\n`;
    y -= lineHeight;
  }

  // Now add image pages if we have image data
  const pages: string[] = [streamContent];

  for (const imgData of imageDataList) {
    // Each image gets its own page
    const imgPage = buildImagePageStream(imgData, pageWidth, pageHeight, margin);
    pages.push(imgPage.stream);
  }

  // Now construct the PDF
  let pdf = "%PDF-1.4\n";

  // Catalog
  const catalogId = newObj(`<<\n/Type /Catalog\n/Pages 2 0 R\n>>`);

  // Build page tree after we know how many pages
  const totalPages = pages.length;
  const imageObjIds: { streamId: number; xobjId: number }[] = [];

  // Font
  const fontId = newObj(`<<\n/Type /Font\n/Subtype /Type1\n/BaseFont /Helvetica\n>>`);

  // Image XObjects
  for (const imgData of imageDataList) {
    const filter = imgData.mime === "image/png" ? "/FlateDecode" : "/DCTDecode";
    const imgObjId = newObj("PLACEHOLDER_IMAGE");
    imageObjIds.push({ streamId: imgObjId, xobjId: imgObjId });
  }

  // Page content streams
  const streamIds: number[] = [];
  for (const pageContent of pages) {
    const streamId = newObj(`<<\n/Length ${pageContent.length}\n>>\nstream\n${pageContent}\nendstream`);
    streamIds.push(streamId);
  }

  // Pages
  let pagesKids = "";
  const pageObjIds: number[] = [];
  for (let i = 0; i < totalPages; i++) {
    const pageObjId = objectCount + 1 + i;
    pageObjIds.push(pageObjId);
    if (i > 0) pagesKids += " ";
    pagesKids += `${pageObjId} 0 R`;
  }

  // Overwrite object 2 with pages
  objects[1] = `<<\n/Type /Pages\n/Kids [${pagesKids}]\n/Count ${totalPages}\n>>`;

  // Create page objects
  for (let i = 0; i < totalPages; i++) {
    let resources = `<< /Font << /F1 ${fontId} 0 R >> `;
    if (i > 0 && i - 1 < imageObjIds.length) {
      resources += `/XObject << /Img1 ${imageObjIds[i - 1].xobjId} 0 R >> `;
    }
    resources += ">>";

    newObj(
      `<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 ${pageWidth} ${pageHeight}]\n/Contents ${streamIds[i]} 0 R\n/Resources ${resources}\n>>`
    );
  }

  // Now serialize
  pdf = "%PDF-1.4\n";
  const finalOffsets: number[] = [];

  for (let i = 0; i < objects.length; i++) {
    // Skip placeholder images for simplicity - just use text references
    if (objects[i] === "PLACEHOLDER_IMAGE") {
      objects[i] = `<<\n/Type /XObject\n/Subtype /Image\n/Width 1\n/Height 1\n/ColorSpace /DeviceRGB\n/BitsPerComponent 8\n/Length 3\n>>\nstream\n\x00\x00\x00\nendstream`;
    }
    finalOffsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
  }

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += `0000000000 65535 f \n`;
  for (const off of finalOffsets) {
    pdf += `${String(off).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<<\n/Size ${objects.length + 1}\n/Root ${catalogId} 0 R\n>>\nstartxref\n${xrefOffset}\n%%EOF`;

  return new TextEncoder().encode(pdf);
}

function buildImagePageStream(
  _imgData: { data: Uint8Array; mime: string; width: number; height: number },
  pageWidth: number,
  pageHeight: number,
  margin: number
) {
  // For simplicity, show image reference text on the page
  const stream = `BT /F1 11 Tf ${margin} ${pageHeight - margin} Td (Image attached - see storage URL) Tj ET\nq ${pageWidth - margin * 2} 0 0 ${pageHeight - margin * 2 - 30} ${margin} ${margin} cm /Img1 Do Q\n`;
  return { stream };
}

function escPdf(str: string): string {
  return str.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { enquiry_id } = await req.json();
    if (!enquiry_id) {
      return new Response(JSON.stringify({ error: "enquiry_id required" }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: enquiry, error: eErr } = await supabase
      .from("enquiries")
      .select("*")
      .eq("id", enquiry_id)
      .single();

    if (eErr || !enquiry) {
      return new Response(JSON.stringify({ error: "Enquiry not found" }), {
        status: 404,
        headers: corsHeaders,
      });
    }

    // Fetch images if available
    const imageDataList: { data: Uint8Array; mime: string; width: number; height: number }[] = [];
    if (enquiry.image_urls && enquiry.image_urls.length > 0) {
      for (const url of enquiry.image_urls) {
        try {
          const resp = await fetch(url);
          if (resp.ok) {
            const buf = new Uint8Array(await resp.arrayBuffer());
            const mime = resp.headers.get("content-type") || "image/jpeg";
            imageDataList.push({ data: buf, mime, width: 400, height: 300 });
          }
        } catch {
          console.error("Failed to fetch image:", url);
        }
      }
    }

    const pdfBytes = buildPdf(enquiry, imageDataList);

    // Upload PDF
    const pdfPath = `${enquiry_id}/order-form.pdf`;
    const { error: uploadErr } = await supabase.storage
      .from("enquiry-pdfs")
      .upload(pdfPath, pdfBytes, { contentType: "application/pdf", upsert: true });

    if (uploadErr) {
      console.error("PDF upload error:", uploadErr);
      return new Response(JSON.stringify({ error: "PDF upload failed" }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    const { data: urlData } = supabase.storage
      .from("enquiry-pdfs")
      .getPublicUrl(pdfPath);

    // Update enquiry with PDF URL
    await supabase
      .from("enquiries")
      .update({ pdf_url: urlData.publicUrl })
      .eq("id", enquiry_id);

    return new Response(
      JSON.stringify({ success: true, pdf_url: urlData.publicUrl }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
