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
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateRestaurantRating = exports.syncRestaurantData = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const admin = __importStar(require("firebase-admin"));
// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
    admin.initializeApp();
}
exports.syncRestaurantData = (0, firestore_1.onDocumentWritten)({
    document: "users/{userId}",
    memory: "256MiB",
    timeoutSeconds: 60
}, (event) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const userId = event.params.userId;
    const change = event.data;
    const newData = (_a = change === null || change === void 0 ? void 0 : change.after) === null || _a === void 0 ? void 0 : _a.data();
    // Only proceed if this is a restaurant user
    if ((newData === null || newData === void 0 ? void 0 : newData.userType) !== "restaurant") {
        return;
    }
    const restaurantRef = admin.firestore().doc(`restaurants/${userId}`);
    // If user is deleted, archive the restaurant
    if (!newData) {
        try {
            yield restaurantRef.update({
                status: 'suspended',
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
        }
        catch (error) {
            console.error("Error archiving restaurant:", error);
        }
        return;
    }
    // Create/Update restaurant document
    try {
        yield restaurantRef.set({
            restaurantName: newData.restaurantName || "",
            description: newData.description || "",
            cuisine: newData.cuisine || "",
            address: newData.address || "",
            phone: newData.phone || "",
            email: newData.email,
            isApproved: newData.isApproved || false,
            status: newData.status || "pending",
            openingHours: newData.openingHours || "",
            closingHours: newData.closingHours || "",
            minimumOrder: newData.minimumOrder || 0,
            logo: newData.logo || "",
            bannerImage: newData.bannerImage || "",
            rating: newData.rating || 0,
            numberOfReviews: newData.numberOfReviews || 0,
            createdAt: newData.createdAt || admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
    }
    catch (error) {
        console.error("Error syncing restaurant:", error);
    }
}));
exports.updateRestaurantRating = (0, firestore_1.onDocumentWritten)({
    document: "restaurants/{restaurantId}/reviews/{reviewId}",
    memory: "256MiB",
    timeoutSeconds: 60
}, (event) => __awaiter(void 0, void 0, void 0, function* () {
    const restaurantId = event.params.restaurantId;
    const change = event.data;
    const restaurantRef = admin.firestore().doc(`restaurants/${restaurantId}`);
    // Add check for deleted review
    if (change && !change.after.exists) {
        try {
            const reviewsSnapshot = yield admin
                .firestore()
                .collection(`restaurants/${restaurantId}/reviews`)
                .get();
            let totalRating = 0;
            let numberOfReviews = 0;
            reviewsSnapshot.forEach((doc) => {
                const review = doc.data();
                if (review.rating) {
                    totalRating += review.rating;
                    numberOfReviews++;
                }
            });
            const averageRating = numberOfReviews > 0 ? totalRating / numberOfReviews : 0;
            yield restaurantRef.update({
                rating: averageRating,
                numberOfReviews,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            console.log(`Recalculated rating after deletion for restaurant ${restaurantId}: ${averageRating}`);
            return;
        }
        catch (error) {
            console.error("Error recalculating rating after deletion:", error);
            return;
        }
    }
    // Add data validation
    if (!(change === null || change === void 0 ? void 0 : change.after.exists)) {
        console.error("Review does not exist");
        return;
    }
    const review = change.after.data();
    if (!(review === null || review === void 0 ? void 0 : review.rating) ||
        typeof review.rating !== "number" ||
        review.rating < 0 ||
        review.rating > 5) {
        console.error("Invalid rating value");
        return;
    }
    try {
        const reviewsSnapshot = yield admin
            .firestore()
            .collection(`restaurants/${restaurantId}/reviews`)
            .get();
        let totalRating = 0;
        let numberOfReviews = 0;
        reviewsSnapshot.forEach((doc) => {
            const review = doc.data();
            if (review.rating) {
                totalRating += review.rating;
                numberOfReviews++;
            }
        });
        const averageRating = numberOfReviews > 0 ? totalRating / numberOfReviews : 0;
        yield restaurantRef.update({
            rating: averageRating,
            numberOfReviews,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log(`Updated rating for restaurant ${restaurantId}: ${averageRating}`);
    }
    catch (error) {
        console.error("Error updating restaurant rating:", error);
    }
}));
