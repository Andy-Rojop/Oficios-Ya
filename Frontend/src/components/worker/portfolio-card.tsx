'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Pencil } from 'lucide-react';
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
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  // Estado para editar título/descripción de una foto ya guardada
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editError, setEditError] = useState<string | null>(null);

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: WORKER_QUERY_KEYS.portfolio });
    void queryClient.invalidateQueries({ queryKey: WORKER_QUERY_KEYS.completeness });
  }

  const create = useMutation({
    mutationFn: workersApi.createPortfolioItem,
    onSuccess: (created) => {
      setTitle('');
      setDescription('');
      setFile(null);
      setErrors({});
      setSavedNotice(
        `"${created.title}" ya quedó guardado en su portafolio. El formulario se limpió por si desea subir otra foto.`,
      );
      refresh();
    },
  });

  const update = useMutation({
    mutationFn: ({
      id,
      nextTitle,
      nextDescription,
    }: {
      id: string;
      nextTitle: string;
      nextDescription: string | null;
    }) =>
      workersApi.updatePortfolioItem(id, {
        title: nextTitle,
        description: nextDescription,
      }),
    onSuccess: (updated) => {
      setEditingId(null);
      setEditError(null);
      setSavedNotice(`Se guardaron los cambios de "${updated.title}".`);
      refresh();
    },
  });

  const remove = useMutation({
    mutationFn: workersApi.deletePortfolioItem,
    onSuccess: () => {
      setSavedNotice(null);
      refresh();
    },
  });

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSavedNotice(null);
    const found: Record<string, string> = {};
    if (title.trim().length < 2) found.title = 'Escriba un título (mínimo 2 caracteres)';
    if (!file) found.file = 'Elija una imagen antes de guardar en el portafolio';
    setErrors(found);
    if (Object.keys(found).length > 0 || !file) return;

    create.mutate({
      file,
      title: title.trim(),
      description: description.trim() || undefined,
    });
  }

  function startEditing(item: PortfolioItemDto) {
    setSavedNotice(null);
    setEditError(null);
    setEditingId(item.id);
    setEditTitle(item.title);
    setEditDescription(item.description ?? '');
  }

  function onSaveEdit(event: React.FormEvent, itemId: string) {
    event.preventDefault();
    if (editTitle.trim().length < 2) {
      setEditError('Escriba un título (mínimo 2 caracteres)');
      return;
    }
    setEditError(null);
    update.mutate({
      id: itemId,
      nextTitle: editTitle.trim(),
      nextDescription: editDescription.trim() === '' ? null : editDescription.trim(),
    });
  }

  const items = query.data ?? [];

  return (
    <Card className="space-y-5">
      <div className="space-y-1">
        <CardTitle>Portafolio</CardTitle>
        <CardDescription>
          Fotos de trabajos que haya realizado (JPG, PNG o WebP, máx. 5 MB). Cada foto que sube se
          guarda automáticamente en su perfil público.
        </CardDescription>
      </div>

      <form
        onSubmit={onSubmit}
        noValidate
        className="space-y-3 rounded-2xl border border-border bg-brand-soft/25 p-4"
      >
        <p className="text-sm font-semibold text-foreground">Agregar nueva foto al portafolio</p>
        <FormField id="portfolio-title" label="Título de la nueva foto" error={errors.title}>
          {(aria) => (
            <Input
              {...aria}
              value={title}
              maxLength={100}
              placeholder="Ej.: Closet de cedro"
              onChange={(event) => {
                setSavedNotice(null);
                setTitle(event.target.value);
              }}
            />
          )}
        </FormField>
        <FormField id="portfolio-description" label="Descripción (opcional)">
          {(aria) => (
            <Input
              {...aria}
              value={description}
              maxLength={500}
              placeholder="Materiales usados, medidas o detalles del trabajo"
              onChange={(event) => {
                setSavedNotice(null);
                setDescription(event.target.value);
              }}
            />
          )}
        </FormField>
        <div className="space-y-1">
          <ImagePicker
            id="portfolio-file"
            label="Elegir imagen"
            file={file}
            onChange={(selected) => {
              setSavedNotice(null);
              setFile(selected);
              if (selected) {
                setErrors((current) => {
                  const next = { ...current };
                  delete next.file;
                  return next;
                });
              }
            }}
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
          {create.isPending ? 'Guardando foto…' : 'Guardar foto en el portafolio'}
        </Button>
      </form>

      {savedNotice ? <FormMessage tone="success">{savedNotice}</FormMessage> : null}

      {query.isLoading ? <p className="text-sm text-muted">Cargando portafolio…</p> : null}
      {query.isError ? (
        <FormMessage tone="error">{getErrorMessage(query.error)}</FormMessage>
      ) : null}
      {remove.isError ? (
        <FormMessage tone="error">{getErrorMessage(remove.error)}</FormMessage>
      ) : null}
      {update.isError ? (
        <FormMessage tone="error">{getErrorMessage(update.error)}</FormMessage>
      ) : null}

      {!query.isLoading && items.length === 0 ? (
        <p className="text-sm text-muted">Todavía no ha subido fotos a su portafolio.</p>
      ) : null}

      {items.length > 0 ? (
        <div className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">
            Trabajos guardados en su portafolio ({items.length})
          </p>
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
            {items.map((item) => {
              const isEditing = editingId === item.id;
              return (
                <li
                  key={item.id}
                  className="flex flex-col justify-between space-y-2.5 rounded-2xl border border-border bg-surface p-3"
                >
                  <div className="space-y-2">
                    <div className="relative aspect-square overflow-hidden rounded-xl border border-border">
                      <Image
                        src={item.imageUrl}
                        alt={item.title}
                        fill
                        sizes="(min-width: 640px) 33vw, 100vw"
                        className="object-cover"
                      />
                      <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/70 px-2.5 py-0.5 text-[11px] font-semibold text-white">
                        <CheckCircle2 aria-hidden className="size-3 text-emerald-300" />
                        Guardado
                      </span>
                    </div>

                    {isEditing ? (
                      <form
                        onSubmit={(event) => onSaveEdit(event, item.id)}
                        noValidate
                        className="space-y-2 pt-1"
                      >
                        <FormField
                          id={`edit-portfolio-title-${item.id}`}
                          label="Título"
                          error={editError ?? undefined}
                        >
                          {(aria) => (
                            <Input
                              {...aria}
                              value={editTitle}
                              maxLength={100}
                              onChange={(event) => setEditTitle(event.target.value)}
                            />
                          )}
                        </FormField>
                        <FormField
                          id={`edit-portfolio-desc-${item.id}`}
                          label="Descripción (opcional)"
                        >
                          {(aria) => (
                            <Input
                              {...aria}
                              value={editDescription}
                              maxLength={500}
                              onChange={(event) => setEditDescription(event.target.value)}
                            />
                          )}
                        </FormField>
                        <div className="flex flex-wrap gap-2 pt-1">
                          <Button type="submit" size="sm" disabled={update.isPending}>
                            {update.isPending ? 'Guardando…' : 'Guardar cambios'}
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={update.isPending}
                            onClick={() => {
                              setEditingId(null);
                              setEditError(null);
                            }}
                          >
                            Cancelar
                          </Button>
                        </div>
                      </form>
                    ) : (
                      <div className="space-y-0.5">
                        <p className="text-sm font-semibold text-foreground">{item.title}</p>
                        {item.description ? (
                          <p className="text-xs text-muted">{item.description}</p>
                        ) : null}
                      </div>
                    )}
                  </div>

                  {!isEditing ? (
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => startEditing(item)}
                      >
                        <Pencil aria-hidden className="mr-1.5 size-3.5" />
                        Editar texto
                      </Button>
                      <Button
                        type="button"
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
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </Card>
  );
}
