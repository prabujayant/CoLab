import { useEffect, useState } from 'react';
import { WebsocketProvider } from 'y-websocket';

interface UserAvatarsProps {
    provider: WebsocketProvider;
}

interface UserState {
    user?: {
        name: string;
        color: string;
    };
}

export const UserAvatars = ({ provider }: UserAvatarsProps) => {
    const [users, setUsers] = useState<UserState[]>([]);

    useEffect(() => {
        const awareness = provider.awareness;

        const updateUsers = () => {
            const states = Array.from(awareness.getStates().values()) as UserState[];
            // Filter out users without name (e.g. initial connection)
            setUsers(states.filter(s => s.user));
        };

        updateUsers();

        awareness.on('change', updateUsers);

        return () => {
            awareness.off('change', updateUsers);
        };
    }, [provider]);

    return (
        <div className="flex items-center -space-x-2 overflow-hidden">
            {users.map((u, i) => (
                <div
                    key={i}
                    className="relative inline-flex h-8 w-8 items-center justify-center rounded-full border-2 border-slate-900 text-xs font-medium text-white shadow-sm ring-1 ring-white/10"
                    style={{ backgroundColor: u.user?.color || '#94a3b8' }}
                    title={u.user?.name}
                >
                    {u.user?.name?.charAt(0).toUpperCase()}
                </div>
            ))}
            {users.length === 0 && (
                <span className="text-xs text-slate-500 italic">Offline</span>
            )}
        </div>
    );
};
