"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAdminUser = exports.updateRestaurantRating = exports.syncRestaurantData = void 0;
const admin = __importStar(require("firebase-admin"));
const restaurants_1 = require("./restaurants");
Object.defineProperty(exports, "syncRestaurantData", { enumerable: true, get: function () { return restaurants_1.syncRestaurantData; } });
Object.defineProperty(exports, "updateRestaurantRating", { enumerable: true, get: function () { return restaurants_1.updateRestaurantRating; } });
const admin_1 = require("./admin");
Object.defineProperty(exports, "createAdminUser", { enumerable: true, get: function () { return admin_1.createAdminUser; } });
// Initialize admin once at the top level
if (!admin.apps.length) {
    admin.initializeApp();
}
