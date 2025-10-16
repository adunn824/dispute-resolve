import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, Download, Trash2, FileText, Image, FileArchive, Plus, AlertCircle } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface Document {
  id: string;
  caseId: string;
  key: string;
  label: string;
  fileType: string;
  mime: string;
  storageKey: string;
  uploadedByUserId: string;
  uploadedAt: string;
}

interface DocumentsTabProps {
  caseId: string;
}

export function DocumentsTab({ caseId }: DocumentsTabProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  // Fetch documents for this case
  const { data: documents = [], isLoading, refetch } = useQuery<Document[]>({
    queryKey: ["/api/cases", caseId, "documents"],
    enabled: !!caseId,
  });

  // Upload document mutation
  const uploadMutation = useMutation({
    mutationFn: async (fileData: { file: File; key?: string; label?: string }) => {
      const { file, key, label } = fileData;
      
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('file', file);
      if (key) formData.append('key', key);
      if (label) formData.append('label', label);

      // Upload file using fetch directly (not apiRequest since it's FormData)
      const response = await fetch(`/api/cases/${caseId}/documents/upload`, {
        method: 'POST',
        body: formData,
        credentials: 'include', // Include session cookies
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases", caseId, "documents"] });
      setUploadDialogOpen(false);
      setSelectedFile(null);
      toast({ title: "Success", description: "Document uploaded successfully" });
    },
    onError: (error) => {
      console.error("Upload error:", error);
      toast({ title: "Error", description: "Failed to upload document", variant: "destructive" });
    },
  });

  // Download document mutation
  const downloadMutation = useMutation({
    mutationFn: async (documentId: string) => {
      const response = await fetch(`/api/documents/${documentId}/download`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Download failed' }));
        throw new Error(errorData.message || 'Failed to download document');
      }

      // Get filename from Content-Disposition header if available
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = 'download';
      if (contentDisposition) {
        const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(contentDisposition);
        if (matches && matches[1]) {
          filename = matches[1].replace(/['"]/g, '');
        }
      }

      // Get the blob from the response
      const blob = await response.blob();
      
      // Create a download link and trigger it
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      return { filename };
    },
    onSuccess: (data) => {
      toast({ title: "Success", description: `Downloaded ${data.filename}` });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to download document", variant: "destructive" });
    },
  });

  // Delete document mutation
  const deleteMutation = useMutation({
    mutationFn: (documentId: string) => 
      apiRequest(`/api/documents/${documentId}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases", caseId, "documents"] });
      toast({ title: "Success", description: "Document deleted successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete document", variant: "destructive" });
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setUploadDialogOpen(true);
    }
    event.target.value = "";
  };

  const handleUpload = (key?: string, label?: string) => {
    if (!selectedFile) return;
    
    setUploading(true);
    uploadMutation.mutate(
      { file: selectedFile, key, label },
      {
        onSettled: () => setUploading(false),
      }
    );
  };

  const handleDownload = (documentId: string) => {
    downloadMutation.mutate(documentId);
  };

  const handleDelete = (documentId: string) => {
    if (confirm("Are you sure you want to delete this document?")) {
      deleteMutation.mutate(documentId);
    }
  };

  const getFileTypeFromMime = (mimeType: string): string => {
    if (mimeType.startsWith('image/')) return 'IMAGE';
    if (mimeType === 'application/pdf') return 'PDF';
    if (mimeType.includes('document') || mimeType.includes('word')) return 'DOCUMENT';
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return 'SPREADSHEET';
    return 'OTHER';
  };

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case "IMAGE":
        return <Image className="h-5 w-5" />;
      case "PDF":
        return <FileText className="h-5 w-5" />;
      default:
        return <FileArchive className="h-5 w-5" />;
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="space-y-6" data-testid="tab-content-documents">
      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle>Document Upload</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-2">
                Drag and drop files here, or click to browse
              </p>
              <Input
                type="file"
                className="hidden"
                id="file-upload"
                onChange={handleFileSelect}
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                data-testid="input-file-upload"
              />
              <Button asChild variant="outline">
                <label htmlFor="file-upload" className="cursor-pointer">
                  <Plus className="h-4 w-4 mr-2" />
                  Choose Files
                </label>
              </Button>
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Supported formats: PDF, JPG, PNG, DOC, DOCX. Maximum file size: 10MB
              </AlertDescription>
            </Alert>
          </div>
        </CardContent>
      </Card>

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedFile && (
              <div className="p-4 border rounded-lg">
                <div className="flex items-center space-x-2">
                  {getFileIcon(getFileTypeFromMime(selectedFile.type))}
                  <div>
                    <p className="font-medium">{selectedFile.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatFileSize(selectedFile.size)} • {selectedFile.type}
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="document-key">Document Key (optional)</Label>
              <Input
                id="document-key"
                placeholder="e.g., loan_agreement, customer_id"
                data-testid="input-document-key"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="document-label">Document Label (optional)</Label>
              <Input
                id="document-label"
                placeholder="e.g., Loan Agreement, Customer ID Verification"
                data-testid="input-document-label"
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => {
                  setUploadDialogOpen(false);
                  setSelectedFile(null);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  const key = (document.getElementById('document-key') as HTMLInputElement)?.value;
                  const label = (document.getElementById('document-label') as HTMLInputElement)?.value;
                  handleUpload(key, label);
                }}
                disabled={uploading}
                data-testid="button-upload-confirm"
              >
                {uploading ? "Uploading..." : "Upload"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Documents Table */}
      <Card>
        <CardHeader>
          <CardTitle>Uploaded Documents</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading documents...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Document</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Uploaded</TableHead>
                  <TableHead>Key</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        {getFileIcon(doc.fileType)}
                        <div>
                          <p className="font-medium">{doc.label}</p>
                          <p className="text-sm text-muted-foreground">
                            {doc.mime}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {doc.fileType}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p>{formatDate(doc.uploadedAt)}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-1 py-0.5 rounded">
                        {doc.key}
                      </code>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownload(doc.id)}
                          disabled={downloadMutation.isPending}
                          data-testid={`button-download-${doc.id}`}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        {user?.canDelete && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(doc.id)}
                            disabled={deleteMutation.isPending}
                            data-testid={`button-delete-${doc.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {documents.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No documents uploaded yet
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}