import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "./StatusBadge";
import { PriorityBadge } from "./PriorityBadge";
import { Calendar, User, FileText, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface CaseCardProps {
  id: string;
  caseType: "Mail" | "Complaint" | "Dispute";
  category: string;
  priority: "Low" | "Medium" | "High" | "Critical" | "BK24" | "BK48";
  status: "open" | "pending" | "resolved" | "closed";
  customerName: string;
  createdAt: Date;
  details: string;
  slaDeadline?: Date;
  onViewCase: (id: string) => void;
}

export function CaseCard({
  id,
  caseType,
  category,
  priority,
  status,
  customerName,
  createdAt,
  details,
  slaDeadline,
  onViewCase,
}: CaseCardProps) {
  const isSlaBreached = slaDeadline && new Date() > slaDeadline;
  const timeUntilSla = slaDeadline ? formatDistanceToNow(slaDeadline, { addSuffix: true }) : null;

  return (
    <Card className="hover-elevate cursor-pointer" onClick={() => onViewCase(id)} data-testid={`card-case-${id}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-sm font-medium">Case #{id}</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">{caseType} • {category}</p>
          </div>
          <div className="flex gap-2">
            <PriorityBadge priority={priority} />
            <StatusBadge status={status} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <User className="h-4 w-4" />
            <span>{customerName}</span>
          </div>
          
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>Created {formatDistanceToNow(createdAt, { addSuffix: true })}</span>
          </div>

          {slaDeadline && (
            <div className={`flex items-center gap-2 text-sm ${isSlaBreached ? 'text-destructive' : 'text-muted-foreground'}`}>
              <Clock className="h-4 w-4" />
              <span>SLA {timeUntilSla}</span>
            </div>
          )}

          <div className="flex items-start gap-2">
            <FileText className="h-4 w-4 mt-0.5 text-muted-foreground" />
            <p className="text-sm text-muted-foreground line-clamp-2">{details}</p>
          </div>

          <div className="flex justify-end pt-2">
            <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); onViewCase(id); }} data-testid={`button-view-case-${id}`}>
              View Case
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}