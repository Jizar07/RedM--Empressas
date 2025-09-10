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

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   authOptions: () => (/* binding */ authOptions)\n/* harmony export */ });\n/* harmony import */ var next_auth_providers_discord__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! next-auth/providers/discord */ \"(rsc)/./node_modules/next-auth/providers/discord.js\");\n\nconst authOptions = {\n    providers: [\n        (0,next_auth_providers_discord__WEBPACK_IMPORTED_MODULE_0__[\"default\"])({\n            clientId: process.env.DISCORD_OAUTH_CLIENT_ID,\n            clientSecret: process.env.DISCORD_OAUTH_CLIENT_SECRET,\n            authorization: {\n                params: {\n                    scope: \"identify guilds\"\n                }\n            }\n        })\n    ],\n    // Use secure cookies only in production\n    useSecureCookies: \"development\" === \"production\",\n    trustHost: true,\n    pages: {\n        error: \"/auth/error\"\n    },\n    callbacks: {\n        async redirect ({ url, baseUrl }) {\n            // Always use production domain for OAuth (users can't access localhost)\n            const correctDomain = \"https://fazenda.stoffeltech.com\";\n            console.log(\"NextAuth redirect debug:\", {\n                url,\n                baseUrl,\n                correctDomain,\n                NEXTAUTH_URL: \"https://fazenda.stoffeltech.com\",\n                NODE_ENV: \"development\"\n            });\n            // If url is relative, prepend the correct domain\n            if (url.startsWith(\"/\")) {\n                console.log(\"Redirecting to:\", `${correctDomain}${url}`);\n                return `${correctDomain}${url}`;\n            }\n            // If url is same domain as baseUrl, allow it\n            if (url.startsWith(baseUrl)) {\n                console.log(\"URL matches baseUrl:\", url);\n                return url;\n            }\n            // Default to the correct domain\n            console.log(\"Using default domain:\", correctDomain);\n            return correctDomain;\n        },\n        async jwt ({ token, account, profile }) {\n            console.log(\"NextAuth JWT callback:\", {\n                token,\n                account: !!account,\n                profile: !!profile\n            });\n            if (account && profile) {\n                console.log(\"NextAuth JWT - Setting user data from profile\");\n                token.id = profile.id;\n                token.username = profile.username;\n                token.discriminator = profile.discriminator;\n                token.avatar = profile.avatar;\n                // Fetch user's guilds using the access token\n                if (account.access_token) {\n                    try {\n                        console.log(\"NextAuth JWT - Fetching guilds with access token\");\n                        const guildsResponse = await fetch(\"https://discord.com/api/users/@me/guilds\", {\n                            headers: {\n                                Authorization: `Bearer ${account.access_token}`\n                            }\n                        });\n                        if (guildsResponse.ok) {\n                            const guilds = await guildsResponse.json();\n                            console.log(\"NextAuth JWT - Successfully fetched guilds:\", guilds.length);\n                            token.guilds = guilds;\n                        } else {\n                            console.error(\"NextAuth JWT - Failed to fetch guilds:\", guildsResponse.status);\n                        }\n                    } catch (error) {\n                        console.error(\"NextAuth JWT - Error fetching guilds:\", error);\n                    }\n                }\n            }\n            console.log(\"NextAuth JWT - Returning token:\", {\n                ...token,\n                guilds: token.guilds?.length || 0\n            });\n            return token;\n        },\n        async session ({ session, token }) {\n            console.log(\"NextAuth session callback:\", {\n                session: !!session,\n                token: !!token\n            });\n            if (session?.user) {\n                console.log(\"NextAuth session - Setting user data from token\");\n                session.user.id = token.id;\n                session.user.username = token.username;\n                session.user.discriminator = token.discriminator;\n                session.user.avatar = token.avatar;\n                session.user.guilds = token.guilds || [];\n                console.log(\"NextAuth session - User guilds:\", session.user.guilds?.length || 0);\n            }\n            console.log(\"NextAuth session - Returning session:\", {\n                user: session?.user ? {\n                    id: session.user.id,\n                    username: session.user.username,\n                    guilds: session.user.guilds?.length || 0\n                } : null\n            });\n            return session;\n        }\n    },\n    secret: process.env.NEXTAUTH_SECRET\n};\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,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QUFDLENBQUNBO2dCQUFTakIsT0FBTyxDQUFDLENBQUNBO1lBQU07WUFFL0UsSUFBSWlCLFNBQVNDLE1BQU07Z0JBQ2pCeEIsUUFBUUMsR0FBRyxDQUFDO2dCQUNac0IsUUFBUUMsSUFBSSxDQUFDZixFQUFFLEdBQUdILE1BQU1HLEVBQUU7Z0JBQzFCYyxRQUFRQyxJQUFJLENBQUNkLFFBQVEsR0FBR0osTUFBTUksUUFBUTtnQkFDdENhLFFBQVFDLElBQUksQ0FBQ2IsYUFBYSxHQUFHTCxNQUFNSyxhQUFhO2dCQUNoRFksUUFBUUMsSUFBSSxDQUFDWixNQUFNLEdBQUdOLE1BQU1NLE1BQU07Z0JBQ2xDVyxRQUFRQyxJQUFJLENBQUNMLE1BQU0sR0FBR2IsTUFBTWEsTUFBTSxJQUFJLEVBQUU7Z0JBRXhDbkIsUUFBUUMsR0FBRyxDQUFDLG1DQUFtQ3NCLFFBQVFDLElBQUksQ0FBQ0wsTUFBTSxFQUFFRSxVQUFVO1lBQ2hGO1lBRUFyQixRQUFRQyxHQUFHLENBQUMseUNBQXlDO2dCQUNuRHVCLE1BQU1ELFNBQVNDLE9BQU87b0JBQUVmLElBQUljLFFBQVFDLElBQUksQ0FBQ2YsRUFBRTtvQkFBRUMsVUFBVWEsUUFBUUMsSUFBSSxDQUFDZCxRQUFRO29CQUFFUyxRQUFRSSxRQUFRQyxJQUFJLENBQUNMLE1BQU0sRUFBRUUsVUFBVTtnQkFBRSxJQUFJO1lBQzdIO1lBRUEsT0FBT0U7UUFDVDtJQUNGO0lBQ0FFLFFBQVExQyxRQUFRQyxHQUFHLENBQUMwQyxlQUFlO0FBQ3JDLEVBQUMiLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly9yZWRtLWRhc2hib2FyZC8uL2xpYi9hdXRoLW9wdGlvbnMudHM/YWE3MSJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBOZXh0QXV0aE9wdGlvbnMgfSBmcm9tIFwibmV4dC1hdXRoXCJcbmltcG9ydCBEaXNjb3JkUHJvdmlkZXIgZnJvbSBcIm5leHQtYXV0aC9wcm92aWRlcnMvZGlzY29yZFwiXG5cbmV4cG9ydCBjb25zdCBhdXRoT3B0aW9uczogTmV4dEF1dGhPcHRpb25zID0ge1xuICBwcm92aWRlcnM6IFtcbiAgICBEaXNjb3JkUHJvdmlkZXIoe1xuICAgICAgY2xpZW50SWQ6IHByb2Nlc3MuZW52LkRJU0NPUkRfT0FVVEhfQ0xJRU5UX0lEISxcbiAgICAgIGNsaWVudFNlY3JldDogcHJvY2Vzcy5lbnYuRElTQ09SRF9PQVVUSF9DTElFTlRfU0VDUkVUISxcbiAgICAgIGF1dGhvcml6YXRpb246IHtcbiAgICAgICAgcGFyYW1zOiB7XG4gICAgICAgICAgc2NvcGU6IFwiaWRlbnRpZnkgZ3VpbGRzXCJcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pXG4gIF0sXG4gIC8vIFVzZSBzZWN1cmUgY29va2llcyBvbmx5IGluIHByb2R1Y3Rpb25cbiAgdXNlU2VjdXJlQ29va2llczogcHJvY2Vzcy5lbnYuTk9ERV9FTlYgPT09ICdwcm9kdWN0aW9uJyxcbiAgdHJ1c3RIb3N0OiB0cnVlLFxuICBwYWdlczoge1xuICAgIGVycm9yOiAnL2F1dGgvZXJyb3InXG4gIH0sXG4gIGNhbGxiYWNrczoge1xuICAgIGFzeW5jIHJlZGlyZWN0KHsgdXJsLCBiYXNlVXJsIH0pIHtcbiAgICAgIC8vIEFsd2F5cyB1c2UgcHJvZHVjdGlvbiBkb21haW4gZm9yIE9BdXRoICh1c2VycyBjYW4ndCBhY2Nlc3MgbG9jYWxob3N0KVxuICAgICAgY29uc3QgY29ycmVjdERvbWFpbiA9ICdodHRwczovL2ZhemVuZGEuc3RvZmZlbHRlY2guY29tJztcbiAgICAgIFxuICAgICAgY29uc29sZS5sb2coJ05leHRBdXRoIHJlZGlyZWN0IGRlYnVnOicsIHsgXG4gICAgICAgIHVybCwgXG4gICAgICAgIGJhc2VVcmwsIFxuICAgICAgICBjb3JyZWN0RG9tYWluLFxuICAgICAgICBORVhUQVVUSF9VUkw6IHByb2Nlc3MuZW52Lk5FWFRBVVRIX1VSTCxcbiAgICAgICAgTk9ERV9FTlY6IHByb2Nlc3MuZW52Lk5PREVfRU5WIFxuICAgICAgfSk7XG4gICAgICBcbiAgICAgIC8vIElmIHVybCBpcyByZWxhdGl2ZSwgcHJlcGVuZCB0aGUgY29ycmVjdCBkb21haW5cbiAgICAgIGlmICh1cmwuc3RhcnRzV2l0aCgnLycpKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdSZWRpcmVjdGluZyB0bzonLCBgJHtjb3JyZWN0RG9tYWlufSR7dXJsfWApO1xuICAgICAgICByZXR1cm4gYCR7Y29ycmVjdERvbWFpbn0ke3VybH1gO1xuICAgICAgfVxuICAgICAgXG4gICAgICAvLyBJZiB1cmwgaXMgc2FtZSBkb21haW4gYXMgYmFzZVVybCwgYWxsb3cgaXRcbiAgICAgIGlmICh1cmwuc3RhcnRzV2l0aChiYXNlVXJsKSkge1xuICAgICAgICBjb25zb2xlLmxvZygnVVJMIG1hdGNoZXMgYmFzZVVybDonLCB1cmwpO1xuICAgICAgICByZXR1cm4gdXJsO1xuICAgICAgfVxuICAgICAgXG4gICAgICAvLyBEZWZhdWx0IHRvIHRoZSBjb3JyZWN0IGRvbWFpblxuICAgICAgY29uc29sZS5sb2coJ1VzaW5nIGRlZmF1bHQgZG9tYWluOicsIGNvcnJlY3REb21haW4pO1xuICAgICAgcmV0dXJuIGNvcnJlY3REb21haW47XG4gICAgfSxcbiAgICBhc3luYyBqd3QoeyB0b2tlbiwgYWNjb3VudCwgcHJvZmlsZSB9OiBhbnkpIHtcbiAgICAgIGNvbnNvbGUubG9nKCdOZXh0QXV0aCBKV1QgY2FsbGJhY2s6JywgeyB0b2tlbiwgYWNjb3VudDogISFhY2NvdW50LCBwcm9maWxlOiAhIXByb2ZpbGUgfSk7XG4gICAgICBcbiAgICAgIGlmIChhY2NvdW50ICYmIHByb2ZpbGUpIHtcbiAgICAgICAgY29uc29sZS5sb2coJ05leHRBdXRoIEpXVCAtIFNldHRpbmcgdXNlciBkYXRhIGZyb20gcHJvZmlsZScpO1xuICAgICAgICB0b2tlbi5pZCA9IHByb2ZpbGUuaWRcbiAgICAgICAgdG9rZW4udXNlcm5hbWUgPSBwcm9maWxlLnVzZXJuYW1lXG4gICAgICAgIHRva2VuLmRpc2NyaW1pbmF0b3IgPSBwcm9maWxlLmRpc2NyaW1pbmF0b3JcbiAgICAgICAgdG9rZW4uYXZhdGFyID0gcHJvZmlsZS5hdmF0YXJcbiAgICAgICAgXG4gICAgICAgIC8vIEZldGNoIHVzZXIncyBndWlsZHMgdXNpbmcgdGhlIGFjY2VzcyB0b2tlblxuICAgICAgICBpZiAoYWNjb3VudC5hY2Nlc3NfdG9rZW4pIHtcbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ05leHRBdXRoIEpXVCAtIEZldGNoaW5nIGd1aWxkcyB3aXRoIGFjY2VzcyB0b2tlbicpO1xuICAgICAgICAgICAgY29uc3QgZ3VpbGRzUmVzcG9uc2UgPSBhd2FpdCBmZXRjaCgnaHR0cHM6Ly9kaXNjb3JkLmNvbS9hcGkvdXNlcnMvQG1lL2d1aWxkcycsIHtcbiAgICAgICAgICAgICAgaGVhZGVyczoge1xuICAgICAgICAgICAgICAgIEF1dGhvcml6YXRpb246IGBCZWFyZXIgJHthY2NvdW50LmFjY2Vzc190b2tlbn1gLFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChndWlsZHNSZXNwb25zZS5vaykge1xuICAgICAgICAgICAgICBjb25zdCBndWlsZHMgPSBhd2FpdCBndWlsZHNSZXNwb25zZS5qc29uKCk7XG4gICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdOZXh0QXV0aCBKV1QgLSBTdWNjZXNzZnVsbHkgZmV0Y2hlZCBndWlsZHM6JywgZ3VpbGRzLmxlbmd0aCk7XG4gICAgICAgICAgICAgIHRva2VuLmd1aWxkcyA9IGd1aWxkcztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ05leHRBdXRoIEpXVCAtIEZhaWxlZCB0byBmZXRjaCBndWlsZHM6JywgZ3VpbGRzUmVzcG9uc2Uuc3RhdHVzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignTmV4dEF1dGggSldUIC0gRXJyb3IgZmV0Y2hpbmcgZ3VpbGRzOicsIGVycm9yKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIFxuICAgICAgY29uc29sZS5sb2coJ05leHRBdXRoIEpXVCAtIFJldHVybmluZyB0b2tlbjonLCB7IC4uLnRva2VuLCBndWlsZHM6IHRva2VuLmd1aWxkcz8ubGVuZ3RoIHx8IDAgfSk7XG4gICAgICByZXR1cm4gdG9rZW5cbiAgICB9LFxuICAgIGFzeW5jIHNlc3Npb24oeyBzZXNzaW9uLCB0b2tlbiB9OiBhbnkpIHtcbiAgICAgIGNvbnNvbGUubG9nKCdOZXh0QXV0aCBzZXNzaW9uIGNhbGxiYWNrOicsIHsgc2Vzc2lvbjogISFzZXNzaW9uLCB0b2tlbjogISF0b2tlbiB9KTtcbiAgICAgIFxuICAgICAgaWYgKHNlc3Npb24/LnVzZXIpIHtcbiAgICAgICAgY29uc29sZS5sb2coJ05leHRBdXRoIHNlc3Npb24gLSBTZXR0aW5nIHVzZXIgZGF0YSBmcm9tIHRva2VuJyk7XG4gICAgICAgIHNlc3Npb24udXNlci5pZCA9IHRva2VuLmlkXG4gICAgICAgIHNlc3Npb24udXNlci51c2VybmFtZSA9IHRva2VuLnVzZXJuYW1lXG4gICAgICAgIHNlc3Npb24udXNlci5kaXNjcmltaW5hdG9yID0gdG9rZW4uZGlzY3JpbWluYXRvciAgXG4gICAgICAgIHNlc3Npb24udXNlci5hdmF0YXIgPSB0b2tlbi5hdmF0YXJcbiAgICAgICAgc2Vzc2lvbi51c2VyLmd1aWxkcyA9IHRva2VuLmd1aWxkcyB8fCBbXVxuICAgICAgICBcbiAgICAgICAgY29uc29sZS5sb2coJ05leHRBdXRoIHNlc3Npb24gLSBVc2VyIGd1aWxkczonLCBzZXNzaW9uLnVzZXIuZ3VpbGRzPy5sZW5ndGggfHwgMCk7XG4gICAgICB9XG4gICAgICBcbiAgICAgIGNvbnNvbGUubG9nKCdOZXh0QXV0aCBzZXNzaW9uIC0gUmV0dXJuaW5nIHNlc3Npb246JywgeyBcbiAgICAgICAgdXNlcjogc2Vzc2lvbj8udXNlciA/IHsgaWQ6IHNlc3Npb24udXNlci5pZCwgdXNlcm5hbWU6IHNlc3Npb24udXNlci51c2VybmFtZSwgZ3VpbGRzOiBzZXNzaW9uLnVzZXIuZ3VpbGRzPy5sZW5ndGggfHwgMCB9IDogbnVsbFxuICAgICAgfSk7XG4gICAgICBcbiAgICAgIHJldHVybiBzZXNzaW9uXG4gICAgfVxuICB9LFxuICBzZWNyZXQ6IHByb2Nlc3MuZW52Lk5FWFRBVVRIX1NFQ1JFVCxcbn0iXSwibmFtZXMiOlsiRGlzY29yZFByb3ZpZGVyIiwiYXV0aE9wdGlvbnMiLCJwcm92aWRlcnMiLCJjbGllbnRJZCIsInByb2Nlc3MiLCJlbnYiLCJESVNDT1JEX09BVVRIX0NMSUVOVF9JRCIsImNsaWVudFNlY3JldCIsIkRJU0NPUkRfT0FVVEhfQ0xJRU5UX1NFQ1JFVCIsImF1dGhvcml6YXRpb24iLCJwYXJhbXMiLCJzY29wZSIsInVzZVNlY3VyZUNvb2tpZXMiLCJ0cnVzdEhvc3QiLCJwYWdlcyIsImVycm9yIiwiY2FsbGJhY2tzIiwicmVkaXJlY3QiLCJ1cmwiLCJiYXNlVXJsIiwiY29ycmVjdERvbWFpbiIsImNvbnNvbGUiLCJsb2ciLCJORVhUQVVUSF9VUkwiLCJOT0RFX0VOViIsInN0YXJ0c1dpdGgiLCJqd3QiLCJ0b2tlbiIsImFjY291bnQiLCJwcm9maWxlIiwiaWQiLCJ1c2VybmFtZSIsImRpc2NyaW1pbmF0b3IiLCJhdmF0YXIiLCJhY2Nlc3NfdG9rZW4iLCJndWlsZHNSZXNwb25zZSIsImZldGNoIiwiaGVhZGVycyIsIkF1dGhvcml6YXRpb24iLCJvayIsImd1aWxkcyIsImpzb24iLCJsZW5ndGgiLCJzdGF0dXMiLCJzZXNzaW9uIiwidXNlciIsInNlY3JldCIsIk5FWFRBVVRIX1NFQ1JFVCJdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///(rsc)/./lib/auth-options.ts\n");

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