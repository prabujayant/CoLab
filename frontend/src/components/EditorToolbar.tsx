import { Editor } from '@tiptap/react';
import {
    Bold,
    Italic,
    Underline,
    Heading1,
    Heading2,
    List,
    ListOrdered,
    Quote,
    Undo,
    Redo,
    Link as LinkIcon,
    Image as ImageIcon
} from 'lucide-react';

interface EditorToolbarProps {
    editor: Editor | null;
}

export const EditorToolbar = ({ editor }: EditorToolbarProps) => {
    if (!editor) {
        return null;
    }

    const addLink = () => {
        const previousUrl = editor.getAttributes('link').href;
        const url = window.prompt('URL', previousUrl);

        if (url === null) {
            return;
        }

        if (url === '') {
            (editor.chain().focus() as any).extendMarkRange('link').unsetLink().run();
            return;
        }

        (editor.chain().focus() as any).extendMarkRange('link').setLink({ href: url }).run();
    };

    const addImage = () => {
        const url = window.prompt('Image URL');

        if (url) {
            (editor.chain().focus() as any).setImage({ src: url }).run();
        }
    };

    return (
        <div className="flex flex-wrap items-center gap-1 border-b border-white/10 bg-slate-900/50 p-2">
            <div className="flex items-center gap-1 border-r border-white/10 pr-2 mr-2">
                <button
                    onClick={() => (editor.chain().focus() as any).undo().run()}
                    disabled={!(editor.can().chain().focus() as any).undo().run()}
                    className="p-2 rounded hover:bg-white/10 text-slate-400 hover:text-white disabled:opacity-50"
                    title="Undo"
                >
                    <Undo size={18} />
                </button>
                <button
                    onClick={() => (editor.chain().focus() as any).redo().run()}
                    disabled={!(editor.can().chain().focus() as any).redo().run()}
                    className="p-2 rounded hover:bg-white/10 text-slate-400 hover:text-white disabled:opacity-50"
                    title="Redo"
                >
                    <Redo size={18} />
                </button>
            </div>

            <div className="flex items-center gap-1 border-r border-white/10 pr-2 mr-2">
                <button
                    onClick={() => (editor.chain().focus() as any).toggleBold().run()}
                    disabled={!(editor.can().chain().focus() as any).toggleBold().run()}
                    className={`p-2 rounded hover:bg-white/10 transition-colors ${editor.isActive('bold') ? 'bg-indigo-500/20 text-indigo-400' : 'text-slate-400 hover:text-white'
                        }`}
                    title="Bold"
                >
                    <Bold size={18} />
                </button>
                <button
                    onClick={() => (editor.chain().focus() as any).toggleItalic().run()}
                    disabled={!(editor.can().chain().focus() as any).toggleItalic().run()}
                    className={`p-2 rounded hover:bg-white/10 transition-colors ${editor.isActive('italic') ? 'bg-indigo-500/20 text-indigo-400' : 'text-slate-400 hover:text-white'
                        }`}
                    title="Italic"
                >
                    <Italic size={18} />
                </button>
                <button
                    onClick={() => (editor.chain().focus() as any).toggleUnderline().run()}
                    className={`p-2 rounded hover:bg-white/10 transition-colors ${editor.isActive('underline') ? 'bg-indigo-500/20 text-indigo-400' : 'text-slate-400 hover:text-white'
                        }`}
                    title="Underline"
                >
                    <Underline size={18} />
                </button>
            </div>

            <div className="flex items-center gap-1 border-r border-white/10 pr-2 mr-2">
                <button
                    onClick={() => (editor.chain().focus() as any).toggleHeading({ level: 1 }).run()}
                    className={`p-2 rounded hover:bg-white/10 transition-colors ${editor.isActive('heading', { level: 1 }) ? 'bg-indigo-500/20 text-indigo-400' : 'text-slate-400 hover:text-white'
                        }`}
                    title="Heading 1"
                >
                    <Heading1 size={18} />
                </button>
                <button
                    onClick={() => (editor.chain().focus() as any).toggleHeading({ level: 2 }).run()}
                    className={`p-2 rounded hover:bg-white/10 transition-colors ${editor.isActive('heading', { level: 2 }) ? 'bg-indigo-500/20 text-indigo-400' : 'text-slate-400 hover:text-white'
                        }`}
                    title="Heading 2"
                >
                    <Heading2 size={18} />
                </button>
            </div>

            <div className="flex items-center gap-1 border-r border-white/10 pr-2 mr-2">
                <button
                    onClick={() => (editor.chain().focus() as any).toggleBulletList().run()}
                    className={`p-2 rounded hover:bg-white/10 transition-colors ${editor.isActive('bulletList') ? 'bg-indigo-500/20 text-indigo-400' : 'text-slate-400 hover:text-white'
                        }`}
                    title="Bullet List"
                >
                    <List size={18} />
                </button>
                <button
                    onClick={() => (editor.chain().focus() as any).toggleOrderedList().run()}
                    className={`p-2 rounded hover:bg-white/10 transition-colors ${editor.isActive('orderedList') ? 'bg-indigo-500/20 text-indigo-400' : 'text-slate-400 hover:text-white'
                        }`}
                    title="Ordered List"
                >
                    <ListOrdered size={18} />
                </button>
                <button
                    onClick={() => (editor.chain().focus() as any).toggleBlockquote().run()}
                    className={`p-2 rounded hover:bg-white/10 transition-colors ${editor.isActive('blockquote') ? 'bg-indigo-500/20 text-indigo-400' : 'text-slate-400 hover:text-white'
                        }`}
                    title="Quote"
                >
                    <Quote size={18} />
                </button>
            </div>

            <div className="flex items-center gap-1">
                <button
                    onClick={addLink}
                    className={`p-2 rounded hover:bg-white/10 transition-colors ${editor.isActive('link') ? 'bg-indigo-500/20 text-indigo-400' : 'text-slate-400 hover:text-white'
                        }`}
                    title="Link"
                >
                    <LinkIcon size={18} />
                </button>
                <button
                    onClick={addImage}
                    className="p-2 rounded hover:bg-white/10 text-slate-400 hover:text-white"
                    title="Image"
                >
                    <ImageIcon size={18} />
                </button>
            </div>
        </div>
    );
};
