// Central configuration for Figma file settings
// Update the fileId here to change it across all scripts

export const figmaConfig = {
    // Main Figma file ID - update this when switching to a different file
    fileId: '83dXk35avf0BTHtYPWeyl7',
    
    // You can add other common configurations here
    defaultPageName: 'Design',
    maxDepth: 3,
    maxComponents: 10,
    
    // Common node IDs that you might want to reference (optional)
    commonNodes: {
        // Example: loginScreen: '11:593',
        // Add frequently used node IDs here for quick reference
    }
};

// Helper function to get the current file ID
export function getFileId() {
    return figmaConfig.fileId;
}

// Helper function to update file ID programmatically if needed
export function setFileId(newFileId) {
    figmaConfig.fileId = newFileId;
    console.log(`📝 Figma file ID updated to: ${newFileId}`);
}

// Validation function to ensure file ID is valid
export function validateFileId(fileId = figmaConfig.fileId) {
    if (!fileId || typeof fileId !== 'string' || fileId.length < 10) {
        throw new Error('Invalid Figma file ID. Please check your configuration.');
    }
    return true;
}
