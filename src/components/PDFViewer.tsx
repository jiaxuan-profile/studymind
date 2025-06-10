import React, { useState } from 'react';
import { FileText, Eye, Download, ExternalLink, AlertCircle } from 'lucide-react';

interface PDFViewerProps {
  pdfUrl: string;
  fileName: string;
  className?: string;
}

const PDFViewer: React.FC<PDFViewerProps> = ({ pdfUrl, fileName, className = '' }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const handleIframeLoad = () => {
    setIsLoading(false);
  };

  const handleIframeError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  const openInNewTab = () => {
    window.open(pdfUrl, '_blank');
  };

  const downloadPDF = () => {
    const link = document.createElement('a');
    link.href = pdfUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className={`bg-white rounded-lg border border-gray-200 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FileText className="h-5 w-5 text-red-600" />
            <span className="font-medium text-gray-900 truncate">{fileName}</span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={openInNewTab}
              className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              title="Open in new tab"
            >
              <ExternalLink className="h-4 w-4 mr-1" />
              Open
            </button>
            <button
              onClick={downloadPDF}
              className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              title="Download PDF"
            >
              <Download className="h-4 w-4 mr-1" />
              Download
            </button>
          </div>
        </div>
      </div>

      {/* PDF Content */}
      <div className="relative" style={{ height: '600px' }}>
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-sm text-gray-600">Loading PDF...</p>
            </div>
          </div>
        )}

        {hasError ? (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Unable to display PDF</h3>
              <p className="text-sm text-gray-600 mb-4">
                Your browser may not support PDF viewing in frames.
              </p>
              <div className="space-x-2">
                <button
                  onClick={openInNewTab}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View in New Tab
                </button>
                <button
                  onClick={downloadPDF}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </button>
              </div>
            </div>
          </div>
        ) : (
          <iframe
            src={`${pdfUrl}#toolbar=1&navpanes=1&scrollbar=1`}
            className="w-full h-full border-0"
            title={`PDF Viewer - ${fileName}`}
            onLoad={handleIframeLoad}
            onError={handleIframeError}
          />
        )}
      </div>
    </div>
  );
};

export default PDFViewer;