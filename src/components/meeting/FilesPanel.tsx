import React, { useRef } from "react";
import { FileText, Download, Paperclip } from "lucide-react";
import { SharedFile } from "./types";

interface FilesPanelProps {
  sharedFiles: SharedFile[];
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function FilesPanel({ sharedFiles, onFileUpload }: FilesPanelProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  return (
    <div className="flex flex-col gap-4 text-left h-full">
      <div className="flex justify-between items-center font-mono text-[10px] uppercase text-theme-text-muted">
        <span>Shared Documents</span>
        <span>Count: {sharedFiles.length}</span>
      </div>

      <div className="flex flex-col gap-2 overflow-y-auto pr-1 flex-1 min-h-0">
        {sharedFiles.length === 0 ? (
          <p className="text-[10px] text-theme-text-muted text-center py-4">No files shared yet.</p>
        ) : (
          sharedFiles.map((f, i) => (
            <div key={i} className="p-3 bg-theme-surface/50 border border-theme-border/20 rounded-xl flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="w-5 h-5 text-indigo-400 shrink-0" />
                <div className="flex flex-col min-w-0">
                  <span className="text-theme-text-primary font-medium truncate max-w-[130px]" title={f.name}>
                    {f.name}
                  </span>
                  <span className="text-[9px] font-mono text-theme-text-muted truncate">
                    {f.size} • {f.sender}
                  </span>
                </div>
              </div>
              
              {f.fileUrl && (
                <a
                  href={f.fileUrl}
                  download={f.name}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded hover:bg-theme-text-primary/10 text-theme-text-secondary hover:text-theme-text-primary cursor-pointer outline-none shrink-0"
                  title="Download Document"
                >
                  <Download className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          ))
        )}
      </div>

      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        onChange={onFileUpload}
      />
      
      <div
        onClick={() => fileInputRef.current?.click()}
        className="border border-dashed border-theme-border hover:border-theme-text-primary transition-colors py-6 text-center rounded-xl cursor-pointer bg-theme-bg/20 flex flex-col items-center justify-center gap-1.5 shrink-0"
      >
        <Paperclip className="w-5 h-5 text-theme-text-muted" />
        <span className="text-[10px] text-theme-text-secondary font-medium">Click to upload document file</span>
        <span className="text-[8px] font-mono text-theme-text-muted">Max size: 100MB</span>
      </div>
    </div>
  );
}
