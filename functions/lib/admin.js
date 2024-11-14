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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAdminUser = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const cors_1 = __importDefault(require("cors"));
// Initialize Firebase Admin
if (!admin.apps.length) {
    admin.initializeApp();
}
const corsHandler = (0, cors_1.default)({ origin: 'http://localhost:5173' }); // Allow your frontend
exports.createAdminUser = functions.https.onRequest((req, res) => {
    corsHandler(req, res, () => __awaiter(void 0, void 0, void 0, function* () {
        // Handle preflight request
        if (req.method === 'OPTIONS') {
            return res.status(204).send('');
        }
        try {
            // Check if caller is authenticated and has superadmin role
            const authHeader = req.headers.authorization;
            if (!authHeader) {
                return res.status(401).send('Must be authenticated to create admin users');
            }
            const token = authHeader.split('Bearer ')[1];
            const decodedToken = yield admin.auth().verifyIdToken(token);
            const callerUid = decodedToken.uid;
            const callerDoc = yield admin.firestore().doc(`users/${callerUid}`).get();
            const callerData = callerDoc.data();
            if ((callerData === null || callerData === void 0 ? void 0 : callerData.role) !== 'superadmin') {
                return res.status(403).send('Only super admins can create admin users');
            }
            // Create the user
            const userRecord = yield admin.auth().createUser({
                email: req.body.email,
                password: req.body.temporaryPassword,
            });
            // Set custom claims
            yield admin.auth().setCustomUserClaims(userRecord.uid, {
                admin: true,
                role: req.body.role
            });
            // Create admin document in Firestore
            yield admin.firestore().doc(`users/${userRecord.uid}`).set({
                email: req.body.email,
                firstName: req.body.firstName,
                lastName: req.body.lastName,
                role: req.body.role,
                permissions: req.body.permissions,
                isAdmin: true,
                createdAt: new Date().toISOString()
            });
            return res.status(200).send({ success: true, userId: userRecord.uid });
        }
        catch (error) {
            console.error('Error creating admin:', error);
            return res.status(500).send('Failed to create admin user');
        }
    }));
});
