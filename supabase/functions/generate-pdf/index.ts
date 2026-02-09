import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PDFDocument, StandardFonts, rgb } from "https://esm.sh/pdf-lib@1.17.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function wrapText(text: string, font: any, fontSize: number, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const width = font.widthOfTextAtSize(testLine, fontSize);
    if (width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

async function buildPdf(enquiry: any, imageDataList: { data: Uint8Array; mime: string }[]) {
  const pdfDoc = await PDFDocument.create();
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const pageWidth = 595;
  const pageHeight = 842;
  const margin = 50;
  const labelX = margin;
  const valueX = 180;
  const maxValueWidth = pageWidth - valueX - margin;
  const fontSize = 11;
  const titleFontSize = 18;
  const lineHeight = 18;

  const page = pdfDoc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  // Title
  page.drawText("ORDER FORM / ENQUIRY DETAILS", {
    x: labelX, y, size: titleFontSize, font: fontBold, color: rgb(0, 0, 0),
  });
  y -= 8;

  // Separator line
  page.drawLine({
    start: { x: labelX, y },
    end: { x: pageWidth - margin, y },
    thickness: 1,
    color: rgb(0.4, 0.4, 0.4),
  });
  y -= lineHeight * 1.5;

  const fields = [
    ["Name", enquiry.name],
    ["Phone", enquiry.mobile],
    ["District", enquiry.district || enquiry.place || "N/A"],
    ["Service", enquiry.service || "N/A"],
    ["Area", enquiry.sq_feet_area ? `${enquiry.sq_feet_area} sq.ft` : "N/A"],
    ["Requirements", enquiry.requirements || "N/A"],
    ["Date", new Date(enquiry.created_at).toLocaleDateString()],
  ];

  for (const [label, value] of fields) {
    if (y < margin + 20) break;

    page.drawText(`${label}:`, {
      x: labelX, y, size: fontSize, font: fontBold, color: rgb(0, 0, 0),
    });

    const wrappedLines = wrapText(String(value), fontRegular, fontSize, maxValueWidth);
    for (const line of wrappedLines) {
      if (y < margin + 20) break;
      page.drawText(line, {
        x: valueX, y, size: fontSize, font: fontRegular, color: rgb(0, 0, 0),
      });
      y -= lineHeight;
    }
  }

  if (enquiry.image_urls && enquiry.image_urls.length > 0) {
    y -= lineHeight * 0.5;
    if (y > margin + 20) {
      page.drawText(`Images: ${enquiry.image_urls.length} attached`, {
        x: labelX, y, size: fontSize, font: fontBold, color: rgb(0.3, 0.3, 0.3),
      });
    }
  }

  // Embed images on separate pages
  for (const imgData of imageDataList) {
    try {
      let image;
      if (imgData.mime.includes("png")) {
        image = await pdfDoc.embedPng(imgData.data);
      } else {
        image = await pdfDoc.embedJpg(imgData.data);
      }

      const imgPage = pdfDoc.addPage([pageWidth, pageHeight]);
      const scale = Math.min(
        (pageWidth - margin * 2) / image.width,
        (pageHeight - margin * 2) / image.height
      );
      const scaledW = image.width * scale;
      const scaledH = image.height * scale;

      imgPage.drawImage(image, {
        x: (pageWidth - scaledW) / 2,
        y: (pageHeight - scaledH) / 2,
        width: scaledW,
        height: scaledH,
      });
    } catch (e) {
      console.error("Failed to embed image:", e);
    }
  }

  return await pdfDoc.save();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { enquiry_id } = await req.json();
    if (!enquiry_id) {
      return new Response(JSON.stringify({ error: "enquiry_id required" }), {
        status: 400, headers: corsHeaders,
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
        status: 404, headers: corsHeaders,
      });
    }

    const imageDataList: { data: Uint8Array; mime: string }[] = [];
    if (enquiry.image_urls && enquiry.image_urls.length > 0) {
      for (const url of enquiry.image_urls) {
        try {
          const resp = await fetch(url);
          if (resp.ok) {
            const buf = new Uint8Array(await resp.arrayBuffer());
            const mime = resp.headers.get("content-type") || "image/jpeg";
            imageDataList.push({ data: buf, mime });
          }
        } catch {
          console.error("Failed to fetch image:", url);
        }
      }
    }

    const pdfBytes = await buildPdf(enquiry, imageDataList);

    const pdfPath = `${enquiry_id}/order-form.pdf`;
    const { error: uploadErr } = await supabase.storage
      .from("enquiry-pdfs")
      .upload(pdfPath, pdfBytes, { contentType: "application/pdf", upsert: true });

    if (uploadErr) {
      console.error("PDF upload error:", uploadErr);
      return new Response(JSON.stringify({ error: "PDF upload failed" }), {
        status: 500, headers: corsHeaders,
      });
    }

    const { data: urlData } = supabase.storage
      .from("enquiry-pdfs")
      .getPublicUrl(pdfPath);

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
      status: 500, headers: corsHeaders,
    });
  }
});
