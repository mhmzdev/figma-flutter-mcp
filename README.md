# Figma-to-Flutter MCP Server

A comprehensive MCP (Model Context Protocol) server that bridges Figma designs and Flutter development through Cursor AI. This server automatically extracts design information from Figma files and generates organized, production-ready Flutter code with proper project structure.

## 🚀 Features

- **🎨 Figma API Integration**: Seamlessly fetch files, components, and design data
- **📱 Smart Flutter Generation**: Creates screens, widgets, and proper project structure
- **🏗️ Organized Code Structure**: Generates screens in `lib/ui/screens/` and widgets with proper naming conventions
- **🔒 Private vs Public Widgets**: Automatically determines screen-specific (private) vs global (public) widgets
- **⚙️ Cursor AI Compatible**: Full integration with Cursor IDE via MCP protocol
- **🎯 Pixel-Perfect Output**: Maintains design fidelity from Figma to Flutter code

## 📋 Prerequisites

- **Node.js 18+** 
- **Figma Personal Access Token** ([Get yours here](https://www.figma.com/developers/api#access-tokens))
- **Cursor AI IDE** with MCP support
- **Flutter SDK** (for running generated code)

## ⚡ Quick Start

### 1. Installation

```bash
# Clone or download the project
git clone <your-repo-url> figma-flutter-mcp
cd figma-flutter-mcp

# Install dependencies
npm install
```

### 2. Configuration

Create a `.env` file in the project root:

```env
FIGMA_FLUTTER_MCP=your_figma_personal_access_token_here
```

**Getting your Figma token:**
1. Go to [Figma Settings → Personal Access Tokens](https://www.figma.com/developers/api#access-tokens)
2. Generate a new token
3. Copy and paste it in your `.env` file

### 3. Build and Run

```bash
# Development mode (with auto-restart)
npm run dev

# Production mode
npm run build
npm start
```

### 4. Configure Cursor AI

Add to your Cursor MCP configuration:

**Option A: Through Cursor Settings**
- Open Cursor → Settings → Features → Model Context Protocol
- Add new server configuration

**Option B: Create `.cursor-mcp/config.json`**
```json
{
  "servers": {
    "figma-flutter": {
      "command": "node",
      "args": ["dist/server.js"],
      "cwd": "/path/to/your/figma-flutter-mcp",
      "description": "Figma to Flutter code generation"
    }
  }
}
```

Replace `/path/to/your/figma-flutter-mcp` with your actual project path (use `pwd` to find it).

## 🛠️ Usage

### Basic Workflow

1. **Start the server**: `npm run dev`
2. **Open Cursor AI** and start a chat
3. **Use natural language** to interact with your Figma designs

### Example Commands

#### Get Started
```
"Check my MCP server status"
```

#### Explore Figma Files
```
"Fetch my Figma file with ID abc123def456 and show me what's in it"
"Explore the structure of my Figma design"
```

#### Generate Flutter Code
```
"Generate a complete Flutter project structure from my Figma file"
"Generate a Flutter widget for the login screen component"
"Create Flutter widgets for all components in my design"
```

### Working with Specific Components

1. **First, get component IDs:**
```
"Explore my Figma page and show me all component node IDs"
```

2. **Generate specific widgets:**
```
"Generate Flutter widget for node ID 1:234 from my Figma file"
```

## 🏗️ Generated Project Structure

The MCP server intelligently organizes generated Flutter code:

### Screens (Complete UI Pages)
```
lib/ui/screens/welcome/welcome_screen.dart
lib/ui/screens/login/login_screen.dart
lib/ui/screens/profile/profile_screen.dart
```

### Screen-Specific Widgets (Private)
```
lib/ui/screens/welcome/widgets/_hero_banner.dart
lib/ui/screens/login/widgets/_login_form.dart
lib/ui/screens/profile/widgets/_avatar_section.dart
```

### Global Widgets (Public/Reusable)
```
lib/ui/widgets/custom_button/custom_button.dart
lib/ui/widgets/post_card/post_card.dart
lib/ui/widgets/user_avatar/user_avatar.dart
```

### Naming Conventions

- **Screens**: `ScreenNameScreen` class in `screen_name_screen.dart`
- **Private Widgets**: `_WidgetName` class in `_widget_name.dart`
- **Public Widgets**: `WidgetName` class in `widget_name.dart`
- **File Names**: `snake_case` for files, `PascalCase` for classes

## 🔧 Project Architecture

```
figma-flutter-mcp/
├── server.mts                 # Main MCP server entry point
├── types/
│   └── figma.mts             # Figma API type definitions
├── services/
│   └── figma.mts             # Figma API service layer
├── tools/
│   ├── index.mts             # Main tools registration
│   ├── config.mts            # Configuration tools
│   ├── figma.mts             # Figma-related tools
│   └── flutter/              # Flutter generation tools
│       ├── index.mts         # Flutter tools registration
│       ├── types.mts         # Flutter-specific types
│       ├── utils.mts         # Utility functions
│       ├── generators.mts    # Widget code generators
│       ├── widget-builder.mts # Main widget building logic
│       └── project-structure.mts # Project structure generation
├── package.json
├── tsconfig.json
├── .env                      # Environment variables
└── README.md
```

## 🧰 Available MCP Tools

### Configuration Tools
- `check_status` - Check server configuration and health
- `set_figma_token` - Manually override Figma token (optional)
- `reload_env_token` - Reload token from .env file
- `test_connection` - Test MCP server connection

### Figma Tools
- `fetch_figma_file` - Retrieve Figma file information
- `explore_figma_page` - Explore page structure and get node IDs
- `get_figma_node` - Get detailed information about specific components

### Flutter Tools
- `generate_flutter_widget` - Generate Flutter widget from specific Figma component
- `generate_flutter_project_structure` - Generate complete Flutter project from Figma page

## 🎯 Smart Widget Detection

The server automatically categorizes Figma components:

### Screen Detection
Identifies complete screens by keywords: `screen`, `page`, `view`, `welcome`, `login`, `register`, `feed`, `profile`, `chat`, `home`, `settings`

### Global Widget Detection  
Identifies reusable components by keywords: `button`, `component`, `card`, `input`, `header`, `footer`, `navbar`, `dialog`, `modal`

### Everything Else
Components not matching screen or global widget patterns are treated as screen-specific widgets.

## 📚 Example Usage Scenarios

### Scenario 1: New Flutter Project from Figma
```
"I have a Figma file for a social media app. Generate a complete Flutter project structure with all screens and components organized properly."
```

### Scenario 2: Single Component Update
```
"The login button design changed in Figma. Generate just the Flutter code for node ID 1:456."
```

### Scenario 3: Design System Components
```
"Extract all the reusable UI components from my Figma design system and generate Flutter widgets."
```

## 🔍 Troubleshooting

### Server Not Responding
1. Ensure `npm run dev` is running
2. Check if `.env` file exists with valid token
3. Verify Cursor MCP configuration path is correct

### Figma API Errors
1. Verify your Figma token is valid
2. Ensure the Figma file ID is correct
3. Check if you have access to the Figma file

### Generated Code Issues
1. Review the Figma component structure
2. Check if component names follow valid naming conventions
3. Ensure components have proper styling information

### MCP Connection Issues
1. Restart Cursor AI
2. Rebuild the project: `npm run build`
3. Check the terminal for server error messages

## 🚀 Production Deployment

For always-running server (optional):

### Using PM2
```bash
npm install -g pm2
npm run build
pm2 start dist/server.js --name figma-flutter-mcp
pm2 save
```

### Using System Service
Create systemd service (Linux) or launchd (macOS) for automatic startup.

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Built with [Model Context Protocol (MCP)](https://modelcontextprotocol.io/)
- Powered by [Figma API](https://www.figma.com/developers/api)
- Designed for [Cursor AI](https://cursor.sh/)
- Generates [Flutter](https://flutter.dev/) code

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/figma-flutter-mcp/issues)
- **Documentation**: [MCP Documentation](https://modelcontextprotocol.io/docs)
- **Figma API**: [Figma Developer Docs](https://www.figma.com/developers/api)

## 🔑 License
This project is licensed under the MIT License - see the [LICENSE](LICENSE.md) file for details

## 🙋‍♂️ Author
#### Muhammad Hamza
[![LinkedIn Link](https://img.shields.io/badge/Connect-Hamza-blue.svg?logo=linkedin&longCache=true&style=social&label=Connect
)](https://www.linkedin.com/in/mhmzdev)

You can also follow my GitHub Profile to stay updated about my latest projects:

[![GitHub Follow](https://img.shields.io/badge/Connect-Hamza-blue.svg?logo=Github&longCache=true&style=social&label=Follow)](https://github.com/mhmzdev)

If you liked the repo then kindly support it by giving it a star ⭐!

Copyright (c) 2025 MUHAMMAD HAMZA

---

**Built with ❤️ for designers and developers who want to bridge the gap between design and code.**