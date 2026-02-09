import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FileText, ExternalLink } from "lucide-react";

const EnquiriesTab = () => {
  const [enquiries, setEnquiries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEnquiries = async () => {
      const { data } = await supabase
        .from("enquiries")
        .select("*")
        .order("created_at", { ascending: false });
      setEnquiries(data || []);
      setLoading(false);
    };
    fetchEnquiries();
  }, []);

  if (loading) return <p className="py-4 text-muted-foreground">Loading enquiries...</p>;

  return (
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
            </TableRow>
          </TableHeader>
          <TableBody>
            {enquiries.map((e) => (
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
                  <Badge variant={e.whatsapp_sent ? "default" : "secondary"}>
                    {e.whatsapp_sent ? "Sent" : "Pending"}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
};

export default EnquiriesTab;
