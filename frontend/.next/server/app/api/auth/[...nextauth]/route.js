"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
(() => {
var exports = {};
exports.id = "app/api/auth/[...nextauth]/route";
exports.ids = ["app/api/auth/[...nextauth]/route"];
exports.modules = {

/***/ "../../client/components/action-async-storage.external":
/*!*******************************************************************************!*\
  !*** external "next/dist/client/components/action-async-storage.external.js" ***!
  \*******************************************************************************/
/***/ ((module) => {

module.exports = require("next/dist/client/components/action-async-storage.external.js");

/***/ }),

/***/ "../../client/components/request-async-storage.external":
/*!********************************************************************************!*\
  !*** external "next/dist/client/components/request-async-storage.external.js" ***!
  \********************************************************************************/
/***/ ((module) => {

module.exports = require("next/dist/client/components/request-async-storage.external.js");

/***/ }),

/***/ "../../client/components/static-generation-async-storage.external":
/*!******************************************************************************************!*\
  !*** external "next/dist/client/components/static-generation-async-storage.external.js" ***!
  \******************************************************************************************/
/***/ ((module) => {

module.exports = require("next/dist/client/components/static-generation-async-storage.external.js");

/***/ }),

/***/ "next/dist/compiled/next-server/app-page.runtime.dev.js":
/*!*************************************************************************!*\
  !*** external "next/dist/compiled/next-server/app-page.runtime.dev.js" ***!
  \*************************************************************************/
/***/ ((module) => {

module.exports = require("next/dist/compiled/next-server/app-page.runtime.dev.js");

/***/ }),

/***/ "next/dist/compiled/next-server/app-route.runtime.dev.js":
/*!**************************************************************************!*\
  !*** external "next/dist/compiled/next-server/app-route.runtime.dev.js" ***!
  \**************************************************************************/
/***/ ((module) => {

module.exports = require("next/dist/compiled/next-server/app-route.runtime.dev.js");

/***/ }),

/***/ "assert":
/*!*************************!*\
  !*** external "assert" ***!
  \*************************/
/***/ ((module) => {

module.exports = require("assert");

/***/ }),

/***/ "buffer":
/*!*************************!*\
  !*** external "buffer" ***!
  \*************************/
/***/ ((module) => {

module.exports = require("buffer");

/***/ }),

/***/ "crypto":
/*!*************************!*\
  !*** external "crypto" ***!
  \*************************/
/***/ ((module) => {

module.exports = require("crypto");

/***/ }),

/***/ "events":
/*!*************************!*\
  !*** external "events" ***!
  \*************************/
/***/ ((module) => {

module.exports = require("events");

/***/ }),

/***/ "http":
/*!***********************!*\
  !*** external "http" ***!
  \***********************/
/***/ ((module) => {

module.exports = require("http");

/***/ }),

/***/ "https":
/*!************************!*\
  !*** external "https" ***!
  \************************/
/***/ ((module) => {

module.exports = require("https");

/***/ }),

/***/ "querystring":
/*!******************************!*\
  !*** external "querystring" ***!
  \******************************/
/***/ ((module) => {

module.exports = require("querystring");

/***/ }),

/***/ "url":
/*!**********************!*\
  !*** external "url" ***!
  \**********************/
/***/ ((module) => {

module.exports = require("url");

/***/ }),

/***/ "util":
/*!***********************!*\
  !*** external "util" ***!
  \***********************/
/***/ ((module) => {

module.exports = require("util");

/***/ }),

/***/ "zlib":
/*!***********************!*\
  !*** external "zlib" ***!
  \***********************/
/***/ ((module) => {

module.exports = require("zlib");

/***/ }),

/***/ "(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader.js?name=app%2Fapi%2Fauth%2F%5B...nextauth%5D%2Froute&page=%2Fapi%2Fauth%2F%5B...nextauth%5D%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fauth%2F%5B...nextauth%5D%2Froute.ts&appDir=C%3A%5CUsers%5Cjizar%5COneDrive%5CDocuments%5CDiscordBot%5Cfrontend%5Capp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=C%3A%5CUsers%5Cjizar%5COneDrive%5CDocuments%5CDiscordBot%5Cfrontend&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!":
/*!******************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************!*\
  !*** ./node_modules/next/dist/build/webpack/loaders/next-app-loader.js?name=app%2Fapi%2Fauth%2F%5B...nextauth%5D%2Froute&page=%2Fapi%2Fauth%2F%5B...nextauth%5D%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fauth%2F%5B...nextauth%5D%2Froute.ts&appDir=C%3A%5CUsers%5Cjizar%5COneDrive%5CDocuments%5CDiscordBot%5Cfrontend%5Capp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=C%3A%5CUsers%5Cjizar%5COneDrive%5CDocuments%5CDiscordBot%5Cfrontend&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D! ***!
  \******************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   originalPathname: () => (/* binding */ originalPathname),\n/* harmony export */   patchFetch: () => (/* binding */ patchFetch),\n/* harmony export */   requestAsyncStorage: () => (/* binding */ requestAsyncStorage),\n/* harmony export */   routeModule: () => (/* binding */ routeModule),\n/* harmony export */   serverHooks: () => (/* binding */ serverHooks),\n/* harmony export */   staticGenerationAsyncStorage: () => (/* binding */ staticGenerationAsyncStorage)\n/* harmony export */ });\n/* harmony import */ var next_dist_server_future_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! next/dist/server/future/route-modules/app-route/module.compiled */ \"(rsc)/./node_modules/next/dist/server/future/route-modules/app-route/module.compiled.js\");\n/* harmony import */ var next_dist_server_future_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_future_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var next_dist_server_future_route_kind__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! next/dist/server/future/route-kind */ \"(rsc)/./node_modules/next/dist/server/future/route-kind.js\");\n/* harmony import */ var next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! next/dist/server/lib/patch-fetch */ \"(rsc)/./node_modules/next/dist/server/lib/patch-fetch.js\");\n/* harmony import */ var next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__);\n/* harmony import */ var C_Users_jizar_OneDrive_Documents_DiscordBot_frontend_app_api_auth_nextauth_route_ts__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./app/api/auth/[...nextauth]/route.ts */ \"(rsc)/./app/api/auth/[...nextauth]/route.ts\");\n\n\n\n\n// We inject the nextConfigOutput here so that we can use them in the route\n// module.\nconst nextConfigOutput = \"\"\nconst routeModule = new next_dist_server_future_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__.AppRouteRouteModule({\n    definition: {\n        kind: next_dist_server_future_route_kind__WEBPACK_IMPORTED_MODULE_1__.RouteKind.APP_ROUTE,\n        page: \"/api/auth/[...nextauth]/route\",\n        pathname: \"/api/auth/[...nextauth]\",\n        filename: \"route\",\n        bundlePath: \"app/api/auth/[...nextauth]/route\"\n    },\n    resolvedPagePath: \"C:\\\\Users\\\\jizar\\\\OneDrive\\\\Documents\\\\DiscordBot\\\\frontend\\\\app\\\\api\\\\auth\\\\[...nextauth]\\\\route.ts\",\n    nextConfigOutput,\n    userland: C_Users_jizar_OneDrive_Documents_DiscordBot_frontend_app_api_auth_nextauth_route_ts__WEBPACK_IMPORTED_MODULE_3__\n});\n// Pull out the exports that we need to expose from the module. This should\n// be eliminated when we've moved the other routes to the new format. These\n// are used to hook into the route.\nconst { requestAsyncStorage, staticGenerationAsyncStorage, serverHooks } = routeModule;\nconst originalPathname = \"/api/auth/[...nextauth]/route\";\nfunction patchFetch() {\n    return (0,next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__.patchFetch)({\n        serverHooks,\n        staticGenerationAsyncStorage\n    });\n}\n\n\n//# sourceMappingURL=app-route.js.map//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9ub2RlX21vZHVsZXMvbmV4dC9kaXN0L2J1aWxkL3dlYnBhY2svbG9hZGVycy9uZXh0LWFwcC1sb2FkZXIuanM/bmFtZT1hcHAlMkZhcGklMkZhdXRoJTJGJTVCLi4ubmV4dGF1dGglNUQlMkZyb3V0ZSZwYWdlPSUyRmFwaSUyRmF1dGglMkYlNUIuLi5uZXh0YXV0aCU1RCUyRnJvdXRlJmFwcFBhdGhzPSZwYWdlUGF0aD1wcml2YXRlLW5leHQtYXBwLWRpciUyRmFwaSUyRmF1dGglMkYlNUIuLi5uZXh0YXV0aCU1RCUyRnJvdXRlLnRzJmFwcERpcj1DJTNBJTVDVXNlcnMlNUNqaXphciU1Q09uZURyaXZlJTVDRG9jdW1lbnRzJTVDRGlzY29yZEJvdCU1Q2Zyb250ZW5kJTVDYXBwJnBhZ2VFeHRlbnNpb25zPXRzeCZwYWdlRXh0ZW5zaW9ucz10cyZwYWdlRXh0ZW5zaW9ucz1qc3gmcGFnZUV4dGVuc2lvbnM9anMmcm9vdERpcj1DJTNBJTVDVXNlcnMlNUNqaXphciU1Q09uZURyaXZlJTVDRG9jdW1lbnRzJTVDRGlzY29yZEJvdCU1Q2Zyb250ZW5kJmlzRGV2PXRydWUmdHNjb25maWdQYXRoPXRzY29uZmlnLmpzb24mYmFzZVBhdGg9JmFzc2V0UHJlZml4PSZuZXh0Q29uZmlnT3V0cHV0PSZwcmVmZXJyZWRSZWdpb249Jm1pZGRsZXdhcmVDb25maWc9ZTMwJTNEISIsIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7QUFBc0c7QUFDdkM7QUFDYztBQUNvRDtBQUNqSTtBQUNBO0FBQ0E7QUFDQSx3QkFBd0IsZ0hBQW1CO0FBQzNDO0FBQ0EsY0FBYyx5RUFBUztBQUN2QjtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUs7QUFDTDtBQUNBO0FBQ0EsWUFBWTtBQUNaLENBQUM7QUFDRDtBQUNBO0FBQ0E7QUFDQSxRQUFRLGlFQUFpRTtBQUN6RTtBQUNBO0FBQ0EsV0FBVyw0RUFBVztBQUN0QjtBQUNBO0FBQ0EsS0FBSztBQUNMO0FBQ3VIOztBQUV2SCIsInNvdXJjZXMiOlsid2VicGFjazovL3JlZG0tZGFzaGJvYXJkLz8wZmQ4Il0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEFwcFJvdXRlUm91dGVNb2R1bGUgfSBmcm9tIFwibmV4dC9kaXN0L3NlcnZlci9mdXR1cmUvcm91dGUtbW9kdWxlcy9hcHAtcm91dGUvbW9kdWxlLmNvbXBpbGVkXCI7XG5pbXBvcnQgeyBSb3V0ZUtpbmQgfSBmcm9tIFwibmV4dC9kaXN0L3NlcnZlci9mdXR1cmUvcm91dGUta2luZFwiO1xuaW1wb3J0IHsgcGF0Y2hGZXRjaCBhcyBfcGF0Y2hGZXRjaCB9IGZyb20gXCJuZXh0L2Rpc3Qvc2VydmVyL2xpYi9wYXRjaC1mZXRjaFwiO1xuaW1wb3J0ICogYXMgdXNlcmxhbmQgZnJvbSBcIkM6XFxcXFVzZXJzXFxcXGppemFyXFxcXE9uZURyaXZlXFxcXERvY3VtZW50c1xcXFxEaXNjb3JkQm90XFxcXGZyb250ZW5kXFxcXGFwcFxcXFxhcGlcXFxcYXV0aFxcXFxbLi4ubmV4dGF1dGhdXFxcXHJvdXRlLnRzXCI7XG4vLyBXZSBpbmplY3QgdGhlIG5leHRDb25maWdPdXRwdXQgaGVyZSBzbyB0aGF0IHdlIGNhbiB1c2UgdGhlbSBpbiB0aGUgcm91dGVcbi8vIG1vZHVsZS5cbmNvbnN0IG5leHRDb25maWdPdXRwdXQgPSBcIlwiXG5jb25zdCByb3V0ZU1vZHVsZSA9IG5ldyBBcHBSb3V0ZVJvdXRlTW9kdWxlKHtcbiAgICBkZWZpbml0aW9uOiB7XG4gICAgICAgIGtpbmQ6IFJvdXRlS2luZC5BUFBfUk9VVEUsXG4gICAgICAgIHBhZ2U6IFwiL2FwaS9hdXRoL1suLi5uZXh0YXV0aF0vcm91dGVcIixcbiAgICAgICAgcGF0aG5hbWU6IFwiL2FwaS9hdXRoL1suLi5uZXh0YXV0aF1cIixcbiAgICAgICAgZmlsZW5hbWU6IFwicm91dGVcIixcbiAgICAgICAgYnVuZGxlUGF0aDogXCJhcHAvYXBpL2F1dGgvWy4uLm5leHRhdXRoXS9yb3V0ZVwiXG4gICAgfSxcbiAgICByZXNvbHZlZFBhZ2VQYXRoOiBcIkM6XFxcXFVzZXJzXFxcXGppemFyXFxcXE9uZURyaXZlXFxcXERvY3VtZW50c1xcXFxEaXNjb3JkQm90XFxcXGZyb250ZW5kXFxcXGFwcFxcXFxhcGlcXFxcYXV0aFxcXFxbLi4ubmV4dGF1dGhdXFxcXHJvdXRlLnRzXCIsXG4gICAgbmV4dENvbmZpZ091dHB1dCxcbiAgICB1c2VybGFuZFxufSk7XG4vLyBQdWxsIG91dCB0aGUgZXhwb3J0cyB0aGF0IHdlIG5lZWQgdG8gZXhwb3NlIGZyb20gdGhlIG1vZHVsZS4gVGhpcyBzaG91bGRcbi8vIGJlIGVsaW1pbmF0ZWQgd2hlbiB3ZSd2ZSBtb3ZlZCB0aGUgb3RoZXIgcm91dGVzIHRvIHRoZSBuZXcgZm9ybWF0LiBUaGVzZVxuLy8gYXJlIHVzZWQgdG8gaG9vayBpbnRvIHRoZSByb3V0ZS5cbmNvbnN0IHsgcmVxdWVzdEFzeW5jU3RvcmFnZSwgc3RhdGljR2VuZXJhdGlvbkFzeW5jU3RvcmFnZSwgc2VydmVySG9va3MgfSA9IHJvdXRlTW9kdWxlO1xuY29uc3Qgb3JpZ2luYWxQYXRobmFtZSA9IFwiL2FwaS9hdXRoL1suLi5uZXh0YXV0aF0vcm91dGVcIjtcbmZ1bmN0aW9uIHBhdGNoRmV0Y2goKSB7XG4gICAgcmV0dXJuIF9wYXRjaEZldGNoKHtcbiAgICAgICAgc2VydmVySG9va3MsXG4gICAgICAgIHN0YXRpY0dlbmVyYXRpb25Bc3luY1N0b3JhZ2VcbiAgICB9KTtcbn1cbmV4cG9ydCB7IHJvdXRlTW9kdWxlLCByZXF1ZXN0QXN5bmNTdG9yYWdlLCBzdGF0aWNHZW5lcmF0aW9uQXN5bmNTdG9yYWdlLCBzZXJ2ZXJIb29rcywgb3JpZ2luYWxQYXRobmFtZSwgcGF0Y2hGZXRjaCwgIH07XG5cbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWFwcC1yb3V0ZS5qcy5tYXAiXSwibmFtZXMiOltdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader.js?name=app%2Fapi%2Fauth%2F%5B...nextauth%5D%2Froute&page=%2Fapi%2Fauth%2F%5B...nextauth%5D%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fauth%2F%5B...nextauth%5D%2Froute.ts&appDir=C%3A%5CUsers%5Cjizar%5COneDrive%5CDocuments%5CDiscordBot%5Cfrontend%5Capp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=C%3A%5CUsers%5Cjizar%5COneDrive%5CDocuments%5CDiscordBot%5Cfrontend&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!\n");

