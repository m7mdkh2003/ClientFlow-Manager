import { useEffect, useRef } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useForm } from "react-hook-form";
import { X } from "lucide-react";
import type { Client, Project } from "@workspace/api-client-react";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { EditorState, Kind } from "@/lib/workspace";

type Field = {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  options?: { value: string; label: string }[];
  placeholder?: string;
};

const fieldSets: Record<Kind, Field[]> = {
  client: [
    {
      name: "name",
      label: "Client name",
      required: true,
      placeholder: "e.g. Mara Chen",
    },
    { name: "company", label: "Company", placeholder: "Studio or business" },
    {
      name: "email",
      label: "Email",
      type: "email",
      placeholder: "name@company.com",
    },
    { name: "phone", label: "Phone", placeholder: "+1 (555) 000-0000" },
    {
      name: "notes",
      label: "Notes",
      type: "textarea",
      placeholder: "A few details worth remembering…",
    },
  ],
  project: [
    {
      name: "name",
      label: "Project name",
      required: true,
      placeholder: "e.g. Brand refresh",
    },
    { name: "clientId", label: "Client", required: true, type: "select" },
    {
      name: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "planning", label: "Planning" },
        { value: "active", label: "Active" },
        { value: "completed", label: "Completed" },
      ],
    },
    { name: "deadline", label: "Deadline", type: "date" },
    {
      name: "description",
      label: "Description",
      type: "textarea",
      placeholder: "What does this project need to accomplish?",
    },
  ],
  task: [
    {
      name: "title",
      label: "Task",
      required: true,
      placeholder: "e.g. Share first-round concepts",
    },
    { name: "projectId", label: "Project", required: true, type: "select" },
    {
      name: "priority",
      label: "Priority",
      type: "select",
      options: [
        { value: "low", label: "Low" },
        { value: "medium", label: "Medium" },
        { value: "high", label: "High" },
      ],
    },
    {
      name: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "todo", label: "To do" },
        { value: "in_progress", label: "In progress" },
        { value: "done", label: "Done" },
      ],
    },
    { name: "dueDate", label: "Due date", type: "date" },
    {
      name: "description",
      label: "Details",
      type: "textarea",
      placeholder: "Add a little context…",
    },
  ],
};

