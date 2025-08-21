// Script to get node IDs of key UI components from Figma file
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

console.log('🔍 Finding key UI components in Figma file...');

function findKeyComponents(node, path = '', results = [], depth = 0) {
    // Only look at top-level components to avoid overwhelming output
    if (depth > 2) return results;

    const name = node.name?.toLowerCase() || '';

    // Key component patterns for social app
    const isKeyComponent =
        // Screens
        name.includes('welcome') || name.includes('login') || name.includes('register') ||
        name.includes('profile') || name.includes('feed') || name.includes('chat') ||
        name.includes('post') || name.includes('story') || name.includes('conversation') ||

        // UI Components
        name.includes('button') || name.includes('card') || name.includes('input') ||
        name.includes('field') || name.includes('bar') || name.includes('nav') ||

        // Specific components
        (node.type === 'COMPONENT_SET' && node.name) ||
        (node.type === 'COMPONENT' && node.name && !node.name.startsWith('vuesax')) ||
        (node.type === 'FRAME' && node.name &&
            (node.name.includes('screen') || node.name.includes('page') ||
                node.name === 'welcome' || node.name === 'login' || node.name === 'register' ||
                node.name === 'profile' || node.name === 'news feed' || node.name === 'chat' ||
                node.name === 'conversations' || node.name === 'create post' ||
                node.name === 'create story' || node.name === 'edit profile'));

    if (isKeyComponent && node.name && node.name.length > 1) {
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

        if (node.type === 'COMPONENT_SET') {
            componentInfo.variantCount = node.children?.length || 0;
        }

        results.push(componentInfo);
    }

    // Recursively search children but limit depth
    if (node.children && depth < 2) {
        node.children.forEach((child) => {
            const childPath = path ? `${path} > ${child.name}` : child.name;
            findKeyComponents(child, childPath, results, depth + 1);
        });
    }

    return results;
}

function categorizeKeyComponents(components) {
    const categories = {
        screens: [],
        buttons: [],
        cards: [],
        inputs: [],
        navigation: [],
        components: []
    };

    components.forEach(comp => {
        const name = comp.name.toLowerCase();

        if (name.includes('welcome') || name.includes('login') || name.includes('register') ||
            name.includes('profile') || name.includes('feed') || name.includes('chat') ||
            name.includes('conversation') || name.includes('create') || name.includes('edit') ||
            name.includes('story') || name.includes('empty') || name.includes('options')) {
            categories.screens.push(comp);
        } else if (name.includes('button') || name.includes('btn')) {
            categories.buttons.push(comp);
        } else if (name.includes('card') || name.includes('post')) {
            categories.cards.push(comp);
        } else if (name.includes('input') || name.includes('field')) {
            categories.inputs.push(comp);
        } else if (name.includes('nav') || name.includes('bar') || name.includes('bottom')) {
            categories.navigation.push(comp);
        } else {
            categories.components.push(comp);
        }
    });

    return categories;
}

try {
    const figmaService = new FigmaService(token);

    console.log('\n📄 Fetching file structure...');
    const file = await figmaService.getFile(fileId);

    console.log('\n🔍 Analyzing key components...');
    const keyComponents = [];

    // Search in Design page only (skip Icons page for now)
    if (file.document?.children) {
        const designPage = file.document.children.find(page => page.name === 'Design');
        if (designPage) {
            console.log(`\n📑 Analyzing Design page...`);
            const pageComponents = findKeyComponents(designPage, 'Design');
            keyComponents.push(...pageComponents);
        }
    }

    // Categorize components
    const categories = categorizeKeyComponents(keyComponents);

    console.log('\n🎯 Key UI Components Found:');
    console.log('='.repeat(60));

    // Display by category
    Object.entries(categories).forEach(([categoryName, components]) => {
        if (components.length > 0) {
            console.log(`\n📂 ${categoryName.toUpperCase()} (${components.length}):`);
            console.log('-'.repeat(50));

            components.forEach((comp, index) => {
                console.log(`\n${index + 1}. ${comp.name}`);
                console.log(`   🆔 ID: ${comp.id}`);
                console.log(`   📦 Type: ${comp.type}`);

                if (comp.bounds) {
                    console.log(`   📏 Size: ${Math.round(comp.bounds.width)}×${Math.round(comp.bounds.height)}px`);
                }

                if (comp.variantCount) {
                    console.log(`   🎨 Variants: ${comp.variantCount}`);
                }

                if (comp.childCount > 0) {
                    console.log(`   👶 Children: ${comp.childCount}`);
                }

                if (!comp.visible) {
                    console.log(`   ⚠️ Hidden`);
                }
            });
        }
    });

    console.log(`\n✅ Found ${keyComponents.length} key UI components`);

    // Quick reference list
    console.log('\n📋 QUICK REFERENCE - COPY THESE NODE IDs:');
    console.log('='.repeat(60));

    Object.entries(categories).forEach(([categoryName, components]) => {
        if (components.length > 0) {
            console.log(`\n${categoryName.toUpperCase()}:`);
            components.forEach((comp) => {
                console.log(`${comp.name}: ${comp.id}`);
            });
        }
    });

} catch (error) {
    console.error('❌ Error:', error.message);
}
