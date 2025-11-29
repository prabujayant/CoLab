import { randomBytes } from 'crypto';

const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
const randomSuffix = (length = 6) => {
    const bytes = randomBytes(length);
    let suffix = '';
    for (let i = 0; i < length; i++) {
        suffix += alphabet[bytes[i] % alphabet.length];
    }
    return suffix;
};

const slugify = (text: string) =>
    text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 40);

export const generateSlug = (title?: string) => {
    const base = title ? slugify(title) : 'doc';
    return `${base}-${randomSuffix()}`;
};
