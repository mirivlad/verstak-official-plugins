# Todos

Todos are stored by the official `verstak.todo` plugin under the canonical
`todos:global` settings key. A todo is global when `workspaceRootPath` is empty;
otherwise that field identifies the top-level workspace folder that owns it.

The global Todos view aggregates all records and supports workspace, status, text,
and due/reminder/updated sorting filters. The workspace Todos view shows only
records whose `workspaceRootPath` exactly matches the current workspace. This
keeps unassigned and other-workspace records out of a workspace tab and its
Overview signals.

## Stored fields

Each record has a stable `id`, `title`, optional `description`, optional
`workspaceRootPath` and `workspaceName`, `status` (`open`, `done`, or
`cancelled`), `priority`, optional `dueAt` and `reminderAt`, `createdAt`,
`updatedAt`, and optional `completedAt`. The model also reserves `sourceUrl` and
`linkedJournalEntryId` for future source/link integrations.

## Reminders

The plugin stores reminder metadata and renders clear indicators for overdue,
due-soon, and reminder-due todos. Verstak does not yet have a notification
scheduler, so a reminder does not create a native desktop notification or run in
the background.

## Completed Todo to Journal

From a workspace Todo tab, a completed todo exposes **Create Journal Entry**. It
opens the current workspace Journal with a normal, editable form. The form copies
only factual data from the todo: title, description, completion date, and zero
minutes. It never generates a summary, duration, or billable status.

The user can edit the Journal form before saving. The saved Journal entry records
`sourceTodoId`, which prevents a second Journal entry from being created from the
same todo. The Journal plugin owns that link; Todo does not write into Journal
storage and therefore does not currently populate `linkedJournalEntryId` on its
own record.

## Visibility

The Plugin Manager can globally enable or disable the Todo plugin. The current
workspace host has no per-workspace or template-level contribution filter yet, so
a globally enabled Todo plugin contributes its tab to every workspace. Template
visibility will be handled with the workspace/template model rather than by a
Todo-specific exception.
