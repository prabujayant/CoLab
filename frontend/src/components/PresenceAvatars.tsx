import type { PresenceUser } from '../hooks/useCollaborativeDocument';

interface PresenceAvatarsProps {
    users: PresenceUser[];
}

export const PresenceAvatars = ({ users }: PresenceAvatarsProps) => {
    if (!users.length) {
        return (
            <div className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">
                Waiting for collaborators...
            </div>
        );
    }

    return (
        <div className="flex items-center gap-2">
            <div className="flex -space-x-2">
                {users.slice(0, 5).map((user) => (
                    <div
                        key={user.id}
                        className="h-8 w-8 rounded-full border-2 border-slate-950 text-center text-sm font-bold leading-7 text-white"
                        style={{ backgroundColor: user.color }}
                        title={user.name}
                    >
                        {user.name
                            .split(' ')
                            .map((part) => part[0])
                            .join('')
                            .slice(0, 2)
                            .toUpperCase()}
                    </div>
                ))}
            </div>
            {users.length > 5 && (
                <span className="text-sm text-slate-400">+{users.length - 5} more</span>
            )}
        </div>
    );
};
