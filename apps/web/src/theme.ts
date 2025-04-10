import { createTheme, MantineColorsTuple } from '@mantine/core';

const primaryColors: MantineColorsTuple = [
  '#F0F4FF',
  '#DAE2F3',
  '#B5C2E3',
  '#8FA0D3',
  '#7083C5',
  '#5B6BBD',
  '#4E5EB8',
  '#3E4BA4',
  '#334094',
  '#253485',
];

const secondaryColors: MantineColorsTuple = [
  '#F2F4F7',
  '#E4E7ED',
  '#CED4DD',
  '#B1BCCA',
  '#99A6B9',
  '#8796AD',
  '#7D8DA7',
  '#6B7C94',
  '#5F6D84',
  '#515E74',
];

export const theme = createTheme({
  fontFamily: 'Inter, sans-serif',
  fontFamilyMonospace: 'JetBrains Mono, monospace',
  headings: {
    fontFamily: 'JetBrains Mono, monospace',
    sizes: {
      h1: { fontSize: '2.5rem' },
      h2: { fontSize: '2rem' },
      h3: { fontSize: '1.5rem' },
      h4: { fontSize: '1.25rem' },
      h5: { fontSize: '1rem' },
      h6: { fontSize: '0.875rem' },
    },
  },
  colors: {
    primary: primaryColors,
    secondary: secondaryColors,
  },
  primaryColor: 'primary',
  primaryShade: 6,
  
  // Enhanced transition settings for smoother UI
  other: {
    transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
  
  // Configure default transition properties
  components: {
    Transition: {
      defaultProps: {
        transition: 'fade',
        duration: 300,
        timingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
    Skeleton: {
      defaultProps: {
        animate: true,
      },
    },
  },
});