/***/ }),

/***/ "(rsc)/./app/api/auth/[...nextauth]/route.ts":
/*!*********************************************!*\
  !*** ./app/api/auth/[...nextauth]/route.ts ***!
  \*********************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   GET: () => (/* binding */ handler),\n/* harmony export */   POST: () => (/* binding */ handler),\n/* harmony export */   dynamic: () => (/* binding */ dynamic)\n/* harmony export */ });\n/* harmony import */ var next_auth__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! next-auth */ \"(rsc)/./node_modules/next-auth/index.js\");\n/* harmony import */ var next_auth__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(next_auth__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var _lib_auth_options__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @/lib/auth-options */ \"(rsc)/./lib/auth-options.ts\");\n\n\n// Force dynamic rendering\nconst dynamic = \"force-dynamic\";\nconst handler = next_auth__WEBPACK_IMPORTED_MODULE_0___default()(_lib_auth_options__WEBPACK_IMPORTED_MODULE_1__.authOptions);\n\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9hcHAvYXBpL2F1dGgvWy4uLm5leHRhdXRoXS9yb3V0ZS50cyIsIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7QUFBZ0M7QUFDZ0I7QUFFaEQsMEJBQTBCO0FBQ25CLE1BQU1FLFVBQVUsZ0JBQWdCO0FBRXZDLE1BQU1DLFVBQVVILGdEQUFRQSxDQUFDQywwREFBV0E7QUFFTSIsInNvdXJjZXMiOlsid2VicGFjazovL3JlZG0tZGFzaGJvYXJkLy4vYXBwL2FwaS9hdXRoL1suLi5uZXh0YXV0aF0vcm91dGUudHM/YzhhNCJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgTmV4dEF1dGggZnJvbSBcIm5leHQtYXV0aFwiXG5pbXBvcnQgeyBhdXRoT3B0aW9ucyB9IGZyb20gXCJAL2xpYi9hdXRoLW9wdGlvbnNcIlxuXG4vLyBGb3JjZSBkeW5hbWljIHJlbmRlcmluZ1xuZXhwb3J0IGNvbnN0IGR5bmFtaWMgPSAnZm9yY2UtZHluYW1pYyc7XG5cbmNvbnN0IGhhbmRsZXIgPSBOZXh0QXV0aChhdXRoT3B0aW9ucylcblxuZXhwb3J0IHsgaGFuZGxlciBhcyBHRVQsIGhhbmRsZXIgYXMgUE9TVCB9Il0sIm5hbWVzIjpbIk5leHRBdXRoIiwiYXV0aE9wdGlvbnMiLCJkeW5hbWljIiwiaGFuZGxlciIsIkdFVCIsIlBPU1QiXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///(rsc)/./app/api/auth/[...nextauth]/route.ts\n");

