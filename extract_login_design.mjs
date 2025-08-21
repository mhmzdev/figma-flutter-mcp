// Script to extract detailed login screen design from Figma
import 'dotenv/config';
import { FigmaService } from './dist/services/figma.mjs';
import { getFileId, validateFileId } from './figma-config.mjs';

const fileId = getFileId();
const loginNodeId = '11:593'; // Login Screen node ID
const token = process.env.FIGMA_FLUTTER_MCP;

if (!token) {
    console.error('❌ No Figma token found in environment');
    process.exit(1);
}

// Validate file ID
try {
    validateFileId(fileId);
    console.log(`📋 Using Figma file ID: ${fileId}`);
} catch (error) {
    console.error('❌ Invalid file ID:', error.message);
    process.exit(1);
}

console.log('🎨 Extracting login screen design from Figma...');

function analyzeNode(node, depth = 0, path = '') {
    const indent = '  '.repeat(depth);
    const currentPath = path ? `${path} > ${node.name}` : node.name;
    
    console.log(`${indent}📦 ${node.name} (${node.type})`);
    console.log(`${indent}   ID: ${node.id}`);
    
    if (node.absoluteBoundingBox) {
        const bounds = node.absoluteBoundingBox;
        console.log(`${indent}   Size: ${Math.round(bounds.width)}×${Math.round(bounds.height)}px`);
        console.log(`${indent}   Position: (${Math.round(bounds.x)}, ${Math.round(bounds.y)})`);
    }
    
    // Extract colors
    if (node.fills && node.fills.length > 0) {
        node.fills.forEach(fill => {
            if (fill.type === 'SOLID') {
                const color = fill.color;
                const opacity = fill.opacity || 1;
                console.log(`${indent}   Background: rgba(${Math.round(color.r * 255)}, ${Math.round(color.g * 255)}, ${Math.round(color.b * 255)}, ${opacity})`);
            }
        });
    }
    
    // Extract border/stroke
    if (node.strokes && node.strokes.length > 0) {
        node.strokes.forEach(stroke => {
            if (stroke.type === 'SOLID') {
                const color = stroke.color;
                const opacity = stroke.opacity || 1;
                console.log(`${indent}   Border: rgba(${Math.round(color.r * 255)}, ${Math.round(color.g * 255)}, ${Math.round(color.b * 255)}, ${opacity}) ${node.strokeWeight || 1}px`);
            }
        });
    }
    
    // Extract corner radius
    if (node.cornerRadius !== undefined) {
        console.log(`${indent}   Corner Radius: ${node.cornerRadius}px`);
    }
    
    // Extract padding
    if (node.paddingLeft !== undefined) {
        console.log(`${indent}   Padding: ${node.paddingTop || 0}px ${node.paddingRight || 0}px ${node.paddingBottom || 0}px ${node.paddingLeft || 0}px`);
    }
    
    // Extract text properties
    if (node.type === 'TEXT') {
        console.log(`${indent}   Text: "${node.characters || 'N/A'}"`);
        if (node.style) {
            console.log(`${indent}   Font: ${node.style.fontFamily || 'Unknown'}`);
            console.log(`${indent}   Size: ${node.style.fontSize || 0}px`);
            console.log(`${indent}   Weight: ${node.style.fontWeight || 'Unknown'}`);
            console.log(`${indent}   Line Height: ${node.style.lineHeightPx || 'Auto'}px`);
            console.log(`${indent}   Letter Spacing: ${node.style.letterSpacing || 0}px`);
        }
        
        if (node.fills && node.fills.length > 0) {
            const textFill = node.fills[0];
            if (textFill.type === 'SOLID') {
                const color = textFill.color;
                const opacity = textFill.opacity || 1;
                console.log(`${indent}   Text Color: rgba(${Math.round(color.r * 255)}, ${Math.round(color.g * 255)}, ${Math.round(color.b * 255)}, ${opacity})`);
            }
        }
    }
    
    // Extract layout properties
    if (node.layoutMode) {
        console.log(`${indent}   Layout: ${node.layoutMode}`);
        if (node.itemSpacing !== undefined) {
            console.log(`${indent}   Item Spacing: ${node.itemSpacing}px`);
        }
        if (node.primaryAxisAlignItems) {
            console.log(`${indent}   Main Axis: ${node.primaryAxisAlignItems}`);
        }
        if (node.counterAxisAlignItems) {
            console.log(`${indent}   Cross Axis: ${node.counterAxisAlignItems}`);
        }
    }
    
    // Extract effects (shadows, blur, etc.)
    if (node.effects && node.effects.length > 0) {
        node.effects.forEach(effect => {
            if (effect.type === 'DROP_SHADOW') {
                const color = effect.color;
                console.log(`${indent}   Shadow: offset(${effect.offset?.x || 0}, ${effect.offset?.y || 0}) blur(${effect.radius || 0}) rgba(${Math.round((color?.r || 0) * 255)}, ${Math.round((color?.g || 0) * 255)}, ${Math.round((color?.b || 0) * 255)}, ${color?.a || 1})`);
            }
        });
    }
    
    console.log('');
    
    // Recursively analyze children (limit depth to avoid overwhelming output)
    if (node.children && depth < 4) {
        node.children.forEach(child => {
            analyzeNode(child, depth + 1, currentPath);
        });
    } else if (node.children && node.children.length > 0) {
        console.log(`${indent}   📁 ${node.children.length} children (depth limit reached)`);
    }
}

try {
    const figmaService = new FigmaService(token);
    
    console.log(`\n📄 Fetching login screen node: ${loginNodeId}`);
    const loginNode = await figmaService.getNode(fileId, loginNodeId);
    
    console.log('\n🔍 Analyzing login screen structure:');
    console.log('=' .repeat(60));
    
    analyzeNode(loginNode);
    
    console.log('\n✅ Login screen analysis complete!');
    
} catch (error) {
    console.error('❌ Error:', error.message);
}
