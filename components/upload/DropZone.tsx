"use client";

import { useState, useRef, DragEvent, ChangeEvent } from "react";
import { Upload, FileImage, X } from "lucide-react";

interface DropZoneProps {
  onFiles: (files: File[]) => void;
  multiple?: boolean;
  accept?: string;
  maxFiles?: number;
  maxSize?: number; // in bytes
}

const DEFAULT_ACCEPT = "image/jpeg,image/png,image/webp";

export default function DropZone({
  onFiles,
  multiple = false,
  accept = DEFAULT_ACCEPT,
  maxFiles = 10,
  maxSize = 10 * 1024 * 1024,
}: DropZoneProps) {
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function validateAndEmit(fileList: FileList) {
    setError(null);
    const files = Array.from(fileList);
    const acceptedTypes = accept.split(",");

    // Check file count
    if (files.length > maxFiles) {
      setError(`Maximum ${maxFiles} files allowed`);
      return;
    }

    // Validate each file
    for (const file of files) {
      const ext = file.name.split(".").pop()?.toLowerCase();
      const validType = acceptedTypes.some(
        (t) =>
          t.trim() === file.type ||
          t.trim().endsWith("/*") ||
          ext === t.trim().replace("image/", ""),
      );

      if (!validType) {
        setError(`Unsupported file type: ${file.name}`);
        return;
      }

      if (file.size > maxSize) {
        setError(`File too large (max 10 MB): ${file.name}`);
        return;
      }
    }

    onFiles(files);
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    setDragging(true);
  }

  function handleDragLeave() {
    setDragging(false);
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length > 0) {
      validateAndEmit(e.dataTransfer.files);
    }
  }

  function handleClick() {
    inputRef.current?.click();
  }

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      validateAndEmit(e.target.files);
    }
    // Reset so the same file can be selected again
    e.target.value = "";
  }

  return (
    <div className="space-y-3">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-10 transition-colors ${
          dragging
            ? "border-accent bg-accent/5"
            : "border-border hover:border-accent/50 hover:bg-card-hover"
        }`}
      >
        <div className="rounded-full bg-accent/10 p-4">
          {dragging ? (
            <Upload className="h-6 w-6 text-accent" />
          ) : (
            <FileImage className="h-6 w-6 text-muted" />
          )}
        </div>
        <div className="text-center">
          <p className="text-sm font-medium">
            {dragging
              ? "Drop files here"
              : multiple
                ? "Drag & drop images here, or tap to browse"
                : "Drag & drop an image here, or tap to browse"}
          </p>
          <p className="mt-1 text-xs text-muted">
            JPEG, PNG, WebP &bull; Max {multiple ? `${maxFiles} files` : "10 MB"}
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleChange}
          className="hidden"
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500">
          <X className="h-4 w-4 shrink-0" />
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-auto shrink-0 hover:text-red-400"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
