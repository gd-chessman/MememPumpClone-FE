export const STYLE_TEXT_BASE = "text-gray-600 dark:text-neutral-200 2xl:text-sm text-[10px] font-normal"

export const SELECT_STYLES = {
    control: (base: any) => ({
        ...base,
        backgroundColor: document.documentElement.classList.contains("dark") 
            ? "#1E1E1E" 
            : "#fff",
        borderColor: document.documentElement.classList.contains("dark")
            ? "#8833EE"
            : "rgba(0, 0, 0, 0.1)",
        color: document.documentElement.classList.contains("dark")
            ? "#fff"
            : "#000",
        borderRadius: "1rem",
        // Add padding to the control container
        padding: "0px 4px",
        // Add min-height to ensure consistent sizing
        minHeight: "28px",
    }),
    menu: (base: any) => ({
        ...base,
        backgroundColor: document.documentElement.classList.contains("dark")
            ? "#1E1E1E"
            : "#fff",
        color: document.documentElement.classList.contains("dark")
            ? "#fff"
            : "#000",
        border: document.documentElement.classList.contains("dark")
            ? "1px solid rgba(255, 255, 255, 0.1)"
            : "1px solid rgba(0, 0, 0, 0.1)",
        borderRadius: "0.5rem",
        boxShadow: document.documentElement.classList.contains("dark")
            ? "0 4px 12px rgba(0, 0, 0, 0.3)"
            : "0 4px 12px rgba(0, 0, 0, 0.1)",
        marginTop: "0.5rem",
        overflow: "hidden",
        animation: "fadeIn 0.2s ease-in-out",
        zIndex: 9999,
    }),
    option: (base: any, state: any) => ({
        ...base,
        backgroundColor: state.isSelected
            ? (document.documentElement.classList.contains("dark")
                ? "#0e0e0e"
                : "#f0f0f0")
            : state.isFocused
                ? (document.documentElement.classList.contains("dark")
                    ? "#0e0e0e"
                    : "#f5f5f5")
                : "transparent",
        color: document.documentElement.classList.contains("dark")
            ? "#fff"
            : "#000",
        cursor: "pointer",
        hover: {
            backgroundColor: document.documentElement.classList.contains("dark")
                ? "#2a2a2a"
                : "#f0f0f0",
        },
        // Customize padding for options
        // Increased padding for better touch targets
        // Customize font-size for options
        fontSize: "10px", // You can use px, rem, em, etc.
        ":active": {
            backgroundColor: document.documentElement.classList.contains("dark")
                ? "#2a2a2a"
                : "#f0f0f0",
        },
        "&:hover": {
            backgroundColor: document.documentElement.classList.contains("dark")
                ? "#2a2a2a !important"
                : "#f5f5f5 !important",
            color: document.documentElement.classList.contains("dark")
                ? "#fff !important"
                : "#000 !important",
        },
    }),
    multiValue: (base: any) => ({
        ...base,
        backgroundColor: document.documentElement.classList.contains("dark")
            ? "#2a2a2a"
            : "#f0f0f0",
        color: document.documentElement.classList.contains("dark")
            ? "#fff"
            : "#000",
        borderRadius: "0.375rem",
        // Customize padding for multi-value tags
        padding: "4px 8px", // Increased padding
        margin: "2px 4px", // Add margin between tags
    }),
    multiValueLabel: (base: any) => ({
        ...base,
        color: document.documentElement.classList.contains("dark")
            ? "#fff"
            : "#000",
        fontWeight: "500",
        // Customize font-size for multi-value labels
        fontSize: "13px", // Smaller font for tags
        padding: "2px 4px", // Adjust padding
    }),
    multiValueRemove: (base: any) => ({
        ...base,
        color: document.documentElement.classList.contains("dark")
            ? "#fff"
            : "#000",
        // Customize padding for remove button
        padding: "2px 4px",
        fontSize: "12px", // Smaller font for remove button
        ":hover": {
            backgroundColor: document.documentElement.classList.contains("dark")
                ? "#3a3a3a"
                : "#e0e0e0",
            color: document.documentElement.classList.contains("dark")
                ? "#fff"
                : "#000",
        },
    }),
    singleValue: (base: any) => ({
        ...base,
        color: document.documentElement.classList.contains("dark")
            ? "#fff"
            : "#000",
        // Customize font-size for single selected value
        fontSize: "16px", // Larger font for selected value
        fontWeight: "500",
    }),
    input: (base: any) => ({
        ...base,
        color: document.documentElement.classList.contains("dark")
            ? "#fff"
            : "#000",
        // Customize font-size for input text
        fontSize: "12px", // Changed to 12px
        padding: "0", // Remove default padding
        margin: "0", // Remove default margin
    }),
    placeholder: (base: any) => ({
        ...base,
        color: document.documentElement.classList.contains("dark")
            ? "rgba(255, 255, 255, 0.5)"
            : "rgba(0, 0, 0, 0.5)",
        // Customize font-size for placeholder
        fontSize: "12px", // Changed to 10px
        fontWeight: "400",
    }),
    menuList: (base: any) => ({
        ...base,
        color: document.documentElement.classList.contains("dark")
            ? "#fff"
            : "#000",
        // Customize padding for menu list
        padding: "8px", // Increased padding
        maxHeight: "300px",
        "&::-webkit-scrollbar": {
            width: "8px",
        },
        "&::-webkit-scrollbar-track": {
            background: document.documentElement.classList.contains("dark")
                ? "#1E1E1E"
                : "#f5f5f5",
            borderRadius: "4px",
        },
        "&::-webkit-scrollbar-thumb": {
            background: document.documentElement.classList.contains("dark")
                ? "#3a3a3a"
                : "#d0d0d0",
            borderRadius: "4px",
            "&:hover": {
                background: document.documentElement.classList.contains("dark")
                    ? "#4a4a4a"
                    : "#c0c0c0",
            },
        },
    }),
    noOptionsMessage: (base: any) => ({
        ...base,
        color: document.documentElement.classList.contains("dark")
            ? "rgba(255, 255, 255, 0.5)"
            : "rgba(0, 0, 0, 0.5)",
        // Customize font-size for no options message
        fontSize: "14px",
        padding: "16px",
    }),
}

