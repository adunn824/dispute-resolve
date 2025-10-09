import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Mail, Clock, User, ChevronDown, ChevronUp, Paperclip } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "../../lib/queryClient";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface EmailHistoryTabProps {
  caseId: string;
}

interface EmailHistoryItem {
  id: string;
  caseId: string;
  actorUserId: string;
  action: string;
  details: {
    to: string;
    cc?: string;
    bcc?: string;
    subject: string;
    body: string;
    templateName?: string;
    attachments?: Array<{ name: string; id: string }>;
  };
  createdAt: string;
  actorUser: {
    name: string;
    email: string;
  };
}

export function EmailHistoryTab({ caseId }: EmailHistoryTabProps) {
  const [expandedEmails, setExpandedEmails] = useState<Set<string>>(new Set());

  // Fetch email history
  const { data: emailsData, isLoading } = useQuery<{data: EmailHistoryItem[]}>({
    queryKey: ["/api/cases", caseId, "emails"],
    queryFn: () => apiRequest("GET", `/api/cases/${caseId}/emails`)
  });

  const emails = emailsData?.data || [];

  const toggleEmail = (emailId: string) => {
    const newExpanded = new Set(expandedEmails);
    if (newExpanded.has(emailId)) {
      newExpanded.delete(emailId);
    } else {
      newExpanded.add(emailId);
    }
    setExpandedEmails(newExpanded);
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">Loading email history...</p>
        </CardContent>
      </Card>
    );
  }

  if (emails.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No emails have been sent for this case yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Email History
          <Badge variant="secondary">{emails.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {emails.map((email) => {
            const isExpanded = expandedEmails.has(email.id);
            const bodyPreview = email.details.body.slice(0, 150) + (email.details.body.length > 150 ? "..." : "");

            return (
              <Collapsible key={email.id} open={isExpanded} onOpenChange={() => toggleEmail(email.id)}>
                <Card className="hover-elevate">
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback>{getInitials(email.actorUser.name)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-sm">{email.actorUser.name}</p>
                            <Badge variant="outline" className="text-xs">
                              <Clock className="h-3 w-3 mr-1" />
                              {formatDistanceToNow(new Date(email.createdAt), { addSuffix: true })}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {email.actorUser.email}
                          </p>
                          
                          <div className="mt-3 space-y-2">
                            <div className="text-sm">
                              <span className="text-muted-foreground">To: </span>
                              <span className="font-medium">{email.details.to}</span>
                            </div>
                            
                            {email.details.cc && (
                              <div className="text-sm">
                                <span className="text-muted-foreground">CC: </span>
                                <span>{email.details.cc}</span>
                              </div>
                            )}

                            {email.details.bcc && (
                              <div className="text-sm">
                                <span className="text-muted-foreground">BCC: </span>
                                <span>{email.details.bcc}</span>
                              </div>
                            )}

                            <div className="text-sm">
                              <span className="text-muted-foreground">Subject: </span>
                              <span className="font-medium">{email.details.subject}</span>
                            </div>

                            {email.details.templateName && (
                              <div className="text-sm">
                                <span className="text-muted-foreground">Template: </span>
                                <Badge variant="secondary" className="text-xs">
                                  {email.details.templateName}
                                </Badge>
                              </div>
                            )}

                            {!isExpanded && (
                              <div className="text-sm text-muted-foreground mt-2">
                                {bodyPreview}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <CollapsibleTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="ml-2"
                          data-testid={`button-toggle-email-${email.id}`}
                        >
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      </CollapsibleTrigger>
                    </div>

                    <CollapsibleContent className="mt-4">
                      <Separator className="mb-4" />
                      
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs text-muted-foreground font-medium mb-1">FULL EMAIL BODY</p>
                          <div className="bg-muted/50 p-3 rounded-md text-sm whitespace-pre-wrap">
                            {email.details.body}
                          </div>
                        </div>

                        {email.details.attachments && email.details.attachments.length > 0 && (
                          <div>
                            <p className="text-xs text-muted-foreground font-medium mb-2">ATTACHMENTS</p>
                            <div className="space-y-1">
                              {email.details.attachments.map((attachment, idx) => (
                                <div 
                                  key={idx} 
                                  className="flex items-center gap-2 text-sm"
                                  data-testid={`attachment-${attachment.id}`}
                                >
                                  <Paperclip className="h-3 w-3 text-muted-foreground" />
                                  <span>{attachment.name}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="text-xs text-muted-foreground">
                          Sent on {format(new Date(email.createdAt), "PPpp")}
                        </div>
                      </div>
                    </CollapsibleContent>
                  </CardContent>
                </Card>
              </Collapsible>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
