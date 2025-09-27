import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { MessageSquare, Plus, Save, Clock, User, Edit2, X } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "../../lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface CaseNotesTabProps {
  caseId: string;
}

interface CaseNote {
  id: string;
  caseId: string;
  authorUserId: string;
  content: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  authorUser: {
    name: string;
    role: string;
  };
}

export function CaseNotesTab({ caseId }: CaseNotesTabProps) {
  const [newNoteContent, setNewNoteContent] = useState("");
  const [newNoteIsPublic, setNewNoteIsPublic] = useState(true);
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editIsPublic, setEditIsPublic] = useState(true);
  const { toast } = useToast();

  // Fetch case notes
  const { data: notesData, isLoading } = useQuery<{data: CaseNote[]}>({
    queryKey: ["/api/cases", caseId, "notes"],
    queryFn: () => apiRequest("GET", `/api/cases/${caseId}/notes`)
  });

  const notes = notesData?.data || [];

  // Mutation for creating a new note
  const createNoteMutation = useMutation({
    mutationFn: (noteData: { content: string; isPublic: boolean }) =>
      apiRequest("POST", `/api/cases/${caseId}/notes`, noteData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases", caseId, "notes"] });
      setNewNoteContent("");
      setNewNoteIsPublic(true);
      toast({
        title: "Note Added",
        description: "Your note has been successfully added to the case.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to add note",
        variant: "destructive",
      });
    },
  });

  // Mutation for updating a note
  const updateNoteMutation = useMutation({
    mutationFn: ({ noteId, content, isPublic }: { noteId: string; content: string; isPublic: boolean }) =>
      apiRequest("PUT", `/api/notes/${noteId}`, { content, isPublic }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases", caseId, "notes"] });
      setEditingNote(null);
      setEditContent("");
      toast({
        title: "Note Updated",
        description: "Your note has been successfully updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to update note",
        variant: "destructive",
      });
    },
  });

  const handleCreateNote = () => {
    if (!newNoteContent.trim()) {
      toast({
        title: "Error",
        description: "Please enter note content",
        variant: "destructive",
      });
      return;
    }

    createNoteMutation.mutate({
      content: newNoteContent.trim(),
      isPublic: newNoteIsPublic,
    });
  };

  const handleEditNote = (note: CaseNote) => {
    setEditingNote(note.id);
    setEditContent(note.content);
    setEditIsPublic(note.isPublic);
  };

  const handleUpdateNote = () => {
    if (!editContent.trim() || !editingNote) {
      return;
    }

    updateNoteMutation.mutate({
      noteId: editingNote,
      content: editContent.trim(),
      isPublic: editIsPublic,
    });
  };

  const handleCancelEdit = () => {
    setEditingNote(null);
    setEditContent("");
    setEditIsPublic(true);
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "admin": return "default";
      case "compliance": return "secondary";
      case "agent": return "outline";
      default: return "outline";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <MessageSquare className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-muted-foreground">Loading notes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Add New Note */}
      <Card data-testid="card-add-note">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add New Note
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="Enter your note here..."
            value={newNoteContent}
            onChange={(e) => setNewNoteContent(e.target.value)}
            rows={3}
            data-testid="textarea-new-note"
          />
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Switch
                id="new-note-public"
                checked={newNoteIsPublic}
                onCheckedChange={setNewNoteIsPublic}
                data-testid="switch-new-note-public"
              />
              <Label htmlFor="new-note-public">Public note</Label>
            </div>
            <Button 
              onClick={handleCreateNote}
              disabled={createNoteMutation.isPending || !newNoteContent.trim()}
              data-testid="button-add-note"
            >
              {createNoteMutation.isPending ? (
                <>
                  <Save className="h-4 w-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Note
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Notes Timeline */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare className="h-5 w-5" />
          <h3 className="text-lg font-semibold">Case Timeline</h3>
          <Badge variant="secondary" data-testid="badge-notes-count">
            {notes.length} {notes.length === 1 ? 'note' : 'notes'}
          </Badge>
        </div>

        {notes.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h4 className="text-lg font-semibold mb-2">No notes yet</h4>
              <p className="text-muted-foreground">
                Add the first note to start tracking case updates and communications.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {notes.map((note, index) => (
              <Card key={note.id} className="relative" data-testid={`card-note-${note.id}`}>
                {/* Timeline connector */}
                {index < notes.length - 1 && (
                  <div className="absolute left-8 top-12 w-px h-full bg-border -translate-x-px"></div>
                )}
                
                <CardContent className="p-6">
                  <div className="flex gap-4">
                    {/* Avatar */}
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarFallback className="text-sm" data-testid={`avatar-${note.id}`}>
                        {getInitials(note.authorUser.name)}
                      </AvatarFallback>
                    </Avatar>

                    {/* Note Content */}
                    <div className="flex-1 min-w-0">
                      {/* Header */}
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium" data-testid={`text-author-${note.id}`}>
                          {note.authorUser.name}
                        </span>
                        <Badge 
                          variant={getRoleBadgeVariant(note.authorUser.role)} 
                          className="text-xs"
                          data-testid={`badge-role-${note.id}`}
                        >
                          {note.authorUser.role}
                        </Badge>
                        {!note.isPublic && (
                          <Badge variant="outline" className="text-xs" data-testid={`badge-private-${note.id}`}>
                            Private
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground" data-testid={`time-${note.id}`}>
                          <Clock className="h-3 w-3 inline mr-1" />
                          {formatDistanceToNow(new Date(note.createdAt), { addSuffix: true })}
                        </span>
                        {note.updatedAt !== note.createdAt && (
                          <span className="text-xs text-muted-foreground" data-testid={`edited-${note.id}`}>
                            (edited)
                          </span>
                        )}
                      </div>

                      {/* Note Content or Edit Form */}
                      {editingNote === note.id ? (
                        <div className="space-y-4">
                          <Textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            rows={3}
                            data-testid={`textarea-edit-${note.id}`}
                          />
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <Switch
                                id={`edit-public-${note.id}`}
                                checked={editIsPublic}
                                onCheckedChange={setEditIsPublic}
                                data-testid={`switch-edit-public-${note.id}`}
                              />
                              <Label htmlFor={`edit-public-${note.id}`}>Public note</Label>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={handleCancelEdit}
                                data-testid={`button-cancel-edit-${note.id}`}
                              >
                                <X className="h-4 w-4 mr-1" />
                                Cancel
                              </Button>
                              <Button
                                size="sm"
                                onClick={handleUpdateNote}
                                disabled={updateNoteMutation.isPending || !editContent.trim()}
                                data-testid={`button-save-edit-${note.id}`}
                              >
                                {updateNoteMutation.isPending ? (
                                  <>
                                    <Save className="h-4 w-4 mr-1 animate-spin" />
                                    Saving...
                                  </>
                                ) : (
                                  <>
                                    <Save className="h-4 w-4 mr-1" />
                                    Save
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <p className="text-sm whitespace-pre-wrap" data-testid={`content-${note.id}`}>
                            {note.content}
                          </p>
                          <div className="mt-2 flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEditNote(note)}
                              data-testid={`button-edit-${note.id}`}
                            >
                              <Edit2 className="h-3 w-3 mr-1" />
                              Edit
                            </Button>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(note.createdAt), "MMM d, yyyy 'at' h:mm a")}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}