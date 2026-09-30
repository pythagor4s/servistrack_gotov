"use client";

import { useEffect, useState } from "react";
import { createKnowledgeSchema, updateKnowledgeSchema, KB_BODY_MAX } from "@servis-track/shared";

import { TYPE_OPTIONS } from "@/components/badges";
import { DangerZone } from "@/components/dialog-rows";
import { NotebookPen, Trash2 } from "@/components/icons";
import { MarkdownEditor } from "@/components/markdown-editor";
import { NONE, ScopeRows } from "@/components/scope-picker";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FlashInput } from "@/components/ui/flash-input";
import { Label } from "@/components/ui/label";
import { PropertyList, PropertyRow } from "@/components/ui/property-list";
import { Separator } from "@/components/ui/separator";
import { TagInput } from "@/components/ui/tag-input";
import { validateForm, type FieldErrors } from "@/lib/form";
import type { Department, FaultCategory, KnowledgeArticle, Machine } from "@/lib/types";

import { CategoryField } from "./category-field";

export function KbEntryDialog({
  open,
  onOpenChange,
  title,
  submitLabel,
  initial,
  machines,
  departments,
  categories,
  tagSuggestions,
  onSubmit,
  onRequestDelete,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  submitLabel: string;
  initial?: KnowledgeArticle;
  machines: Machine[];
  departments: Department[];
  categories: FaultCategory[];
  tagSuggestions: string[];
  onSubmit: (values: Record<string, unknown>) => void;
  onRequestDelete?: () => void;
}) {
  const [t, setT] = useState("");
  const [body, setBody] = useState("");
  const [type, setType] = useState<string>("MACHINE");
  const [machineId, setMachineId] = useState(NONE);
  const [departmentId, setDepartmentId] = useState(NONE);
  const [categoryId, setCategoryId] = useState(NONE);
  const [tags, setTags] = useState<string[]>([]);
  const [errors, setErrors] = useState<FieldErrors>({});

  const fromTicket = !!initial?.ticketId;
  const isMachine = type === "MACHINE";

  useEffect(() => {
    if (open) {
      setT(initial?.title ?? "");
      setBody(initial?.body ?? "");
      setType(initial?.type ?? "MACHINE");
      setMachineId(initial?.machineId ?? NONE);
      setDepartmentId(initial?.departmentId ?? NONE);
      setCategoryId(initial?.categoryId ?? NONE);
      setTags(initial?.tags ?? []);
      setErrors({});
    }
  }, [open, initial]);

  function submit() {
    const classification = { categoryId: categoryId === NONE ? null : categoryId, tags };
    if (fromTicket) {
      const parsed = validateForm(updateKnowledgeSchema, classification);
      if (!parsed.ok) return setErrors(parsed.errors);
      setErrors({});
      return onSubmit(classification);
    }
    const values = {
      title: t.trim(),
      body: body.trim(),
      type,
      machineId: isMachine && machineId !== NONE ? machineId : null,
      ...(isMachine ? {} : { departmentId: departmentId === NONE ? null : departmentId }),
      ...classification,
    };
    const parsed = validateForm(createKnowledgeSchema, values);
    if (!parsed.ok) return setErrors(parsed.errors);
    setErrors({});
    onSubmit(values);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[32rem]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <NotebookPen className="size-5 shrink-0" />
            {title}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Kratek zapis o odpravljanju napake, ki ga ekipa lahko znova uporabi.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1">
            <FlashInput
              aria-label="Naslov"
              placeholder="Naslov vnosa"
              value={t}
              disabled={fromTicket}
              aria-invalid={!!errors.title}
              onChange={(e) => setT(e.target.value)}
              className="text-lg font-semibold"
            />
            {errors.title && <p className="text-sm text-destructive">{errors.title}</p>}
          </div>

          <PropertyList>
            {!fromTicket && (
              <>
                <PropertyRow label="Vrsta">
                  <Combobox variant="inline" value={type} onChange={setType} options={TYPE_OPTIONS} />
                </PropertyRow>
                <ScopeRows
                  isMachine={isMachine}
                  machines={machines}
                  departments={departments}
                  machineId={machineId}
                  onMachineChange={setMachineId}
                  departmentId={departmentId}
                  onDepartmentChange={setDepartmentId}
                  machineLead="Brez določenega stroja"
                />
              </>
            )}
            <PropertyRow label="Kategorija" error={errors.categoryId}>
              <CategoryField
                value={categoryId}
                onChange={setCategoryId}
                categories={categories}
                suggestFrom={fromTicket ? "" : `${t}\n${body}`}
              />
            </PropertyRow>
            <PropertyRow label="Oznake" error={errors.tags}>
              <TagInput value={tags} onChange={setTags} suggestions={tagSuggestions} />
            </PropertyRow>
          </PropertyList>

          <Separator />
          {fromTicket ? (
            <p className="text-sm text-nav-foreground">
              Vsebina je rešitev ticketa{initial?.ticket?.number ? ` #${initial.ticket.number}` : ""}. Spremeni
              se, ko ticket ponovno zaključite; tu se ureja le razvrstitev.
            </p>
          ) : (
            <div className="space-y-3">
              <Label htmlFor="kb-body" className="font-normal text-muted-foreground">
                Vsebina
              </Label>
              <MarkdownEditor
                id="kb-body"
                value={body}
                onChange={setBody}
                placeholder={"### Vzrok\nKaj je bilo narobe…\n\n### Postopek\n1. …"}
                maxLength={KB_BODY_MAX}
                invalid={!!errors.body}
              />
              {errors.body && <p className="text-sm text-destructive">{errors.body}</p>}
              <p className="text-xs text-nav-foreground">
                Razdelek <code>### Vzrok</code> se pokaže kot povzetek na vrhu zapisa in v Diagnozi.
              </p>
            </div>
          )}
          {initial && onRequestDelete && !fromTicket && (
            <DangerZone
              label="Izbriši ta vnos"
              description="Zapis dokončno odstrani iz baze znanja. Tega ni mogoče razveljaviti."
              actionLabel="Izbriši"
              onAction={onRequestDelete}
            />
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Prekliči
          </Button>
          <Button onClick={submit}>{submitLabel}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function KbDeleteDialog({
  open,
  onOpenChange,
  title,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="size-5 shrink-0" />
            Brisanje vnosa
          </DialogTitle>
          <DialogDescription>
            To trajno izbriše <span className="font-semibold text-primary">{title}</span> iz baze znanja.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Prekliči
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            Izbriši
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
