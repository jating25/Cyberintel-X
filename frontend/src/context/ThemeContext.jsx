import React, { createContext, useContext } from 'react';

// Create the theme context
export const ThemeContext = createContext({
  darkMode: true,
  setDarkMode: () => {},
});

// Custom hook to use the theme context
export const useTheme = () => {
  return useContext(ThemeContext);
};

// Theme provider component
export const ThemeProvider = ({ children, value }) => {
  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeContext;
