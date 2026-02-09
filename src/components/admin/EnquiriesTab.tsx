import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FileText, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  sent: { label: "Sent", variant: "default" },
  partial: { label: "Partial", variant: "outline" },
  failed: { label: "Failed", variant: "destructive" },
  not_configured: { label: "Not Configured", variant: "secondary" },
};

const EnquiriesTab = () => {
  const [enquiries, setEnquiries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState<string | null>(null);

  const fetchEnquiries = async () => {
    const { data } = await supabase
      .from("enquiries")
      .select("*")
      .order("created_at", { ascending: false });
    setEnquiries(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchEnquiries();
  }, []);

  const handleRetry = async (enquiryId: string) => {
    setRetrying(enquiryId);
    try {
      const { data, error } = await supabase.functions.invoke("send-whatsapp", {
        body: { enquiry_id: enquiryId },
      });
      if (error) throw error;
      toast.success(`WhatsApp status: ${data?.status || "unknown"}`);
      await fetchEnquiries();
    } catch (err: any) {
      toast.error("Retry failed: " + (err.message || "Unknown error"));
    } finally {
      setRetrying(null);
    }
  };

  const getStatusInfo = (e: any) => {
    const status = e.whatsapp_status;
    if (status && statusConfig[status]) return statusConfig[status];
    // Fallback to old boolean
    if (e.whatsapp_sent) return { label: "Sent", variant: "default" as const };
    return { label: "Pending", variant: "secondary" as const };
  };

  const getErrorDetail = (e: any): string | null => {
    if (!e.whatsapp_response) return null;
    try {
      const resp = Array.isArray(e.whatsapp_response) ? e.whatsapp_response : [e.whatsapp_response];
      const errors = resp.filter((r: any) => !r.ok).map((r: any) => {
        const info = r.body?.info || r.error || "Unknown error";
        return r.phone ? `${r.phone}: ${info}` : info;
      });
      return errors.length > 0 ? errors.join("\n") : null;
    } catch {
      return JSON.stringify(e.whatsapp_response);
    }
  };

  if (loading) return <p className="py-4 text-muted-foreground">Loading enquiries...</p>;

  return (
    <TooltipProvider>
      <div className="mt-4 overflow-x-auto">
        {enquiries.length === 0 ? (
          <p className="text-muted-foreground py-8 text-center">No enquiries yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Mobile</TableHead>
                <TableHead>District</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Sq Feet</TableHead>
                <TableHead>Images</TableHead>
                <TableHead>PDF</TableHead>
                <TableHead>WhatsApp</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {enquiries.map((e) => {
                const statusInfo = getStatusInfo(e);
                const errorDetail = getErrorDetail(e);
                const showRetry = e.whatsapp_status === "failed" || e.whatsapp_status === "partial" || (!e.whatsapp_sent && !e.whatsapp_status);

                return (
                  <TableRow key={e.id}>
                    <TableCell className="whitespace-nowrap">{new Date(e.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>{e.name}</TableCell>
                    <TableCell>{e.mobile}</TableCell>
                    <TableCell>{e.district || e.place}</TableCell>
                    <TableCell>{e.service || e.place}</TableCell>
                    <TableCell>{e.sq_feet_area || "—"}</TableCell>
                    <TableCell>
                      {e.image_urls && e.image_urls.length > 0 ? (
                        <div className="flex gap-1">
                          {e.image_urls.slice(0, 3).map((url: string, i: number) => (
                            <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                              <img src={url} alt="" className="w-8 h-8 rounded object-cover border border-border" />
                            </a>
                          ))}
                          {e.image_urls.length > 3 && (
                            <span className="text-xs text-muted-foreground self-center">+{e.image_urls.length - 3}</span>
                          )}
                        </div>
                      ) : "—"}
                    </TableCell>
                    <TableCell>
                      {e.pdf_url ? (
                        <a href={e.pdf_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline text-sm">
                          <FileText className="h-4 w-4" /> View
                        </a>
                      ) : "—"}
                    </TableCell>
                    <TableCell>
                      {errorDetail ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge variant={statusInfo.variant} className="cursor-help">
                              {statusInfo.label}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs whitespace-pre-wrap text-xs">
                            {errorDetail}
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <Badge variant={statusInfo.variant}>
                          {statusInfo.label}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {showRetry && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRetry(e.id)}
                          disabled={retrying === e.id}
                        >
                          <RotateCw className={`h-4 w-4 ${retrying === e.id ? "animate-spin" : ""}`} />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </TooltipProvider>
  );
};

export default EnquiriesTab;
