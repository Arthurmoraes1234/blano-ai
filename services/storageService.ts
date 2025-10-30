import { supabase } from './supabaseClient';

// This service now interacts with Supabase Storage.
// Make sure you have a bucket named 'artworks' with public read access.

const uploadArtwork = async (
  agencyId: number,
  projectId: number,
  file: File
): Promise<string> => {
  const fileExtension = file.name.split('.').pop();
  const filePath = `${agencyId}/${projectId}/${Date.now()}.${fileExtension}`;

  const { error: uploadError } = await supabase.storage
    .from('artworks') // Your bucket name
    .upload(filePath, file);
    
  if (uploadError) {
    console.error('Error uploading file to Supabase:', uploadError);
    throw new Error(uploadError.message);
  }

  const { data } = supabase.storage
    .from('artworks')
    .getPublicUrl(filePath);

  if (!data || !data.publicUrl) {
      throw new Error("Could not get public URL for uploaded file.");
  }

  return data.publicUrl;
};

export const storageService = {
  uploadArtwork,
};