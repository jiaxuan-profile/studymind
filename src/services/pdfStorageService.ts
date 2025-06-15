import { supabase } from './supabase';

const STORAGE_BUCKET = 'pdfs';

export interface PDFUploadResult {
  path: string;
  publicUrl: string;
  fileName: string;
}

export async function uploadPDFToStorage(file: File, noteId: string): Promise<PDFUploadResult> {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Create a unique file path
    const fileExt = file.name.split('.').pop();
    const fileName = `${noteId}.${fileExt}`;
    const filePath = `${user.id}/${fileName}`;

    console.log('PDF Storage: Uploading PDF to storage:', { filePath, fileSize: file.size });

    // Upload file to Supabase Storage
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true // Allow overwriting if file exists
      });

    if (error) {
      console.error('PDF Storage: Upload error:', error);
      throw new Error(`Failed to upload PDF: ${error.message}`);
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(filePath);

    console.log('PDF Storage: PDF uploaded successfully:', { path: data.path, publicUrl });

    return {
      path: data.path,
      publicUrl,
      fileName: file.name
    };

  } catch (error) {
    console.error('PDF Storage: Error uploading PDF:', error);
    throw error;
  }
}

export async function deletePDFFromStorage(filePath: string): Promise<void> {
  try {
    console.log('PDF Storage: Attempting to delete PDF file:', filePath);

    // Ensure we have the correct file path format
    let pathToDelete = filePath;
    
    // If the path doesn't include the user ID prefix, we need to construct it
    if (!pathToDelete.includes('/')) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        pathToDelete = `${user.id}/${filePath}`;
      }
    }

    console.log('PDF Storage: Deleting file at path:', pathToDelete);

    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove([pathToDelete]);

    if (error) {
      console.error('PDF Storage: Delete error:', error);
      
      // If the file doesn't exist, that's actually okay - it means it's already gone
      if (error.message?.includes('not found') || error.message?.includes('does not exist')) {
        console.log('PDF Storage: File not found in storage (may have been already deleted)');
        return;
      }
      
      throw new Error(`Failed to delete PDF: ${error.message}`);
    }

    console.log('PDF Storage: PDF deleted successfully from storage:', pathToDelete);
  } catch (error) {
    console.error('PDF Storage: Error deleting PDF:', error);
    throw error;
  }
}

export function getPDFViewerUrl(publicUrl: string): string {
  // Return URL that can be used in an iframe or new tab
  return publicUrl;
}