export function EditorModal({
  editor,
  clients,
  projects,
  busy,
  onClose,
  onSubmit,
}: {
  editor: EditorState;
  clients: Client[];
  projects: Project[];
  busy: boolean;
  onClose: () => void;
  onSubmit: (values: Record<string, string>) => void;
}) {
  const { kind, record, defaults: preset } = editor;
  const form = useForm<Record<string, string>>({ defaultValues: {} });
  useEffect(() => {
    const defaults: Record<string, string> = {};
    fieldSets[kind].forEach(({ name }) => {
      const value = record
        ? (record as unknown as Record<string, unknown>)[name]
        : (preset as Record<string, unknown> | undefined)?.[name];
      defaults[name] =
        value == null
          ? name === "status"
            ? kind === "task"
              ? "todo"
              : "planning"
            : name === "priority"
              ? "medium"
              : ""
          : String(value).slice(
              0,
              name === "deadline" || name === "dueDate" ? 10 : undefined,
            );
    });
    form.reset(defaults);
  }, [form, kind, record, preset]);
  const projectOptions =
    kind === "project"
      ? clients.map((client) => ({
          value: String(client.id),
          label: client.company
            ? `${client.name} · ${client.company}`
            : client.name,
        }))
      : projects.map((project) => ({
          value: String(project.id),
          label: `${project.name} · ${project.clientName}`,
        }));
  const isSubmitting = busy || form.formState.isSubmitting;
  const isDirty = form.formState.isDirty;
  const handleSubmit = form.handleSubmit((values) => onSubmit(values));
  const trigger = useRef(document.activeElement as HTMLElement | null);
  const close = () => {
    if (isSubmitting) return;
    if (isDirty && !window.confirm("Discard your unsaved changes?")) return;
    onClose();
  };
  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      <Dialog.Portal>
        <div className="modal-backdrop">
          <Dialog.Overlay className="editor-overlay" />
          <Dialog.Content
            className="editor-dialog"
            onOpenAutoFocus={(event) => {
              event.preventDefault();
              document
                .getElementById(`${kind}-${kind === "task" ? "title" : "name"}`)
                ?.focus();
            }}
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              trigger.current?.focus();
            }}
          >
            <div className="dialog-top">
              <div>
                <span className="eyebrow">
                  {record ? "MAKE AN UPDATE" : "ADD TO YOUR WORKSPACE"}
                </span>
                <Dialog.Title asChild>
                  <h2 id="editor-title">
                    {record ? "Edit" : "New"} {kind}
                  </h2>
                </Dialog.Title>
                <Dialog.Description className="sr-only">
                  Enter the details, then save your changes.
                </Dialog.Description>
              </div>
              <button
                className="icon-button dialog-close"
                aria-label="Close dialog"
                onClick={close}
                data-testid="button-close-editor"
              >
                <X size={18} />
              </button>
            </div>
            <Form {...form}>
              <form
                onSubmit={handleSubmit}
                className="editor-form"
                data-testid={`form-${kind}`}
              >
                {fieldSets[kind].map((field) => {
                  const options =
                    field.name === "clientId" || field.name === "projectId"
                      ? projectOptions
                      : field.options;
                  const disabled =
                    (field.name === "clientId" && clients.length === 0) ||
                    (field.name === "projectId" && projects.length === 0);
                  return (
                    <div
                      className={`form-field ${field.type === "textarea" ? "form-field-wide" : ""}`}
                      key={field.name}
                    >
                      <label htmlFor={`${kind}-${field.name}`}>
                        {field.label}
                        {field.required && (
                          <span className="required-mark"> *</span>
                        )}
                      </label>
                      {field.type === "textarea" ? (
                        <Textarea
                          id={`${kind}-${field.name}`}
                          placeholder={field.placeholder}
                          {...form.register(field.name, {
                            validate: field.required
                              ? (value) =>
                                  Boolean(value?.trim()) ||
                                  `${field.label} is required`
                              : undefined,
                          })}
                          data-testid={`input-${kind}-${field.name}`}
                        />
                      ) : options ? (
                        <select
                          id={`${kind}-${field.name}`}
                          className="field-select"
                          disabled={disabled}
                          {...form.register(field.name, {
                            validate: field.required
                              ? (value) =>
                                  Boolean(value?.trim()) ||
                                  `${field.label} is required`
                              : undefined,
                          })}
                          data-testid={`select-${kind}-${field.name}`}
                        >
                          <option value="" disabled={Boolean(field.options)}>
                            {disabled
                              ? `Add a ${field.name === "clientId" ? "client" : "project"} first`
                              : `Choose ${field.label.toLowerCase()}`}
                          </option>
                          {options.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <Input
                          id={`${kind}-${field.name}`}
                          type={field.type || "text"}
                          placeholder={field.placeholder}
                          {...form.register(field.name, {
                            validate: field.required
                              ? (value) =>
                                  Boolean(value?.trim()) ||
                                  `${field.label} is required`
                              : undefined,
                          })}
                          data-testid={`input-${kind}-${field.name}`}
                        />
                      )}
                      {form.formState.errors[field.name] && (
                        <span className="field-error">
                          {String(form.formState.errors[field.name]?.message)}
                        </span>
                      )}
                    </div>
                  );
                })}
                <div className="dialog-actions">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={close}
                    data-testid="button-cancel-editor"
                  >
                    Cancel
                  </Button>
                  <Button
                    className="add-button"
                    type="submit"
                    disabled={
                      isSubmitting ||
                      (kind === "project" && clients.length === 0) ||
                      (kind === "task" && projects.length === 0)
                    }
                    data-testid={`button-submit-${kind}`}
                  >
                    {isSubmitting
                      ? "Saving…"
                      : record
                        ? "Save changes"
                        : `Create ${kind}`}
                  </Button>
                </div>
              </form>
            </Form>
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
