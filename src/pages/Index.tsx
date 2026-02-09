import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from "sonner";
import { CheckCircle2, Upload, X, ImageIcon } from "lucide-react";

const KERALA_DISTRICTS = [
  "Thiruvananthapuram", "Kollam", "Pathanamthitta", "Alappuzha",
  "Kottayam", "Idukki", "Ernakulam", "Thrissur",
  "Palakkad", "Malappuram", "Kozhikode", "Wayanad",
  "Kannur", "Kasaragod",
];

const SERVICES = [
  "Interior Design", "Renovation", "Modular Kitchen", "Painting",
];

const enquirySchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  mobile: z.string().trim().min(10, "Enter a valid mobile number").max(15).regex(/^[0-9+\-\s]+$/, "Invalid mobile number"),
  district: z.string().min(1, "Select a district"),
  sq_feet_area: z.string().optional(),
  service: z.string().min(1, "Select a service"),
  requirements: z.string().optional(),
});

type EnquiryForm = z.infer<typeof enquirySchema>;

const MAX_IMAGES = 5;

const Index = () => {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<EnquiryForm>({
    resolver: zodResolver(enquirySchema),
    defaultValues: { name: "", mobile: "", district: "", sq_feet_area: "", service: "", requirements: "" },
  });

  const handleImageAdd = (files: FileList | null) => {
    if (!files) return;
    const newFiles = Array.from(files).slice(0, MAX_IMAGES - images.length);
    const updatedImages = [...images, ...newFiles];
    setImages(updatedImages);

    newFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => setPreviews((prev) => [...prev, reader.result as string]);
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: EnquiryForm) => {
    setLoading(true);
    try {
      // 1. Upload images first (using a temp folder ID)
      let imageUrls: string[] = [];
      if (images.length > 0) {
        const folderId = crypto.randomUUID();
        const results = await Promise.allSettled(
          images.map(async (file) => {
            const ext = file.name.split(".").pop();
            const path = `${folderId}/${crypto.randomUUID()}.${ext}`;
            const { error: uploadErr } = await supabase.storage
              .from("enquiry-images")
              .upload(path, file);
            if (uploadErr) throw uploadErr;
            const { data: urlData } = supabase.storage
              .from("enquiry-images")
              .getPublicUrl(path);
            return urlData.publicUrl;
          })
        );
        imageUrls = results
          .filter((r): r is PromiseFulfilledResult<string> => r.status === "fulfilled")
          .map((r) => r.value);
      }

      // 2. Generate ID client-side so we don't need .select().single()
      const enquiryId = crypto.randomUUID();

      const { error } = await supabase
        .from("enquiries")
        .insert({
          id: enquiryId,
          name: data.name,
          mobile: data.mobile,
          place: data.district,
          sq_feet_area: data.sq_feet_area ? parseFloat(data.sq_feet_area) : 0,
          district: data.district,
          service: data.service,
          requirements: data.requirements || null,
          image_urls: imageUrls.length > 0 ? imageUrls : null,
        });

      if (error) throw error;

      // 3. Generate PDF (non-blocking)
      try {
        await supabase.functions.invoke("generate-pdf", {
          body: { enquiry_id: enquiryId },
        });
      } catch {
        console.error("PDF generation failed");
      }

      // 4. Send WhatsApp (non-blocking)
      try {
        await supabase.functions.invoke("send-whatsapp", {
          body: { enquiry_id: enquiryId },
        });
      } catch {
        console.error("WhatsApp notification failed");
      }

      setSubmitted(true);
    } catch (err) {
      console.error("Enquiry submission error:", err);
      toast.error("Failed to submit enquiry. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-md text-center rounded-2xl border border-border bg-card p-8 shadow-lg">
          <CheckCircle2 className="mx-auto mb-4 h-16 w-16 text-primary" />
          <h2 className="text-2xl font-semibold mb-2">Thank You!</h2>
          <p className="text-muted-foreground mb-6">
            Your enquiry has been submitted successfully. We'll get back to you soon.
          </p>
          <Button
            onClick={() => { setSubmitted(false); form.reset(); setImages([]); setPreviews([]); }}
            className="w-full bg-gradient-to-r from-[hsl(270,70%,50%)] to-[hsl(300,70%,50%)] text-white hover:opacity-90"
          >
            Submit Another Enquiry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[hsl(270,30%,96%)] to-background px-4 py-8">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card shadow-xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-[hsl(270,70%,50%)] to-[hsl(300,70%,50%)] px-6 py-5">
          <h1 className="text-2xl font-bold text-white tracking-wide">START YOUR PROJECT</h1>
          <p className="text-white/80 text-sm mt-1">Fill in your details and we'll get back to you</p>
        </div>

        <div className="p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Row 1: Name + Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name *</FormLabel>
                    <FormControl><Input placeholder="Your full name" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="mobile" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number *</FormLabel>
                    <FormControl><Input placeholder="e.g. 9876543210" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              {/* Row 2: District + Sq Feet */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField control={form.control} name="district" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Select District *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select district" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {KERALA_DISTRICTS.map((d) => (
                          <SelectItem key={d} value={d}>{d}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="sq_feet_area" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Square Feet</FormLabel>
                    <FormControl><Input placeholder="e.g. 1200" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              {/* Row 3: Service */}
              <FormField control={form.control} name="service" render={({ field }) => (
                <FormItem>
                  <FormLabel>Service Required *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select service" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {SERVICES.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              {/* Row 4: Requirements */}
              <FormField control={form.control} name="requirements" render={({ field }) => (
                <FormItem>
                  <FormLabel>Project Requirements</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Describe your project requirements..." rows={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              {/* Row 5: Image Upload */}
              <div>
                <label className="text-sm font-medium leading-none mb-2 block">
                  Upload Images ({images.length}/{MAX_IMAGES})
                </label>
                <div
                  className="border-2 border-dashed border-border rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  onDrop={(e) => { e.preventDefault(); e.stopPropagation(); handleImageAdd(e.dataTransfer.files); }}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => handleImageAdd(e.target.files)}
                  />
                  {images.length === 0 ? (
                    <div className="py-4">
                      <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">Click or drag images here (max {MAX_IMAGES})</p>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-3 justify-center">
                      {previews.map((src, i) => (
                        <div key={i} className="relative w-20 h-20 rounded-md overflow-hidden border border-border">
                          <img src={src} alt="" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); removeImage(i); }}
                            className="absolute top-0 right-0 bg-destructive text-destructive-foreground rounded-bl p-0.5"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                      {images.length < MAX_IMAGES && (
                        <div className="w-20 h-20 rounded-md border-2 border-dashed border-border flex items-center justify-center">
                          <ImageIcon className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-[hsl(270,70%,50%)] to-[hsl(300,70%,50%)] text-white hover:opacity-90 font-semibold text-base py-5"
                disabled={loading}
              >
                {loading ? "Submitting..." : "GET QUOTE"}
              </Button>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
};

export default Index;
