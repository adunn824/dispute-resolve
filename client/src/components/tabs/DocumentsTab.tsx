import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, Download, FileText, Image, FileArchive, Eye, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface DocumentsTabProps {
  caseId: string;
}

// Mock documents data - TODO: remove mock functionality
const mockDocuments = [
  {
    id: "doc-1",
    key: "loan_agreement",
    label: "Loan Agreement",
    fileType: "PDF",
    fileName: "loan_agreement_12345.pdf",
    size: "2.3 MB",
    uploadedBy: "Sarah Johnson",
    uploadedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    isRequired: true,
    downloadUrl: "#"
  },
  {
    id: "doc-2",
    key: "customer_id",
    label: "Customer ID Verification", 
    fileType: "IMAGE",
    fileName: "customer_id.jpg",
    size: "1.8 MB",
    uploadedBy: "Mike Chen",
    uploadedAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
    isRequired: true,
    downloadUrl: "#"
  },
  {
    id: "doc-3",
    key: "correspondence",
    label: "Email Correspondence",
    fileType: "PDF",
    fileName: "email_thread.pdf",
    size: "512 KB",
    uploadedBy: "Lisa Rodriguez",
    uploadedAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
    isRequired: false,
    downloadUrl: "#"
  }
];

const requiredDocuments = [
  { key: "loan_agreement", label: "Loan Agreement", mimeTypes: [".pdf", ".doc", ".docx"] },
  { key: "customer_id", label: "Customer ID Verification", mimeTypes: [".jpg", ".png", ".pdf"] },
  { key: "police_report", label: "Police Report (if applicable)", mimeTypes: [".pdf"] },
];

export function DocumentsTab({ caseId }: DocumentsTabProps) {
  const [documents, setDocuments] = useState(mockDocuments);
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    console.log("Uploading file:", file.name);
    
    // Simulate upload delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Add mock document to list
    const newDoc = {
      id: `doc-${Date.now()}`,
      key: "uploaded_document",
      label: "Uploaded Document",
      fileType: file.type.includes('image') ? "IMAGE" : file.type.includes('pdf') ? "PDF" : "OTHER",
      fileName: file.name,
      size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
      uploadedBy: "Current User",
      uploadedAt: new Date(),
      isRequired: false,
      downloadUrl: "#"
    };
    
    setDocuments(prev => [...prev, newDoc]);
    setUploading(false);
    event.target.value = "";
  };

  const handleDownload = (docId: string) => {
    console.log("Downloading document:", docId);
    // TODO: Implement actual download logic
  };

  const handleDelete = (docId: string) => {
    setDocuments(prev => prev.filter(doc => doc.id !== docId));
    console.log("Deleted document:", docId);
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
              <input
                type="file"
                onChange={handleFileUpload}
                className="hidden"
                id="file-upload"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                data-testid="input-file-upload"
              />
              <Button
                variant="outline"
                onClick={() => document.getElementById('file-upload')?.click()}
                disabled={uploading}
                data-testid="button-upload"
              >
                {uploading ? "Uploading..." : "Choose File"}
              </Button>
            </div>
            
            {/* Required Documents Checklist */}
            <div>
              <h4 className="font-medium mb-2">Required Documents</h4>
              <div className="space-y-2">
                {requiredDocuments.map((reqDoc) => {
                  const uploaded = documents.find(doc => doc.key === reqDoc.key);
                  return (
                    <div key={reqDoc.key} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${uploaded ? 'bg-green-500' : 'bg-orange-500'}`} />
                        <span className="text-sm">{reqDoc.label}</span>
                        <Badge variant="outline" className="text-xs">
                          {reqDoc.mimeTypes.join(", ")}
                        </Badge>
                      </div>
                      {uploaded ? (
                        <Badge variant="default" className="text-xs">Uploaded</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">Required</Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Documents List */}
      <Card>
        <CardHeader>
          <CardTitle>Uploaded Documents ({documents.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {documents.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg hover-elevate">
                <div className="flex items-center gap-3">
                  <div className="text-muted-foreground">
                    {getFileIcon(doc.fileType)}
                  </div>
                  <div>
                    <p className="font-medium">{doc.label}</p>
                    <p className="text-sm text-muted-foreground">
                      {doc.fileName} • {doc.size} • Uploaded by {doc.uploadedBy}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(doc.uploadedAt, { addSuffix: true })}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {doc.isRequired && (
                    <Badge variant="destructive" className="text-xs">Required</Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => console.log("Preview document:", doc.id)}
                    data-testid={`button-preview-${doc.id}`}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDownload(doc.id)}
                    data-testid={`button-download-${doc.id}`}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(doc.id)}
                    data-testid={`button-delete-${doc.id}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            
            {documents.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-8 w-8 mx-auto mb-2" />
                <p>No documents uploaded yet</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}