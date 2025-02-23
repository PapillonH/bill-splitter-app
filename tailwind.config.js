module.exports = {
    content: ["./src/**/*.{js,jsx,ts,tsx}"],
    theme: {
        extend: {
            colors: {
                primary: {
                    light: '#63b3ed', // Light blue
                    DEFAULT: '#4299e1', // Blue
                    dark: '#3182ce', // Dark blue
                },
                secondary: {
                    light: '#feb2b2', // Light red
                    DEFAULT: '#fc8181', // Red
                    dark: '#e53e3e', // Dark red
                },
                gray: {
                    light: '#f7fafc',
                    DEFAULT: '#edf2f7',
                    dark: '#e2e8f0',
                },
            },
        },
    },
    plugins: [],
};
