const palette = [
  '#f472b6',
  '#c084fc',
  '#60a5fa',
  '#34d399',
  '#fcd34d',
  '#fb7185',
  '#f97316',
  '#a3e635'
];

export const getColorForUser = (id = 'anonymous') => {
  const hash = Array.from(id).reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const index = hash % palette.length;
  return palette[index];
};
