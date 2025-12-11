import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, AlertTriangle, Activity, FileText } from "lucide-react";

interface SecurityLog {
  id: string;
  event_type: string;
  severity: string;
  user_code?: string;
  ip_address?: string;
  details?: any;
  created_at: string;
}

interface ContentViolation {
  id: string;
  user_code?: string;
  content_type: string;
  violation_reason: string;
  severity: string;
  created_at: string;
}

interface RateLimit {
  id: string;
  identifier: string;
  action_type: string;
  request_count: number;
  blocked_until?: string;
  created_at: string;
}

export const SecurityPanel = () => {
  const [securityLogs, setSecurityLogs] = useState<SecurityLog[]>([]);
  const [violations, setViolations] = useState<ContentViolation[]>([]);
  const [rateLimits, setRateLimits] = useState<RateLimit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSecurityData();
  }, []);

  const fetchSecurityData = async () => {
    setLoading(true);
    
    const [logsResult, violationsResult, rateLimitsResult] = await Promise.all([
      supabase.from('security_logs').select('*').order('created_at', { ascending: false }).limit(100),
      supabase.from('content_violations').select('*').order('created_at', { ascending: false }).limit(100),
      supabase.from('rate_limits').select('*').order('created_at', { ascending: false }).limit(100)
    ]);

    if (logsResult.data) setSecurityLogs(logsResult.data);
    if (violationsResult.data) setViolations(violationsResult.data);
    if (rateLimitsResult.data) setRateLimits(rateLimitsResult.data);

    setLoading(false);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'warning': return 'default';
      case 'medium': return 'default';
      case 'info': return 'secondary';
      case 'low': return 'secondary';
      default: return 'secondary';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">טוען נתוני אבטחה...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-2 mb-6">
        <Shield className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold">מרכז אבטחת מידע</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="h-5 w-5 text-blue-500" />
            <h3 className="font-semibold">אירועי אבטחה</h3>
          </div>
          <p className="text-3xl font-bold">{securityLogs.length}</p>
          <p className="text-sm text-muted-foreground">סה"כ אירועים</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <h3 className="font-semibold">הפרות תוכן</h3>
          </div>
          <p className="text-3xl font-bold">{violations.length}</p>
          <p className="text-sm text-muted-foreground">תכנים שנחסמו</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="h-5 w-5 text-orange-500" />
            <h3 className="font-semibold">הגבלות קצב</h3>
          </div>
          <p className="text-3xl font-bold">{rateLimits.filter(r => r.blocked_until).length}</p>
          <p className="text-sm text-muted-foreground">משתמשים חסומים</p>
        </Card>
      </div>

      <Tabs defaultValue="logs" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="logs">לוגי אבטחה</TabsTrigger>
          <TabsTrigger value="violations">הפרות תוכן</TabsTrigger>
          <TabsTrigger value="rates">הגבלות קצב</TabsTrigger>
        </TabsList>

        <TabsContent value="logs">
          <Card>
            <ScrollArea className="h-[500px] p-4">
              <div className="space-y-2">
                {securityLogs.map((log) => (
                  <div key={log.id} className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant={getSeverityColor(log.severity) as any}>
                          {log.severity}
                        </Badge>
                        <span className="font-semibold">{log.event_type}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(log.created_at).toLocaleString('he-IL')}
                      </span>
                    </div>
                    <div className="text-sm space-y-1">
                      {log.user_code && (
                        <p><strong>משתמש:</strong> {log.user_code}</p>
                      )}
                      {log.ip_address && (
                        <p><strong>IP:</strong> {log.ip_address}</p>
                      )}
                      {log.details && (
                        <pre className="text-xs bg-muted p-2 rounded mt-2 overflow-x-auto">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </Card>
        </TabsContent>

        <TabsContent value="violations">
          <Card>
            <ScrollArea className="h-[500px] p-4">
              <div className="space-y-2">
                {violations.map((violation) => (
                  <div key={violation.id} className="p-3 border rounded-lg border-destructive/20">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant={getSeverityColor(violation.severity) as any}>
                          {violation.severity}
                        </Badge>
                        <span className="font-semibold">{violation.content_type}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(violation.created_at).toLocaleString('he-IL')}
                      </span>
                    </div>
                    <div className="text-sm space-y-1">
                      {violation.user_code && (
                        <p><strong>משתמש:</strong> {violation.user_code}</p>
                      )}
                      <p><strong>סיבה:</strong> {violation.violation_reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </Card>
        </TabsContent>

        <TabsContent value="rates">
          <Card>
            <ScrollArea className="h-[500px] p-4">
              <div className="space-y-2">
                {rateLimits.map((limit) => (
                  <div key={limit.id} className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {limit.blocked_until && (
                          <Badge variant="destructive">חסום</Badge>
                        )}
                        <span className="font-semibold">{limit.action_type}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(limit.created_at).toLocaleString('he-IL')}
                      </span>
                    </div>
                    <div className="text-sm space-y-1">
                      <p><strong>מזהה:</strong> {limit.identifier}</p>
                      <p><strong>מספר בקשות:</strong> {limit.request_count}</p>
                      {limit.blocked_until && (
                        <p className="text-destructive">
                          <strong>חסום עד:</strong> {new Date(limit.blocked_until).toLocaleString('he-IL')}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};