/***/ }),

/***/ "(rsc)/./lib/auth-options.ts":
/*!*****************************!*\
  !*** ./lib/auth-options.ts ***!
  \*****************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   authOptions: () => (/* binding */ authOptions)\n/* harmony export */ });\n/* harmony import */ var next_auth_providers_discord__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! next-auth/providers/discord */ \"(rsc)/./node_modules/next-auth/providers/discord.js\");\n\nconst authOptions = {\n    providers: [\n        (0,next_auth_providers_discord__WEBPACK_IMPORTED_MODULE_0__[\"default\"])({\n            clientId: process.env.DISCORD_OAUTH_CLIENT_ID,\n            clientSecret: process.env.DISCORD_OAUTH_CLIENT_SECRET,\n            authorization: {\n                params: {\n                    redirect_uri: \"https://fazenda.stoffeltech.com/api/auth/callback/discord\"\n                }\n            }\n        })\n    ],\n    // Use secure cookies only in production\n    useSecureCookies: \"development\" === \"production\",\n    // Trust proxy headers (important for Cloudflare Tunnel)\n    trustHost: true,\n    callbacks: {\n        async redirect ({ url, baseUrl }) {\n            // Force redirect to use the correct domain\n            const redirectUrl = \"https://fazenda.stoffeltech.com\" || 0;\n            console.log(\"NextAuth redirect debug:\", {\n                url,\n                baseUrl,\n                redirectUrl,\n                NEXTAUTH_URL: \"https://fazenda.stoffeltech.com\",\n                NODE_ENV: \"development\"\n            });\n            // Always use the configured domain - force HTTP for local development\n            const correctDomain = \"https://fazenda.stoffeltech.com\";\n            // If url contains localhost, replace it with our domain\n            if (url.includes(\"localhost\")) {\n                const fixedUrl = url.replace(/https?:\\/\\/localhost:?\\d*/, correctDomain);\n                console.log(\"Fixed localhost URL:\", url, \"->\", fixedUrl);\n                return fixedUrl;\n            }\n            // If url is relative, prepend the correct domain\n            if (url.startsWith(\"/\")) {\n                console.log(\"Redirecting to:\", `${correctDomain}${url}`);\n                return `${correctDomain}${url}`;\n            }\n            // If url already contains the correct domain, use it\n            if (url.startsWith(correctDomain)) {\n                console.log(\"URL already correct:\", url);\n                return url;\n            }\n            // Default to the correct domain\n            console.log(\"Using default domain:\", correctDomain);\n            return correctDomain;\n        },\n        async jwt ({ token, account, profile }) {\n            if (account && profile) {\n                token.id = profile.id;\n                token.username = profile.username;\n                token.discriminator = profile.discriminator;\n                token.avatar = profile.avatar;\n            }\n            return token;\n        },\n        async session ({ session, token }) {\n            if (session?.user) {\n                session.user.id = token.id;\n                session.user.username = token.username;\n                session.user.discriminator = token.discriminator;\n                session.user.avatar = token.avatar;\n            }\n            return session;\n        }\n    },\n    secret: process.env.NEXTAUTH_SECRET\n};\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9saWIvYXV0aC1vcHRpb25zLnRzIiwibWFwcGluZ3MiOiI7Ozs7O0FBQ3lEO0FBRWxELE1BQU1DLGNBQStCO0lBQzFDQyxXQUFXO1FBQ1RGLHVFQUFlQSxDQUFDO1lBQ2RHLFVBQVVDLFFBQVFDLEdBQUcsQ0FBQ0MsdUJBQXVCO1lBQzdDQyxjQUFjSCxRQUFRQyxHQUFHLENBQUNHLDJCQUEyQjtZQUNyREMsZUFBZTtnQkFDYkMsUUFBUTtvQkFDTkMsY0FBYztnQkFDaEI7WUFDRjtRQUNGO0tBQ0Q7SUFDRCx3Q0FBd0M7SUFDeENDLGtCQUFrQlIsa0JBQXlCO0lBQzNDLHdEQUF3RDtJQUN4RFMsV0FBVztJQUNYQyxXQUFXO1FBQ1QsTUFBTUMsVUFBUyxFQUFFQyxHQUFHLEVBQUVDLE9BQU8sRUFBRTtZQUM3QiwyQ0FBMkM7WUFDM0MsTUFBTUMsY0FBY2QsaUNBQXdCLElBQUlhLENBQU9BO1lBQ3ZERyxRQUFRQyxHQUFHLENBQUMsNEJBQTRCO2dCQUN0Q0w7Z0JBQ0FDO2dCQUNBQztnQkFDQUMsY0FBY2YsaUNBQXdCO2dCQUN0Q2tCLFVBNUJSO1lBNkJNO1lBRUEsc0VBQXNFO1lBQ3RFLE1BQU1DLGdCQUFnQjtZQUV0Qix3REFBd0Q7WUFDeEQsSUFBSVAsSUFBSVEsUUFBUSxDQUFDLGNBQWM7Z0JBQzdCLE1BQU1DLFdBQVdULElBQUlVLE9BQU8sQ0FBQyw2QkFBNkJIO2dCQUMxREgsUUFBUUMsR0FBRyxDQUFDLHdCQUF3QkwsS0FBSyxNQUFNUztnQkFDL0MsT0FBT0E7WUFDVDtZQUVBLGlEQUFpRDtZQUNqRCxJQUFJVCxJQUFJVyxVQUFVLENBQUMsTUFBTTtnQkFDdkJQLFFBQVFDLEdBQUcsQ0FBQyxtQkFBbUIsQ0FBQyxFQUFFRSxjQUFjLEVBQUVQLElBQUksQ0FBQztnQkFDdkQsT0FBTyxDQUFDLEVBQUVPLGNBQWMsRUFBRVAsSUFBSSxDQUFDO1lBQ2pDO1lBQ0EscURBQXFEO1lBQ3JELElBQUlBLElBQUlXLFVBQVUsQ0FBQ0osZ0JBQWdCO2dCQUNqQ0gsUUFBUUMsR0FBRyxDQUFDLHdCQUF3Qkw7Z0JBQ3BDLE9BQU9BO1lBQ1Q7WUFDQSxnQ0FBZ0M7WUFDaENJLFFBQVFDLEdBQUcsQ0FBQyx5QkFBeUJFO1lBQ3JDLE9BQU9BO1FBQ1Q7UUFDQSxNQUFNSyxLQUFJLEVBQUVDLEtBQUssRUFBRUMsT0FBTyxFQUFFQyxPQUFPLEVBQU87WUFDeEMsSUFBSUQsV0FBV0MsU0FBUztnQkFDdEJGLE1BQU1HLEVBQUUsR0FBR0QsUUFBUUMsRUFBRTtnQkFDckJILE1BQU1JLFFBQVEsR0FBR0YsUUFBUUUsUUFBUTtnQkFDakNKLE1BQU1LLGFBQWEsR0FBR0gsUUFBUUcsYUFBYTtnQkFDM0NMLE1BQU1NLE1BQU0sR0FBR0osUUFBUUksTUFBTTtZQUMvQjtZQUNBLE9BQU9OO1FBQ1Q7UUFDQSxNQUFNTyxTQUFRLEVBQUVBLE9BQU8sRUFBRVAsS0FBSyxFQUFPO1lBQ25DLElBQUlPLFNBQVNDLE1BQU07Z0JBQ2pCRCxRQUFRQyxJQUFJLENBQUNMLEVBQUUsR0FBR0gsTUFBTUcsRUFBRTtnQkFDMUJJLFFBQVFDLElBQUksQ0FBQ0osUUFBUSxHQUFHSixNQUFNSSxRQUFRO2dCQUN0Q0csUUFBUUMsSUFBSSxDQUFDSCxhQUFhLEdBQUdMLE1BQU1LLGFBQWE7Z0JBQ2hERSxRQUFRQyxJQUFJLENBQUNGLE1BQU0sR0FBR04sTUFBTU0sTUFBTTtZQUNwQztZQUNBLE9BQU9DO1FBQ1Q7SUFDRjtJQUNBRSxRQUFRbEMsUUFBUUMsR0FBRyxDQUFDa0MsZUFBZTtBQUNyQyxFQUFDIiwic291cmNlcyI6WyJ3ZWJwYWNrOi8vcmVkbS1kYXNoYm9hcmQvLi9saWIvYXV0aC1vcHRpb25zLnRzP2FhNzEiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgTmV4dEF1dGhPcHRpb25zIH0gZnJvbSBcIm5leHQtYXV0aFwiXG5pbXBvcnQgRGlzY29yZFByb3ZpZGVyIGZyb20gXCJuZXh0LWF1dGgvcHJvdmlkZXJzL2Rpc2NvcmRcIlxuXG5leHBvcnQgY29uc3QgYXV0aE9wdGlvbnM6IE5leHRBdXRoT3B0aW9ucyA9IHtcbiAgcHJvdmlkZXJzOiBbXG4gICAgRGlzY29yZFByb3ZpZGVyKHtcbiAgICAgIGNsaWVudElkOiBwcm9jZXNzLmVudi5ESVNDT1JEX09BVVRIX0NMSUVOVF9JRCEsXG4gICAgICBjbGllbnRTZWNyZXQ6IHByb2Nlc3MuZW52LkRJU0NPUkRfT0FVVEhfQ0xJRU5UX1NFQ1JFVCEsXG4gICAgICBhdXRob3JpemF0aW9uOiB7XG4gICAgICAgIHBhcmFtczoge1xuICAgICAgICAgIHJlZGlyZWN0X3VyaTogXCJodHRwczovL2ZhemVuZGEuc3RvZmZlbHRlY2guY29tL2FwaS9hdXRoL2NhbGxiYWNrL2Rpc2NvcmRcIlxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSlcbiAgXSxcbiAgLy8gVXNlIHNlY3VyZSBjb29raWVzIG9ubHkgaW4gcHJvZHVjdGlvblxuICB1c2VTZWN1cmVDb29raWVzOiBwcm9jZXNzLmVudi5OT0RFX0VOViA9PT0gJ3Byb2R1Y3Rpb24nLFxuICAvLyBUcnVzdCBwcm94eSBoZWFkZXJzIChpbXBvcnRhbnQgZm9yIENsb3VkZmxhcmUgVHVubmVsKVxuICB0cnVzdEhvc3Q6IHRydWUsXG4gIGNhbGxiYWNrczoge1xuICAgIGFzeW5jIHJlZGlyZWN0KHsgdXJsLCBiYXNlVXJsIH0pIHtcbiAgICAgIC8vIEZvcmNlIHJlZGlyZWN0IHRvIHVzZSB0aGUgY29ycmVjdCBkb21haW5cbiAgICAgIGNvbnN0IHJlZGlyZWN0VXJsID0gcHJvY2Vzcy5lbnYuTkVYVEFVVEhfVVJMIHx8IGJhc2VVcmw7XG4gICAgICBjb25zb2xlLmxvZygnTmV4dEF1dGggcmVkaXJlY3QgZGVidWc6JywgeyBcbiAgICAgICAgdXJsLCBcbiAgICAgICAgYmFzZVVybCwgXG4gICAgICAgIHJlZGlyZWN0VXJsLCBcbiAgICAgICAgTkVYVEFVVEhfVVJMOiBwcm9jZXNzLmVudi5ORVhUQVVUSF9VUkwsXG4gICAgICAgIE5PREVfRU5WOiBwcm9jZXNzLmVudi5OT0RFX0VOViBcbiAgICAgIH0pO1xuICAgICAgXG4gICAgICAvLyBBbHdheXMgdXNlIHRoZSBjb25maWd1cmVkIGRvbWFpbiAtIGZvcmNlIEhUVFAgZm9yIGxvY2FsIGRldmVsb3BtZW50XG4gICAgICBjb25zdCBjb3JyZWN0RG9tYWluID0gJ2h0dHBzOi8vZmF6ZW5kYS5zdG9mZmVsdGVjaC5jb20nO1xuICAgICAgXG4gICAgICAvLyBJZiB1cmwgY29udGFpbnMgbG9jYWxob3N0LCByZXBsYWNlIGl0IHdpdGggb3VyIGRvbWFpblxuICAgICAgaWYgKHVybC5pbmNsdWRlcygnbG9jYWxob3N0JykpIHtcbiAgICAgICAgY29uc3QgZml4ZWRVcmwgPSB1cmwucmVwbGFjZSgvaHR0cHM/OlxcL1xcL2xvY2FsaG9zdDo/XFxkKi8sIGNvcnJlY3REb21haW4pO1xuICAgICAgICBjb25zb2xlLmxvZygnRml4ZWQgbG9jYWxob3N0IFVSTDonLCB1cmwsICctPicsIGZpeGVkVXJsKTtcbiAgICAgICAgcmV0dXJuIGZpeGVkVXJsO1xuICAgICAgfVxuICAgICAgXG4gICAgICAvLyBJZiB1cmwgaXMgcmVsYXRpdmUsIHByZXBlbmQgdGhlIGNvcnJlY3QgZG9tYWluXG4gICAgICBpZiAodXJsLnN0YXJ0c1dpdGgoJy8nKSkge1xuICAgICAgICBjb25zb2xlLmxvZygnUmVkaXJlY3RpbmcgdG86JywgYCR7Y29ycmVjdERvbWFpbn0ke3VybH1gKTtcbiAgICAgICAgcmV0dXJuIGAke2NvcnJlY3REb21haW59JHt1cmx9YDtcbiAgICAgIH1cbiAgICAgIC8vIElmIHVybCBhbHJlYWR5IGNvbnRhaW5zIHRoZSBjb3JyZWN0IGRvbWFpbiwgdXNlIGl0XG4gICAgICBpZiAodXJsLnN0YXJ0c1dpdGgoY29ycmVjdERvbWFpbikpIHtcbiAgICAgICAgY29uc29sZS5sb2coJ1VSTCBhbHJlYWR5IGNvcnJlY3Q6JywgdXJsKTtcbiAgICAgICAgcmV0dXJuIHVybDtcbiAgICAgIH1cbiAgICAgIC8vIERlZmF1bHQgdG8gdGhlIGNvcnJlY3QgZG9tYWluXG4gICAgICBjb25zb2xlLmxvZygnVXNpbmcgZGVmYXVsdCBkb21haW46JywgY29ycmVjdERvbWFpbik7XG4gICAgICByZXR1cm4gY29ycmVjdERvbWFpbjtcbiAgICB9LFxuICAgIGFzeW5jIGp3dCh7IHRva2VuLCBhY2NvdW50LCBwcm9maWxlIH06IGFueSkge1xuICAgICAgaWYgKGFjY291bnQgJiYgcHJvZmlsZSkge1xuICAgICAgICB0b2tlbi5pZCA9IHByb2ZpbGUuaWRcbiAgICAgICAgdG9rZW4udXNlcm5hbWUgPSBwcm9maWxlLnVzZXJuYW1lXG4gICAgICAgIHRva2VuLmRpc2NyaW1pbmF0b3IgPSBwcm9maWxlLmRpc2NyaW1pbmF0b3JcbiAgICAgICAgdG9rZW4uYXZhdGFyID0gcHJvZmlsZS5hdmF0YXJcbiAgICAgIH1cbiAgICAgIHJldHVybiB0b2tlblxuICAgIH0sXG4gICAgYXN5bmMgc2Vzc2lvbih7IHNlc3Npb24sIHRva2VuIH06IGFueSkge1xuICAgICAgaWYgKHNlc3Npb24/LnVzZXIpIHtcbiAgICAgICAgc2Vzc2lvbi51c2VyLmlkID0gdG9rZW4uaWRcbiAgICAgICAgc2Vzc2lvbi51c2VyLnVzZXJuYW1lID0gdG9rZW4udXNlcm5hbWVcbiAgICAgICAgc2Vzc2lvbi51c2VyLmRpc2NyaW1pbmF0b3IgPSB0b2tlbi5kaXNjcmltaW5hdG9yICBcbiAgICAgICAgc2Vzc2lvbi51c2VyLmF2YXRhciA9IHRva2VuLmF2YXRhclxuICAgICAgfVxuICAgICAgcmV0dXJuIHNlc3Npb25cbiAgICB9XG4gIH0sXG4gIHNlY3JldDogcHJvY2Vzcy5lbnYuTkVYVEFVVEhfU0VDUkVULFxufSJdLCJuYW1lcyI6WyJEaXNjb3JkUHJvdmlkZXIiLCJhdXRoT3B0aW9ucyIsInByb3ZpZGVycyIsImNsaWVudElkIiwicHJvY2VzcyIsImVudiIsIkRJU0NPUkRfT0FVVEhfQ0xJRU5UX0lEIiwiY2xpZW50U2VjcmV0IiwiRElTQ09SRF9PQVVUSF9DTElFTlRfU0VDUkVUIiwiYXV0aG9yaXphdGlvbiIsInBhcmFtcyIsInJlZGlyZWN0X3VyaSIsInVzZVNlY3VyZUNvb2tpZXMiLCJ0cnVzdEhvc3QiLCJjYWxsYmFja3MiLCJyZWRpcmVjdCIsInVybCIsImJhc2VVcmwiLCJyZWRpcmVjdFVybCIsIk5FWFRBVVRIX1VSTCIsImNvbnNvbGUiLCJsb2ciLCJOT0RFX0VOViIsImNvcnJlY3REb21haW4iLCJpbmNsdWRlcyIsImZpeGVkVXJsIiwicmVwbGFjZSIsInN0YXJ0c1dpdGgiLCJqd3QiLCJ0b2tlbiIsImFjY291bnQiLCJwcm9maWxlIiwiaWQiLCJ1c2VybmFtZSIsImRpc2NyaW1pbmF0b3IiLCJhdmF0YXIiLCJzZXNzaW9uIiwidXNlciIsInNlY3JldCIsIk5FWFRBVVRIX1NFQ1JFVCJdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///(rsc)/./lib/auth-options.ts\n");

/***/ })

};
;

// load runtime
var __webpack_require__ = require("../../../../webpack-runtime.js");
__webpack_require__.C(exports);
var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
var __webpack_exports__ = __webpack_require__.X(0, ["vendor-chunks/next","vendor-chunks/next-auth","vendor-chunks/@babel","vendor-chunks/openid-client","vendor-chunks/uuid","vendor-chunks/oauth","vendor-chunks/@panva","vendor-chunks/yallist","vendor-chunks/preact-render-to-string","vendor-chunks/preact","vendor-chunks/oidc-token-hash"], () => (__webpack_exec__("(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader.js?name=app%2Fapi%2Fauth%2F%5B...nextauth%5D%2Froute&page=%2Fapi%2Fauth%2F%5B...nextauth%5D%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fauth%2F%5B...nextauth%5D%2Froute.ts&appDir=C%3A%5CUsers%5Cjizar%5COneDrive%5CDocuments%5CDiscordBot%5Cfrontend%5Capp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=C%3A%5CUsers%5Cjizar%5COneDrive%5CDocuments%5CDiscordBot%5Cfrontend&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!")));
module.exports = __webpack_exports__;

})();