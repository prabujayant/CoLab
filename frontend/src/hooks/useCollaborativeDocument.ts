import { useEffect, useState } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { IndexeddbPersistence } from 'y-indexeddb';
import { Awareness } from 'y-protocols/awareness';

const getWsUrl = () => {
    let url = import.meta.env.VITE_COLLAB_URL;
    if (url) return url;

    url = import.meta.env.VITE_API_URL;
    if (!url) return 'ws://localhost:3000';

    // Handle Render internal hostnames / slugs
    if (!url.includes('.') && !url.includes(':') && !url.startsWith('http')) {
        url = `${url}.onrender.com`;
    }

    // Add protocol if missing (assume secure for production)
    if (!url.startsWith('http') && !url.startsWith('ws')) {
        url = `https://${url}`;
    }

    // Replace protocol
    return url.replace(/^http/, 'ws');
};

const WS_URL = getWsUrl();

export interface PresenceUser {
    id: string;
    name: string;
    color: string;
}

interface UseCollaborativeDocumentOptions {
    slug: string;
    user?: {
        id: string;
        email: string;
        displayName?: string | null;
    };
}

import { useAuthStore } from '../stores/authStore';

export const useCollaborativeDocument = ({ slug, user }: UseCollaborativeDocumentOptions) => {
    const [doc, setDoc] = useState<Y.Doc | null>(null);
    const [provider, setProvider] = useState<WebsocketProvider | null>(null);
    const [status, setStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connecting');
    const token = useAuthStore((state) => state.token);

    useEffect(() => {
        if (!slug || !token) return;

        const ydoc = new Y.Doc();
        const roomName = `collab/${slug}`;
        // Append token to query params
        const wsProvider = new WebsocketProvider(WS_URL, roomName, ydoc, {
            connect: true,
            params: { token }
        });

        let persistence: IndexeddbPersistence | null = null;
        try {
            persistence = new IndexeddbPersistence(slug, ydoc);
            persistence.on('synced', () => {
                console.log('[IndexedDB] Content loaded from local database');
            });
        } catch (e) {
            console.warn('[IndexedDB] Failed to initialize persistence', e);
        }

        const color = getColorForUser(user?.id ?? slug);
        wsProvider.awareness.setLocalStateField('user', {
            id: user?.id ?? 'anonymous',
            name: user?.displayName ?? user?.email ?? 'Anonymous',
            color
        });

        wsProvider.on('status', (event: { status: 'connected' | 'connecting' | 'disconnected' }) => {
            setStatus(event.status);
        });

        setDoc(ydoc);
        setProvider(wsProvider);

        return () => {
            wsProvider.destroy();
            persistence?.destroy();
            ydoc.destroy();
        };
    }, [slug, user?.id, user?.displayName, user?.email, token]);

    return { ydoc: doc, provider, awareness: provider?.awareness as Awareness | undefined, status };
};

const colors = ['#f472b6', '#c084fc', '#60a5fa', '#34d399', '#fcd34d', '#fb7185', '#f97316', '#a3e635'];

const getColorForUser = (id: string) => {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
        hash = id.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index];
};
