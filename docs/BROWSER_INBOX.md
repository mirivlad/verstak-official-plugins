# Browser Inbox

Browser Inbox is one global queue of browser captures. New and changed records are
stored in `captures:global`; previous `captures` and `captures:workspace:*` keys
remain readable for migration compatibility.

Each capture contains `workspaceRootPath` and `processed`. An empty
`workspaceRootPath` means the capture is **Unassigned**. The global view can filter
all captures by assignment, workspace, processed state, and text search. A capture
can be assigned, reassigned, made unassigned, marked processed or unprocessed, and
deleted.

The local browser receiver adds the currently active workspace before publishing a
capture event. When it has no active workspace, the capture remains unassigned
unless an explicit existing domain binding matches it. The frontend never assigns an
untagged capture merely because a workspace view happens to be open.

Workspace assignment currently uses the top-level vault folder path as the
identifier because the core workspace model has no separate immutable ID. In the
current model that path is also the displayed workspace name, so a workspace rename
requires a later reassignment of existing captures.

Workspace Inbox and Overview show only captures whose `workspaceRootPath` exactly
matches the selected workspace. Unassigned captures remain visible only in the
global Browser Inbox.
