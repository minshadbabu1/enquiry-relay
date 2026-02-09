import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import EnquiriesTab from "@/components/admin/EnquiriesTab";
import WhatsAppNumbersTab from "@/components/admin/WhatsAppNumbersTab";
import WatiSettingsTab from "@/components/admin/WatiSettingsTab";

const Admin = () => {
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/login");
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) navigate("/login");
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  if (loading) return <div className="flex min-h-screen items-center justify-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold">Admin Panel</h1>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" /> Logout
          </Button>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-6">
        <Tabs defaultValue="enquiries">
          <TabsList>
            <TabsTrigger value="enquiries">Enquiries</TabsTrigger>
            <TabsTrigger value="numbers">WhatsApp Numbers</TabsTrigger>
            <TabsTrigger value="settings">WATI Settings</TabsTrigger>
          </TabsList>
          <TabsContent value="enquiries"><EnquiriesTab /></TabsContent>
          <TabsContent value="numbers"><WhatsAppNumbersTab /></TabsContent>
          <TabsContent value="settings"><WatiSettingsTab /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Admin;
