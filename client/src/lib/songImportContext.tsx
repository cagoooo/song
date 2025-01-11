import { createContext, useContext, useState } from "react";

interface ImportedSong {
  title: string;
  artist: string;
  notes?: string;
}

interface SongImportContextType {
  importedSong: ImportedSong | null;
  setImportedSong: (song: ImportedSong) => void;
}

const SongImportContext = createContext<SongImportContextType | null>(null);

export function SongImportProvider({ children }: { children: React.ReactNode }) {
  const [importedSong, setImportedSong] = useState<ImportedSong | null>(null);

  return (
    <SongImportContext.Provider value={{ importedSong, setImportedSong }}>
      {children}
    </SongImportContext.Provider>
  );
}

export function useSongImport() {
  const context = useContext(SongImportContext);
  if (!context) {
    throw new Error("useSongImport must be used within a SongImportProvider");
  }
  return context;
}