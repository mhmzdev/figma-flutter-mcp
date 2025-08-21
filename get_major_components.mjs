// Script to get node IDs of major components from Figma file
import 'dotenv/config';
import { FigmaService } from './dist/services/figma.mjs';
import { getFileId, validateFileId } from './figma-config.mjs';

const fileId = getFileId();
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

console.log('🔍 Finding major components in Figma file...');

function findMajorComponents(node, path = '', results = [], depth = 0) {
    // Skip if we're too deep to avoid overwhelming output
    if (depth > 3) return results;
    
    // Check if this is a major component based on name and type
    const isMajorComponent = 
        node.type === 'COMPONENT' ||
        node.type === 'COMPONENT_SET' ||
        node.type === 'INSTANCE' ||
        (node.type === 'FRAME' && node.name && !node.name.startsWith('Frame ')) ||
        (node.type === 'GROUP' && node.name && !node.name.startsWith('Group '));
    
    // Filter for meaningful component names (not generic ones)
    const hasGoodName = node.name && 
        !node.name.match(/^(Frame|Group|Rectangle|Ellipse|Line|Vector)\s*\d*$/i) &&
        !node.name.match(/^(Union|Subtract|Intersect|Exclude)$/i) &&
        node.name.length > 1;
    
    if (isMajorComponent && hasGoodName) {
        const componentInfo = {
            id: node.id,
            name: node.name,
            type: node.type,
            path: path,
            bounds: node.absoluteBoundingBox,
            visible: node.visible !== false,
            childCount: node.children?.length || 0,
            depth: depth
        };
        
        // Add additional info for specific types
        if (node.type === 'COMPONENT_SET') {
            componentInfo.variantCount = node.children?.length || 0;
        }
        
        if (node.type === 'TEXT') {
            componentInfo.text = node.characters;
        }
        
        results.push(componentInfo);
    }
    
    // Recursively search children
    if (node.children && depth < 3) {
        node.children.forEach((child, index) => {
            const childPath = path ? `${path} > ${child.name}` : child.name;
            findMajorComponents(child, childPath, results, depth + 1);
        });
    }
    
    return results;
}

function categorizeComponents(components) {
    const categories = {
        screens: [],
        buttons: [],
        cards: [],
        inputs: [],
        navigation: [],
        icons: [],
        components: [],
        other: []
    };
    
    components.forEach(comp => {
        const name = comp.name.toLowerCase();
        
        if (name.includes('screen') || name.includes('page') || 
            name.includes('login') || name.includes('register') || 
            name.includes('profile') || name.includes('feed') || 
            name.includes('chat') || name.includes('welcome')) {
            categories.screens.push(comp);
        } else if (name.includes('button') || name.includes('btn')) {
            categories.buttons.push(comp);
        } else if (name.includes('card') || name.includes('post')) {
            categories.cards.push(comp);
        } else if (name.includes('input') || name.includes('field') || 
                  name.includes('text') && comp.type === 'FRAME') {
            categories.inputs.push(comp);
        } else if (name.includes('nav') || name.includes('menu') || 
                  name.includes('tab') || name.includes('bar')) {
            categories.navigation.push(comp);
        } else if (name.includes('icon') || comp.type === 'VECTOR') {
            categories.icons.push(comp);
        } else if (comp.type === 'COMPONENT' || comp.type === 'COMPONENT_SET') {
            categories.components.push(comp);
        } else {
            categories.other.push(comp);
        }
    });
    
    return categories;
}

try {
    const figmaService = new FigmaService(token);
    
    // Get the full file to search for components
    console.log('\n📄 Fetching complete file structure...');
    const file = await figmaService.getFile(fileId);
    
    console.log('\n🔍 Analyzing components...');
    const allComponents = [];
    
    // Search in all pages
    if (file.document?.children) {
        for (const page of file.document.children) {
            console.log(`\n📑 Analyzing page: ${page.name}`);
            const pageComponents = findMajorComponents(page, page.name);
            allComponents.push(...pageComponents);
        }
    }
    
    // Also check file-level components
    if (file.components) {
        console.log('\n🧩 Checking file-level components...');
        for (const [componentId, component] of Object.entries(file.components)) {
            allComponents.push({
                id: componentId,
                name: component.name,
                type: 'COMPONENT',
                path: 'File Components',
                description: component.description || 'No description',
                visible: true,
                isMainComponent: true,
                childCount: 0,
                depth: 0
            });
        }
    }
    
    // Categorize components
    const categories = categorizeComponents(allComponents);
    
    console.log('\n🎯 Major Components Found:');
    console.log('=' .repeat(60));
    
    // Display by category
    Object.entries(categories).forEach(([categoryName, components]) => {
        if (components.length > 0) {
            console.log(`\n📂 ${categoryName.toUpperCase()} (${components.length}):`);
            console.log('-'.repeat(40));
            
            components.forEach((comp, index) => {
                console.log(`\n${index + 1}. ${comp.name}`);
                console.log(`   ID: ${comp.id}`);
                console.log(`   Type: ${comp.type}`);
                console.log(`   Path: ${comp.path}`);
                
                if (comp.bounds) {
                    console.log(`   Size: ${Math.round(comp.bounds.width)}x${Math.round(comp.bounds.height)}`);
                }
                
                if (comp.variantCount) {
                    console.log(`   Variants: ${comp.variantCount}`);
                }
                
                if (comp.childCount > 0) {
                    console.log(`   Children: ${comp.childCount}`);
                }
                
                if (comp.text) {
                    console.log(`   Text: "${comp.text}"`);
                }
                
                if (comp.isMainComponent) {
                    console.log(`   🌟 Main Component`);
                }
                
                if (!comp.visible) {
                    console.log(`   ⚠️ Hidden`);
                }
            });
        }
    });
    
    console.log(`\n✅ Found ${allComponents.length} major components total`);
    
    // Summary by type
    const typeCounts = {};
    allComponents.forEach(comp => {
        typeCounts[comp.type] = (typeCounts[comp.type] || 0) + 1;
    });
    
    console.log('\n📊 Component Types Summary:');
    Object.entries(typeCounts).forEach(([type, count]) => {
        console.log(`   ${type}: ${count}`);
    });
    
} catch (error) {
    console.error('❌ Error:', error.message);
}
