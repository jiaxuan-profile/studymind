// src/services/databaseServiceClient.ts
const UPDATE_NOTE_ENDPOINT = '/api/update-note';

interface NotePayload {
  id: string;
  title: string;
  content: string;
  tags: string[];
  embedding?: number[]; 
  updatedAt: string;
  createdAt?: string; 
}

export async function saveNoteToDatabase(noteData: NotePayload): Promise<any> {
  try {
    console.log("Client: Calling /api/update-note with payload:", noteData);
    const response = await fetch(UPDATE_NOTE_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(noteData),
    });

    const responseData = await response.json();

    if (!response.ok) {
      throw new Error(responseData.error || `Failed to save note: ${response.status}`);
    }
    console.log("Client: Note saved successfully via API:", responseData);
    return responseData;
  } catch (error) {
    console.error('Client: Error saving note to database:', error);
    throw error;
  }
}