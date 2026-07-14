# Browser Inbox

Browser Inbox is one global queue of browser captures. New and changed records are
stored in `captures:global`; previous `captures` and `captures:workspace:*` keys
remain readable for migration compatibility.

Each capture contains a durable `workspaceId`, its current or historical
`workspaceRootPath`, and `processed`. An empty `workspaceRootPath` means the
capture is **Unassigned**. The global view can filter all captures by assignment,
Deal, processed state, and text search. A capture
can be assigned, reassigned, made unassigned, marked processed or unprocessed, and
deleted.

The local browser receiver adds the currently active Deal before publishing a
capture event. When it has no active Deal, the capture remains unassigned
unless an explicit existing domain binding matches it. The frontend never assigns an
untagged capture merely because a Deal view happens to be open.

Deal assignment uses the immutable `workspaceId` stored in Deal metadata;
`workspaceRootPath` is an address and display value. A rename updates the latter,
while a newly created folder with the old name cannot take over existing captures.

Deal Inbox and Overview show only captures whose `workspaceId` matches the selected
Deal. Unassigned captures remain visible only in the
global Browser Inbox.
