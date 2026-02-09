import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Trash2, Plus } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

const WhatsAppNumbersTab = () => {
  const [numbers, setNumbers] = useState<Tables<"whatsapp_numbers">[]>([]);
  const [phone, setPhone] = useState("");
  const [label, setLabel] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchNumbers = async () => {
    const { data } = await supabase.from("whatsapp_numbers").select("*").order("created_at");
    setNumbers(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchNumbers(); }, []);

  const addNumber = async () => {
    if (!phone.trim()) return toast.error("Phone number is required");
    const { error } = await supabase.from("whatsapp_numbers").insert({ phone_number: phone.trim(), label: label.trim() || null });
    if (error) return toast.error("Failed to add number");
    toast.success("Number added");
    setPhone("");
    setLabel("");
    fetchNumbers();
  };

  const deleteNumber = async (id: string) => {
    const { error } = await supabase.from("whatsapp_numbers").delete().eq("id", id);
    if (error) return toast.error("Failed to delete");
    toast.success("Number removed");
    fetchNumbers();
  };

  if (loading) return <p className="py-4 text-muted-foreground">Loading...</p>;

  return (
    <div className="mt-4 space-y-6">
      <div className="flex gap-2 items-end">
        <div className="flex-1 space-y-1">
          <label className="text-sm font-medium">Phone Number</label>
          <Input placeholder="e.g. 919876543210" value={phone} onChange={e => setPhone(e.target.value)} />
        </div>
        <div className="flex-1 space-y-1">
          <label className="text-sm font-medium">Label (optional)</label>
          <Input placeholder="e.g. Sales Team" value={label} onChange={e => setLabel(e.target.value)} />
        </div>
        <Button onClick={addNumber}><Plus className="h-4 w-4 mr-1" /> Add</Button>
      </div>

      {numbers.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">No WhatsApp numbers configured.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Phone Number</TableHead>
              <TableHead>Label</TableHead>
              <TableHead className="w-20"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {numbers.map((n) => (
              <TableRow key={n.id}>
                <TableCell>{n.phone_number}</TableCell>
                <TableCell>{n.label || "—"}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" onClick={() => deleteNumber(n.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
};

export default WhatsAppNumbersTab;
