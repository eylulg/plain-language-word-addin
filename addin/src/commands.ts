// The ribbon button only opens the task pane. Office still requires a function
// file for desktop add-in commands, and that file must call onReady.
Office.onReady().catch(reportError);
