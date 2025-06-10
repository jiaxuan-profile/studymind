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

    console.log('Uploading PDF to storage:', { filePath, fileSize: file.size });

    // Upload file to Supabase Storage
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true // Allow overwriting if file exists
      });

    if (error) {
      console.error('Storage upload error:', error);
      throw new Error(`Failed to upload PDF: ${error.message}`);
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(filePath);

    console.log('PDF uploaded successfully:', { path: data.path, publicUrl });

    return {
      path: data.path,
      publicUrl,
      fileName: file.name
    };

  } catch (error) {
    console.error('Error uploading PDF:', error);
    throw error;
  }
}

export async function deletePDFFromStorage(filePath: string): Promise<void> {
  try {
    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove([filePath]);

    if (error) {
      console.error('Storage delete error:', error);
      throw new Error(`Failed to delete PDF: ${error.message}`);
    }

    console.log('PDF deleted successfully:', filePath);
  } catch (error) {
    console.error('Error deleting PDF:', error);
    throw error;
  }
}

export function getPDFViewerUrl(publicUrl: string): string {
  // Return URL that can be used in an iframe or new tab
  return publicUrl;
}