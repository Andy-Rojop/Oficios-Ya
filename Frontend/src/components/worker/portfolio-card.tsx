'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Image from 'next/image';
import { useState } from 'react';
import { FormField, FormMessage } from '@/components/forms/form-field';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { getErrorMessage } from '@/lib/auth';
import { WORKER_QUERY_KEYS, workersApi, type PortfolioItemDto } from '@/lib/workers';
import { ImagePicker } from './image-picker';

export function PortfolioCard() {
  const queryClient = useQueryClient();
  const query = useQuery<PortfolioItemDto[], Error>({
    queryKey: WORKER_QUERY_KEYS.portfolio,
    queryFn: workersApi.listPortfolio,
  });

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: WORKER_QUERY_KEYS.portfolio });
    void queryClient.invalidateQueries({ queryKey: WORKER_QUERY_KEYS.completeness });
  }

  const create = useMutation({
    mutationFn: workersApi.createPortfolioItem,
    onSuccess: () => {
      setTitle('');
      setDescription('');
      setFile(null);
      refresh();
    },
  });
  const remove = useMutation({ mutationFn: workersApi.deletePortfolioItem, onSuccess: refresh });

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const found: Record<string, string> = {};
    if (title.trim().length < 2) found.title = 'Escribe un título (mínimo 2 caracteres)';
    if (!file) found.file = 'Elige una imagen';
    setErrors(found);
    if (Object.keys(found).length > 0 || !file) return;

    create.mutate({
      file,
      title: title.trim(),
      description: description.trim() || undefined,
    });
  }

  const items = query.data ?? [];

  return (
    <Card className="space-y-4">
      <div className="space-y-1">
        <CardTitle>Portafolio</CardTitle>
        <CardDescription>
          Fotos de trabajos que hayas realizado (JPG, PNG o WebP, máx. 5 MB).
        </CardDescription>
      </div>

      <form onSubmit={onSubmit} noValidate className="space-y-3">
        <FormField id="portfolio-title" label="Título" error={errors.title}>
          {(aria) => (
            <Input
              {...aria}
              value={title}
              maxLength={100}
              placeholder="Ej.: Closet de cedro"
              onChange={(event) => setTitle(event.target.value)}
            />
          )}
        </FormField>
        <FormField id="portfolio-description" label="Descripción (opcional)">
          {(aria) => (
            <Input
              {...aria}
              value={description}
              maxLength={500}
              onChange={(event) => setDescription(event.target.value)}
            />
          )}
        </FormField>
        <div className="space-y-1">
          <ImagePicker
            id="portfolio-file"
            label="Elegir imagen"
            file={file}
            onChange={setFile}
            disabled={create.isPending}
          />
          {errors.file ? (
            <p role="alert" className="text-sm font-medium text-red-700">
              {errors.file}
            </p>
          ) : null}
        </div>
        {create.isError ? (
          <FormMessage tone="error">{getErrorMessage(create.error)}</FormMessage>
        ) : null}
        <Button type="submit" disabled={create.isPending}>
          {create.isPending ? 'Subiendo…' : 'Subir al portafolio'}
        </Button>
      </form>

      {query.isLoading ? <p className="text-sm text-muted">Cargando portafolio…</p> : null}
      {query.isError ? (
        <FormMessage tone="error">{getErrorMessage(query.error)}</FormMessage>
      ) : null}
      {remove.isError ? (
        <FormMessage tone="error">{getErrorMessage(remove.error)}</FormMessage>
      ) : null}
      {!query.isLoading && items.length === 0 ? (
        <p className="text-sm text-muted">Todavía no has subido fotos.</p>
      ) : null}

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {items.map((item) => (
          <li key={item.id} className="space-y-1.5">
            <div className="relative aspect-square overflow-hidden rounded-xl border border-border">
              <Image
                src={item.imageUrl}
                alt={item.title}
                fill
                sizes="(min-width: 640px) 33vw, 50vw"
                className="object-cover"
              />
            </div>
            <p className="truncate text-sm font-semibold">{item.title}</p>
            <Button
              variant="ghost"
              size="sm"
              className="text-red-700 hover:bg-red-50"
              disabled={remove.isPending}
              onClick={() => {
                if (window.confirm(`¿Eliminar "${item.title}" del portafolio?`)) {
                  remove.mutate(item.id);
                }
              }}
            >
              Eliminar
            </Button>
          </li>
        ))}
      </ul>
    </Card>
  );
}
