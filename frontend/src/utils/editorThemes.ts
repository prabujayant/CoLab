import { EditorView } from '@codemirror/view';

export const darkTheme = EditorView.theme({
    '&': {
        height: '100%',
        backgroundColor: '#0f172a', // slate-950
        color: '#e2e8f0' // slate-200
    },
    '.cm-content': {
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        fontSize: '14px',
        padding: '16px 0'
    },
    '.cm-gutters': {
        backgroundColor: '#1e293b', // slate-800
        color: '#64748b', // slate-500
        border: 'none',
        paddingRight: '8px'
    },
    '.cm-activeLineGutter': {
        backgroundColor: '#334155' // slate-700
    },
    '.cm-activeLine': {
        backgroundColor: 'rgba(99, 102, 241, 0.05)' // indigo-500/5
    },
    '.cm-selectionBackground': {
        backgroundColor: 'rgba(99, 102, 241, 0.2) !important'
    },
    '&.cm-focused .cm-selectionBackground': {
        backgroundColor: 'rgba(99, 102, 241, 0.3) !important'
    },
    '.cm-cursor': {
        borderLeftColor: '#6366f1' // indigo-500
    },
    '.cm-ySelectionInfo': {
        backgroundColor: '#334155',
        color: 'white'
    }
}, { dark: true });

export const lightTheme = EditorView.theme({
    '&': {
        height: '100%',
        backgroundColor: '#ffffff',
        color: '#1e293b' // slate-800
    },
    '.cm-content': {
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        fontSize: '14px',
        padding: '16px 0'
    },
    '.cm-gutters': {
        backgroundColor: '#f8fafc', // slate-50
        color: '#94a3b8', // slate-400
        borderRight: '1px solid #e2e8f0', // slate-200
        paddingRight: '8px'
    },
    '.cm-activeLineGutter': {
        backgroundColor: '#e2e8f0', // slate-200
        color: '#0f172a' // slate-950
    },
    '.cm-activeLine': {
        backgroundColor: 'rgba(99, 102, 241, 0.05)'
    },
    '.cm-selectionBackground': {
        backgroundColor: 'rgba(99, 102, 241, 0.1) !important'
    },
    '&.cm-focused .cm-selectionBackground': {
        backgroundColor: 'rgba(99, 102, 241, 0.2) !important'
    },
    '.cm-cursor': {
        borderLeftColor: '#6366f1'
    },
    '.cm-ySelectionInfo': {
        backgroundColor: '#e2e8f0',
        color: '#0f172a'
    }
}, { dark: false });
