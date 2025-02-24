// constants/colors.ts
const colors = {
  light: {
    text: '#1F2937', // Dark gray
    background: '#F9FAFB', // Off-white page background
    surface: '#FFFFFF', // Card/input background
    primary: '#6366F1', // Blue 3B82F6
    secondary: '#3B82F6', // Indigo
    accent: '#10B981', // Green
    border: '#E5E7EB', // Light border
    muted: '#9CA3AF', // Muted text
  },
  dark: {
    text: '#F9FAFB', // Light gray text
    background: '#1f1f1f', // Dark page background
    surface: '#1c1c1c', // Card/input background
    primary: '#4F46E5', // Blue 2563EB
    secondary: '#2563EB', // Indigo
    accent: '#059669', // Green
    border: '#374151', // Dark,
    muted: '#9CA3AF', // Muted text
  },
} as const;

export default colors;
