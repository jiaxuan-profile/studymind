import React, { useState } from 'react';
import { Upload, FileText, AlertCircle } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import { useStore } from '../store';

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

const PdfUploader: React.FC = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { addNote } = useStore();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      setError(null);

      // Read PDF content
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      let fullText = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ');
        fullText += pageText + '\n\n';
      }

      // Create a new note from the PDF content
      const noteId = Math.random().toString(36).substring(2, 11);
      const now = new Date();
      
      addNote({
        id: noteId,
        title: file.name.replace('.pdf', ''),
        content: fullText,
        tags: ['PDF Import'],
        createdAt: now,
        updatedAt: now,
      });

      // Reset the file input
      event.target.value = '';
      
    } catch (err) {
      setError('Failed to process PDF. Please try again.');
      console.error('PDF processing error:', err);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="w-full">
      <label className="block w-full">
        <div className={`relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          isUploading 
            ? 'bg-gray-50 border-gray-300' 
            : 'hover:bg-primary/5 border-primary/20'
        }`}>
          <input
            type="file"
            className="hidden"
            accept=".pdf"
            onChange={handleFileUpload}
            disabled={isUploading}
          />
          
          <div className="flex flex-col items-center">
            {isUploading ? (
              <>
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mb-3"></div>
                <p className="text-gray-600">Processing PDF...</p>
              </>
            ) : (
              <>
                <Upload className="h-10 w-10 text-primary mb-3" />
                <p className="text-gray-600">
                  Drop your PDF here or click to upload
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  PDF files only
                </p>
              </>
            )}
          </div>
        </div>
      </label>

      {error && (
        <div className="mt-3 flex items-center text-red-600 text-sm">
          <AlertCircle className="h-4 w-4 mr-1" />
          {error}
        </div>
      )}
    </div>
  );
};

export default PdfUploader;