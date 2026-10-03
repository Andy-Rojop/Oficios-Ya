'use client';

import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_UPLOAD_MB = 5;

/** Valida tipo y tamaño en el navegador (la API vuelve a validarlo). Devuelve un mensaje o null. */
export function validateImageFile(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return 'Usa una imagen JPG, PNG o WebP.';
  }
  if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
    return `La imagen supera el máximo de ${MAX_UPLOAD_MB} MB.`;
  }
  return null;
}

interface ImagePickerProps {
  id: string;
  label: string;
  file: File | null;
  onChange: (file: File | null) => void;
  disabled?: boolean;
}

/** Selector de imagen con validación previa. */
export function ImagePicker({ id, label, file, onChange, disabled }: ImagePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-1.5">
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        disabled={disabled}
        onChange={(event) => {
          const selected = event.target.files?.[0] ?? null;
          if (selected) {
            const problem = validateImageFile(selected);
            if (problem) {
              setError(problem);
              onChange(null);
              event.target.value = '';
              return;
            }
          }
          setError(null);
          onChange(selected);
        }}
      />
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
        >
          {label}
        </Button>
        <span className="min-w-0 truncate text-sm text-muted">
          {file ? file.name : 'Ninguna imagen seleccionada'}
        </span>
      </div>
      {error ? (
        <p role="alert" className="text-sm font-medium text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
