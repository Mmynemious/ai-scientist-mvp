import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface FileUploadProps {
  onFilesUpload: (files: File[]) => void;
  onSkip: () => void;
  isUploading?: boolean;
  uploadProgress?: number;
}

export function FileUpload({ 
  onFilesUpload, 
  onSkip, 
  isUploading = false,
  uploadProgress = 0 
}: FileUploadProps) {
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setUploadedFiles(prev => [...prev, ...acceptedFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    multiple: true
  });

  const handleUpload = () => {
    if (uploadedFiles.length > 0) {
      onFilesUpload(uploadedFiles);
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Card className="overflow-hidden">
      <div className="bg-gray-500 text-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center text-sm font-bold">
              2
            </div>
            <h3 className="text-lg font-semibold">File Agent</h3>
          </div>
          <Badge variant="secondary" className="bg-white bg-opacity-20 text-white">
            {isUploading ? 'Processing...' : 'Ready for Upload'}
          </Badge>
        </div>
      </div>
      
      <div className="p-6">
        {isUploading && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Uploading files...</span>
              <span className="text-sm text-gray-500">{uploadProgress}%</span>
            </div>
            <Progress value={uploadProgress} className="h-2" />
          </div>
        )}

        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
            isDragActive 
              ? 'border-primary bg-blue-50' 
              : 'border-gray-300 hover:border-primary'
          }`}
        >
          <input {...getInputProps()} />
          <div className="space-y-4">
            <i className="fas fa-cloud-upload-alt text-4xl text-gray-400" />
            <div>
              <h4 className="text-lg font-medium text-gray-900">Upload Research Documents</h4>
              <p className="text-gray-600 mt-1">
                {isDragActive 
                  ? 'Drop the files here...' 
                  : 'Drag and drop PDF files or click to browse'
                }
              </p>
            </div>
            <p className="text-xs text-gray-500">
              Supported formats: PDF, DOC, DOCX (Max 10MB each)
            </p>
          </div>
        </div>

        {uploadedFiles.length > 0 && (
          <div className="mt-6">
            <h5 className="font-medium text-gray-900 mb-3">Selected Files</h5>
            <div className="space-y-2">
              {uploadedFiles.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <i className="fas fa-file-alt text-blue-500" />
                    <div>
                      <div className="font-medium text-sm">{file.name}</div>
                      <div className="text-xs text-gray-500">{formatFileSize(file.size)}</div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(index)}
                    disabled={isUploading}
                  >
                    <i className="fas fa-times" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-center space-x-4 mt-6">
          <Button 
            onClick={handleUpload}
            disabled={uploadedFiles.length === 0 || isUploading}
            className="px-6"
          >
            <i className="fas fa-file-upload mr-2" />
            {isUploading ? 'Processing...' : `Upload ${uploadedFiles.length} Files`}
          </Button>
          <Button 
            variant="outline" 
            onClick={onSkip}
            disabled={isUploading}
            className="px-6"
          >
            Skip & Continue
          </Button>
        </div>
      </div>
    </Card>
  );
}
