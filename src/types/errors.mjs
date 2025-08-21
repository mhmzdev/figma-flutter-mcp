"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.createFigmaError = exports.FigmaParseError = exports.FigmaNetworkError = exports.FigmaRateLimitError = exports.FigmaNotFoundError = exports.FigmaAuthError = exports.FigmaError = void 0;
var FigmaError = /** @class */ (function (_super) {
    __extends(FigmaError, _super);
    function FigmaError(message, code, statusCode) {
        var _this = _super.call(this, message) || this;
        _this.code = code;
        _this.statusCode = statusCode;
        _this.name = 'FigmaError';
        return _this;
    }
    return FigmaError;
}(Error));
exports.FigmaError = FigmaError;
var FigmaAuthError = /** @class */ (function (_super) {
    __extends(FigmaAuthError, _super);
    function FigmaAuthError(message) {
        if (message === void 0) { message = 'Invalid Figma access token'; }
        var _this = _super.call(this, message, 'AUTH_ERROR', 401) || this;
        _this.name = 'FigmaAuthError';
        return _this;
    }
    return FigmaAuthError;
}(FigmaError));
exports.FigmaAuthError = FigmaAuthError;
var FigmaNotFoundError = /** @class */ (function (_super) {
    __extends(FigmaNotFoundError, _super);
    function FigmaNotFoundError(resource, id) {
        var _this = _super.call(this, "".concat(resource, " not found: ").concat(id), 'NOT_FOUND', 404) || this;
        _this.name = 'FigmaNotFoundError';
        return _this;
    }
    return FigmaNotFoundError;
}(FigmaError));
exports.FigmaNotFoundError = FigmaNotFoundError;
var FigmaRateLimitError = /** @class */ (function (_super) {
    __extends(FigmaRateLimitError, _super);
    function FigmaRateLimitError(retryAfter) {
        var _this = _super.call(this, "Rate limit exceeded".concat(retryAfter ? ". Retry after ".concat(retryAfter, " seconds") : ''), 'RATE_LIMIT', 429) || this;
        _this.name = 'FigmaRateLimitError';
        _this.retryAfter = retryAfter;
        return _this;
    }
    return FigmaRateLimitError;
}(FigmaError));
exports.FigmaRateLimitError = FigmaRateLimitError;
var FigmaNetworkError = /** @class */ (function (_super) {
    __extends(FigmaNetworkError, _super);
    function FigmaNetworkError(message, originalError) {
        var _this = _super.call(this, "Network error: ".concat(message), 'NETWORK_ERROR') || this;
        _this.originalError = originalError;
        _this.name = 'FigmaNetworkError';
        return _this;
    }
    return FigmaNetworkError;
}(FigmaError));
exports.FigmaNetworkError = FigmaNetworkError;
var FigmaParseError = /** @class */ (function (_super) {
    __extends(FigmaParseError, _super);
    function FigmaParseError(message, rawResponse) {
        var _this = _super.call(this, "Failed to parse Figma response: ".concat(message), 'PARSE_ERROR') || this;
        _this.rawResponse = rawResponse;
        _this.name = 'FigmaParseError';
        return _this;
    }
    return FigmaParseError;
}(FigmaError));
exports.FigmaParseError = FigmaParseError;
function createFigmaError(response, message) {
    var defaultMessage = message || "Figma API error: ".concat(response.status, " ").concat(response.statusText);
    switch (response.status) {
        case 401:
        case 403:
            return new FigmaAuthError(defaultMessage);
        case 404:
            return new FigmaNotFoundError('Resource', 'unknown');
        case 429:
            var retryAfter = response.headers.get('Retry-After');
            return new FigmaRateLimitError(retryAfter ? parseInt(retryAfter, 10) : undefined);
        default:
            return new FigmaError(defaultMessage, 'API_ERROR', response.status);
    }
}
exports.createFigmaError = createFigmaError;
