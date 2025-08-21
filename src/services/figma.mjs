"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FigmaService = void 0;
// services/figma.mts (enhanced version)
var node_fetch_1 = require("node-fetch");
var errors_mjs_1 = require("../types/errors.mjs");
var retry_mjs_1 = require("../utils/retry.mjs");
var FigmaService = /** @class */ (function () {
    function FigmaService(accessToken) {
        this.baseUrl = 'https://api.figma.com/v1';
        if (!accessToken || accessToken.trim().length === 0) {
            throw new errors_mjs_1.FigmaAuthError('Figma access token is required');
        }
        this.accessToken = accessToken;
    }
    /**
     * Make a request to the Figma API with retry logic and proper error handling
     */
    FigmaService.prototype.makeRequest = function (endpoint) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                return [2 /*return*/, (0, retry_mjs_1.withRetry)(function () { return __awaiter(_this, void 0, void 0, function () {
                        var url, response, errorDetails, errorBody, parsedError, _a, error, data, error_1;
                        return __generator(this, function (_b) {
                            switch (_b.label) {
                                case 0:
                                    url = "".concat(this.baseUrl).concat(endpoint);
                                    _b.label = 1;
                                case 1:
                                    _b.trys.push([1, 9, , 10]);
                                    console.log("\uD83D\uDD04 Making Figma API request: ".concat(endpoint));
                                    return [4 /*yield*/, (0, node_fetch_1.default)(url, {
                                            headers: {
                                                'X-Figma-Token': this.accessToken,
                                                'Content-Type': 'application/json'
                                            }
                                        })];
                                case 2:
                                    response = _b.sent();
                                    if (!!response.ok) return [3 /*break*/, 7];
                                    errorDetails = '';
                                    _b.label = 3;
                                case 3:
                                    _b.trys.push([3, 5, , 6]);
                                    return [4 /*yield*/, response.text()];
                                case 4:
                                    errorBody = _b.sent();
                                    if (errorBody) {
                                        parsedError = JSON.parse(errorBody);
                                        errorDetails = parsedError.message || parsedError.error || errorBody;
                                    }
                                    return [3 /*break*/, 6];
                                case 5:
                                    _a = _b.sent();
                                    return [3 /*break*/, 6];
                                case 6:
                                    error = (0, errors_mjs_1.createFigmaError)(response, errorDetails);
                                    // Add more context for specific errors
                                    if (response.status === 404) {
                                        throw new errors_mjs_1.FigmaNotFoundError('API endpoint', endpoint);
                                    }
                                    throw error;
                                case 7: return [4 /*yield*/, response.json()];
                                case 8:
                                    data = _b.sent();
                                    console.log("\u2705 Successfully fetched: ".concat(endpoint));
                                    return [2 /*return*/, data];
                                case 9:
                                    error_1 = _b.sent();
                                    // Convert fetch errors to our error types
                                    if (error_1 instanceof errors_mjs_1.FigmaError) {
                                        throw error_1; // Re-throw our custom errors
                                    }
                                    if (error_1 instanceof Error) {
                                        if (error_1.message.includes('ENOTFOUND') || error_1.message.includes('ECONNREFUSED')) {
                                            throw new errors_mjs_1.FigmaNetworkError('Unable to connect to Figma API', error_1);
                                        }
                                        if (error_1.name === 'SyntaxError') {
                                            throw new errors_mjs_1.FigmaParseError('Invalid JSON response from Figma API', error_1);
                                        }
                                    }
                                    throw new errors_mjs_1.FigmaNetworkError("Unexpected error: ".concat(error_1), error_1);
                                case 10: return [2 /*return*/];
                            }
                        });
                    }); }, {
                        maxAttempts: 3,
                        initialDelayMs: 1000,
                        maxDelayMs: 10000
                    })];
            });
        });
    };
    /**
     * Fetch a complete Figma file with enhanced error handling
     */
    FigmaService.prototype.getFile = function (fileId) {
        return __awaiter(this, void 0, void 0, function () {
            var data, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!fileId || fileId.trim().length === 0) {
                            throw new errors_mjs_1.FigmaError('File ID is required', 'INVALID_INPUT');
                        }
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, this.makeRequest("/files/".concat(fileId))];
                    case 2:
                        data = _a.sent();
                        // Validate response structure
                        if (!data.document || !data.name) {
                            throw new errors_mjs_1.FigmaParseError('Invalid file structure received from Figma API', data);
                        }
                        return [2 /*return*/, data];
                    case 3:
                        error_2 = _a.sent();
                        if (error_2 instanceof errors_mjs_1.FigmaError) {
                            throw error_2;
                        }
                        throw new errors_mjs_1.FigmaError("Failed to fetch file ".concat(fileId, ": ").concat(error_2), 'FETCH_ERROR');
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Get basic file information with validation
     */
    FigmaService.prototype.getFileInfo = function (fileId) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function () {
            var file;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, this.getFile(fileId)];
                    case 1:
                        file = _c.sent();
                        return [2 /*return*/, {
                                name: file.name,
                                lastModified: file.lastModified,
                                version: file.version,
                                role: file.role,
                                editorType: file.editorType,
                                componentCount: Object.keys(file.components || {}).length,
                                styleCount: Object.keys(file.styles || {}).length,
                                pageCount: ((_b = (_a = file.document) === null || _a === void 0 ? void 0 : _a.children) === null || _b === void 0 ? void 0 : _b.length) || 0
                            }];
                }
            });
        });
    };
    /**
     * Get all pages in a file with validation
     */
    FigmaService.prototype.getPages = function (fileId) {
        var _a;
        return __awaiter(this, void 0, void 0, function () {
            var file;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, this.getFile(fileId)];
                    case 1:
                        file = _b.sent();
                        if (!((_a = file.document) === null || _a === void 0 ? void 0 : _a.children)) {
                            throw new errors_mjs_1.FigmaParseError('File has no pages or invalid structure');
                        }
                        return [2 /*return*/, file.document.children.map(function (page) { return ({
                                id: page.id,
                                name: page.name,
                                type: page.type
                            }); })];
                }
            });
        });
    };
    /**
     * Get a specific page by ID with better error messages
     */
    FigmaService.prototype.getPage = function (fileId, pageId) {
        var _a;
        return __awaiter(this, void 0, void 0, function () {
            var file, page, availablePages;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, this.getFile(fileId)];
                    case 1:
                        file = _b.sent();
                        if (!((_a = file.document) === null || _a === void 0 ? void 0 : _a.children) || file.document.children.length === 0) {
                            throw new errors_mjs_1.FigmaNotFoundError('pages', fileId);
                        }
                        if (!pageId) {
                            // Return first page if no pageId specified
                            return [2 /*return*/, file.document.children[0]];
                        }
                        page = file.document.children.find(function (page) { return page.id === pageId; });
                        if (!page) {
                            availablePages = file.document.children
                                .map(function (p) { return "".concat(p.name, " (").concat(p.id, ")"); })
                                .join(', ');
                            throw new errors_mjs_1.FigmaNotFoundError('page', "".concat(pageId, ". Available pages: ").concat(availablePages));
                        }
                        return [2 /*return*/, page];
                }
            });
        });
    };
    /**
     * Get a specific node by ID with enhanced error handling
     */
    FigmaService.prototype.getNode = function (fileId, nodeId) {
        var _a;
        return __awaiter(this, void 0, void 0, function () {
            var data, node, error_3;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (!nodeId || nodeId.trim().length === 0) {
                            throw new errors_mjs_1.FigmaError('Node ID is required', 'INVALID_INPUT');
                        }
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, this.makeRequest("/files/".concat(fileId, "/nodes?ids=").concat(nodeId))];
                    case 2:
                        data = _b.sent();
                        if (!data.nodes || !data.nodes[nodeId]) {
                            throw new errors_mjs_1.FigmaNotFoundError('node', nodeId);
                        }
                        node = (_a = data.nodes[nodeId]) === null || _a === void 0 ? void 0 : _a.document;
                        if (!node) {
                            throw new errors_mjs_1.FigmaParseError("Node ".concat(nodeId, " exists but has no document data"));
                        }
                        return [2 /*return*/, node];
                    case 3:
                        error_3 = _b.sent();
                        if (error_3 instanceof errors_mjs_1.FigmaError) {
                            throw error_3;
                        }
                        throw new errors_mjs_1.FigmaError("Failed to fetch node ".concat(nodeId, ": ").concat(error_3), 'FETCH_ERROR');
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Explore node structure with depth limit and error handling
     */
    FigmaService.prototype.exploreNodeStructure = function (node, maxDepth, currentDepth) {
        if (maxDepth === void 0) { maxDepth = 3; }
        if (currentDepth === void 0) { currentDepth = 0; }
        try {
            var indent = '  '.repeat(currentDepth);
            var result = "".concat(indent, "\uD83D\uDCE6 ").concat(node.name || 'Unnamed', " (").concat(node.type, ")\n");
            result += "".concat(indent, "   ID: ").concat(node.id, "\n");
            if (node.visible === false) {
                result += "".concat(indent, "   \u26A0\uFE0F Hidden\n");
            }
            if (node.children && node.children.length > 0 && currentDepth < maxDepth) {
                result += "".concat(indent, "   Children (").concat(node.children.length, "):\n");
                // Show first 10 children to avoid overwhelming output
                var childrenToShow = node.children.slice(0, 10);
                for (var _i = 0, childrenToShow_1 = childrenToShow; _i < childrenToShow_1.length; _i++) {
                    var child = childrenToShow_1[_i];
                    try {
                        result += this.exploreNodeStructure(child, maxDepth, currentDepth + 1);
                    }
                    catch (error) {
                        result += "".concat(indent, "     \u274C Error exploring child: ").concat(error, "\n");
                    }
                }
                if (node.children.length > 10) {
                    result += "".concat(indent, "     ... and ").concat(node.children.length - 10, " more children\n");
                }
            }
            else if (node.children && node.children.length > 0) {
                result += "".concat(indent, "   \uD83D\uDCC1 ").concat(node.children.length, " children (max depth reached)\n");
            }
            return result;
        }
        catch (error) {
            return "\u274C Error exploring node ".concat(node.id, ": ").concat(error, "\n");
        }
    };
    return FigmaService;
}());
exports.FigmaService = FigmaService;