export const LAYOUT_CLASS = "bg-neutral-1000 box-shadow-info rounded-3xl flex flex-col"

// Additional style examples for different use cases
export const SELECT_STYLES_SMALL = {
    control: (base: any) => ({
        ...base,
        padding: "4px 8px",
        minHeight: "36px",
        fontSize: "12px",
    }),
    input: (base: any) => ({
        ...base,
        fontSize: "12px",
    }),
    placeholder: (base: any) => ({
        ...base,
        fontSize: "12px",
    }),
    option: (base: any) => ({
        ...base,
        padding: "6px 8px",
        fontSize: "12px",
    }),
}

export const SELECT_STYLES_LARGE = {
    control: (base: any) => ({
        ...base,
        padding: "16px 20px",
        minHeight: "60px",
        fontSize: "18px",
    }),
    input: (base: any) => ({
        ...base,
        fontSize: "18px",
    }),
    placeholder: (base: any) => ({
        ...base,
        fontSize: "18px",
    }),
    option: (base: any) => ({
        ...base,
        padding: "16px 20px",
        fontSize: "18px",
    }),
}

export const SELECT_STYLES_COMPACT = {
    control: (base: any) => ({
        ...base,
        padding: "2px 6px",
        minHeight: "32px",
    }),
    multiValue: (base: any) => ({
        ...base,
        padding: "1px 4px",
        margin: "1px 2px",
    }),
    multiValueLabel: (base: any) => ({
        ...base,
        fontSize: "11px",
        padding: "1px 2px",
    }),
    option: (base: any) => ({
        ...base,
        padding: "4px 8px",
        fontSize: "13px",
    }),
} 