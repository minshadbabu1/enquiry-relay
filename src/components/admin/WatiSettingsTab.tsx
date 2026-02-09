import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

const WatiSettingsTab = () => {
  const [endpoint, setEndpoint] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [templateName, setTemplateName] = useState("enquiry_notification_test");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from("wati_settings").select("*").limit(1).single();
      if (data) {
        setEndpoint(data.api_endpoint);
        setApiKey(data.api_key);
        setTemplateName(data.template_name);
      }
      setLoading(false);
    };
    fetch();
  }, []);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("wati_settings")
      .update({ api_endpoint: endpoint.trim(), api_key: apiKey.trim(), template_name: templateName.trim() })
      .not("id", "is", null); // update all rows (there's only one)
    setSaving(false);
    if (error) return toast.error("Failed to save settings");
    toast.success("WATI settings saved");
  };

  if (loading) return <p className="py-4 text-muted-foreground">Loading...</p>;

  return (
    <div className="mt-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">WATI API Configuration</CardTitle>
          <CardDescription>Configure your WATI API credentials for WhatsApp notifications</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>API Endpoint</Label>
            <Input placeholder="https://live-mt-server.wati.io" value={endpoint} onChange={e => setEndpoint(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>API Key</Label>
            <Input type="password" placeholder="Your WATI API key" value={apiKey} onChange={e => setApiKey(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Template Name</Label>
            <Input placeholder="enquiry_notification" value={templateName} onChange={e => setTemplateName(e.target.value)} />
          </div>
          <Button onClick={save} disabled={saving}>
            {saving ? "Saving..." : "Save Settings"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default WatiSettingsTab;
