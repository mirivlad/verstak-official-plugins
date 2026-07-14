# Todos

Todos are stored by the official `verstak.todo` plugin under the canonical
`todos:global` settings key. A todo is global when `workspaceRootPath` is empty;
otherwise that field identifies the top-level Deal folder that owns it.

The global Todos view aggregates all records and supports Deal, status, text,
and due/reminder/updated sorting filters. The Deal Todos view shows only records
whose `workspaceRootPath` exactly matches the current Deal. This keeps unassigned
and other-Deal records out of a Deal tab and its
Overview signals.

## Stored fields

Each record has a stable `id`, `title`, optional `description`, optional
`workspaceRootPath` and `workspaceName`, `status` (`open`, `done`, or
`cancelled`), `priority`, optional `dueAt` and `reminderAt`, `createdAt`,
`updatedAt`, and optional `completedAt`. The model also reserves `sourceUrl` and
`linkedJournalEntryId` for future source/link integrations.

## Reminders

The plugin stores reminder metadata, renders clear indicators for overdue,
due-soon, and reminder-due todos, and schedules native desktop notifications when
the Desktop notification capability is available. Without that capability, the
reminder remains visible in Todos but is not treated as an error.

## Completed Todo to Journal

From a Deal Todo tab, a completed todo exposes **Create Journal Entry**. It opens
the current Deal Journal with a normal, editable form. The form copies
only factual data from the todo: title, description, completion date, and zero
minutes. It never generates a summary, duration, or billable status.

The user can edit the Journal form before saving. The saved Journal entry records
`sourceTodoId`, which prevents a second Journal entry from being created from the
same todo. The Journal plugin owns that link; Todo does not write into Journal
storage and therefore does not currently populate `linkedJournalEntryId` on its
own record.

## Visibility

The Plugin Manager can globally enable or disable the Todo plugin. A Deal template
controls whether its Todos tab is available; disabling the plugin hides the tab
without affecting stored todo records.
