import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  PhoneAuthProvider,
  signInWithPhoneNumber,
  UserCredential,
  User
} from "firebase/auth";
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from "../firebase/config";

type UserType = 'customer' | 'restaurant' | 'admin';

export const authService = {
  async signUp(email: string, password: string, userType: UserType): Promise<User> {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Send email verification
    await sendEmailVerification(user);

    // Create basic user document
    await setDoc(doc(db, 'users', user.uid), {
      email,
      userType,
      emailVerified: user.emailVerified,
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString()
    });

    // If restaurant, create initial restaurant document
    if (userType === 'restaurant') {
      await setDoc(doc(db, 'restaurants', user.uid), {
        email,
        status: 'pending',
        isApproved: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }

    return user;
  },

  async login(email: string, password: string): Promise<User> {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    
    // Update last login
    await setDoc(doc(db, 'users', userCredential.user.uid), {
      lastLogin: new Date().toISOString()
    }, { merge: true });
    
    return userCredential.user;
  },

  async forgotPassword(email: string): Promise<void> {
    await sendPasswordResetEmail(auth, email);
  },

  async verifyPhoneNumber(phoneNumber: string): Promise<any> {
    const provider = new PhoneAuthProvider(auth);
    return await signInWithPhoneNumber(auth, phoneNumber);
  }
}; 