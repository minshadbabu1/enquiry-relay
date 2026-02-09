import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";

const enquirySchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  mobile: z.string().trim().min(10, "Enter a valid mobile number").max(15).regex(/^[0-9+\-\s]+$/, "Invalid mobile number"),
  place: z.string().trim().min(1, "Place is required").max(200),
  sq_feet_area: z.string().min(1, "Area is required").regex(/^\d+(\.\d+)?$/, "Enter a valid number"),
});

type EnquiryForm = z.infer<typeof enquirySchema>;

const Index = () => {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const form = useForm<EnquiryForm>({
    resolver: zodResolver(enquirySchema),
    defaultValues: { name: "", mobile: "", place: "", sq_feet_area: "" },
  });

  const onSubmit = async (data: EnquiryForm) => {
    setLoading(true);
    try {
      // Insert enquiry
      const { data: enquiry, error } = await supabase
        .from("enquiries")
        .insert({
          name: data.name,
          mobile: data.mobile,
          place: data.place,
          sq_feet_area: parseFloat(data.sq_feet_area),
        })
        .select()
        .single();

      if (error) throw error;

      // Trigger WhatsApp notification via edge function
      try {
        await supabase.functions.invoke("send-whatsapp", {
          body: { enquiry_id: enquiry.id },
        });
      } catch {
        // Don't fail the submission if WhatsApp fails
        console.error("WhatsApp notification failed");
      }

      setSubmitted(true);
    } catch (err) {
      toast.error("Failed to submit enquiry. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-8">
            <CheckCircle2 className="mx-auto mb-4 h-16 w-16 text-primary" />
            <h2 className="text-2xl font-semibold mb-2">Thank You!</h2>
            <p className="text-muted-foreground mb-6">
              Your enquiry has been submitted successfully. We'll get back to you soon.
            </p>
            <Button onClick={() => { setSubmitted(false); form.reset(); }}>
              Submit Another Enquiry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Interior Design Enquiry</CardTitle>
          <CardDescription>Fill in your details and we'll get back to you</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl><Input placeholder="Your full name" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="mobile" render={({ field }) => (
                <FormItem>
                  <FormLabel>Mobile Number</FormLabel>
                  <FormControl><Input placeholder="e.g. 9876543210" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="place" render={({ field }) => (
                <FormItem>
                  <FormLabel>Place</FormLabel>
                  <FormControl><Input placeholder="Your city or locality" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="sq_feet_area" render={({ field }) => (
                <FormItem>
                  <FormLabel>Area (Sq. Feet)</FormLabel>
                  <FormControl><Input placeholder="e.g. 1200" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Submitting..." : "Submit Enquiry"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Index;
