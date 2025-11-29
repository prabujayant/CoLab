import { EditorView } from '@codemirror/view';

interface MarkdownToolbarProps {
    view: EditorView | null;
}

export const MarkdownToolbar = ({ view }: MarkdownToolbarProps) => {
    if (!view) return null;

    const insertFormat = (prefix: string, suffix: string = '') => {
        const { state, dispatch } = view;
        const range = state.selection.main;
        const text = state.sliceDoc(range.from, range.to);

        const newText = `${prefix}${text}${suffix}`;

        dispatch({
            changes: { from: range.from, to: range.to, insert: newText },
            selection: {
                anchor: range.from + prefix.length,
                head: range.from + prefix.length + text.length
            },
            userEvent: 'input.format'
        });
        view.focus();
    };

    const insertBlock = (prefix: string) => {
        const { state, dispatch } = view;
        const line = state.doc.lineAt(state.selection.main.head);
        const lineText = line.text;

        // Regex to match existing block prefixes: #, ##, ###, -, 1., >
        const prefixRegex = /^(#{1,3}\s|[-]\s|\d+\.\s|>\s)/;
        const match = lineText.match(prefixRegex);

        if (match) {
            const existingPrefix = match[0];
            const from = line.from;
            const to = line.from + existingPrefix.length;

            if (existingPrefix === prefix) {
                // Toggle off: Remove existing prefix
                dispatch({
                    changes: { from, to, insert: '' },
                    userEvent: 'input.format'
                });
            } else {
                // Replace: Swap existing prefix with new one
                dispatch({
                    changes: { from, to, insert: prefix },
                    userEvent: 'input.format'
                });
            }
        } else {
            // Insert: Add new prefix
            dispatch({
                changes: { from: line.from, insert: prefix },
                userEvent: 'input.format'
            });
        }
        view.focus();
    };

    return (
        <div className="flex items-center gap-1 p-2 border-b border-white/5 bg-slate-900/40 overflow-x-auto">
            <ToolbarButton onClick={() => insertFormat('**', '**')} label="B" title="Bold" />
            <ToolbarButton onClick={() => insertFormat('*', '*')} label="I" title="Italic" />
            <ToolbarButton onClick={() => insertFormat('`', '`')} label="{ }" title="Code" />
            <div className="w-px h-4 bg-white/10 mx-1" />
            <ToolbarButton onClick={() => insertBlock('# ')} label="H1" title="Heading 1" />
            <ToolbarButton onClick={() => insertBlock('## ')} label="H2" title="Heading 2" />
            <ToolbarButton onClick={() => insertBlock('### ')} label="H3" title="Heading 3" />
            <div className="w-px h-4 bg-white/10 mx-1" />
            <ToolbarButton onClick={() => insertBlock('- ')} label="• List" title="Bullet List" />
            <ToolbarButton onClick={() => insertBlock('1. ')} label="1. List" title="Numbered List" />
            <div className="w-px h-4 bg-white/10 mx-1" />
            <ToolbarButton onClick={() => insertBlock('> ')} label="“ Quote" title="Blockquote" />
            <ToolbarButton onClick={() => insertFormat('[', '](url)')} label="🔗 Link" title="Link" />
        </div>
    );
};

const ToolbarButton = ({ onClick, label, title }: { onClick: () => void; label: string; title: string }) => (
    <button
        onClick={onClick}
        title={title}
        className="px-2 py-1 text-xs font-medium text-slate-400 hover:text-white hover:bg-white/10 rounded transition-colors min-w-[24px]"
    >
        {label}
    </button>
);
