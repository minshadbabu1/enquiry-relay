import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { Tables } from "@/integrations/supabase/types";

const EnquiriesTab = () => {
  const [enquiries, setEnquiries] = useState<Tables<"enquiries">[]>([]);
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
    <div className="mt-4">
      {enquiries.length === 0 ? (
        <p className="text-muted-foreground py-8 text-center">No enquiries yet.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Mobile</TableHead>
              <TableHead>Place</TableHead>
              <TableHead>Sq Feet</TableHead>
              <TableHead>WhatsApp</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {enquiries.map((e) => (
              <TableRow key={e.id}>
                <TableCell className="whitespace-nowrap">{new Date(e.created_at).toLocaleDateString()}</TableCell>
                <TableCell>{e.name}</TableCell>
                <TableCell>{e.mobile}</TableCell>
                <TableCell>{e.place}</TableCell>
                <TableCell>{e.sq_feet_area}</TableCell>
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
