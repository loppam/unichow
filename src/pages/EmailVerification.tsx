import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  sendEmailVerification,
  onAuthStateChanged,
  User
} from "firebase/auth";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase/config";
import Logo from "../components/Logo";

export default function EmailVerification() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [canResend, setCanResend] = useState(true);
  const [resendTimer, setResendTimer] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        
        // Add delay to ensure auth state is stable
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Check Firestore first
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const userData = userDoc.data();
        
        if (userData?.emailVerified) {
          // User is already verified in Firestore, redirect them
          if (userData.userType === 'restaurant') {
            if (!userData.isApproved) {
              navigate('/login', { 
                state: { 
                  message: "Please wait for admin approval to access your account." 
                }
              });
            } else {
              navigate('/restaurant-dashboard');
            }
          } else if (userData.userType === 'rider') {
            const riderDoc = await getDoc(doc(db, "riders", user.uid));
            const riderData = riderDoc.data();
            
            if (!riderData?.isVerified) {
              navigate('/rider-pending');
            } else {
              navigate('/rider-dashboard');
            }
          } else {
            navigate('/home');
          }
          return;
        }
        
        if (!emailSent) {
          try {
            await sendEmailVerification(user);
            setEmailSent(true);
          } catch (error) {
            console.error("Error sending verification email:", error);
            if (error instanceof Error && error.message.includes('auth/user-token-expired')) {
              // Redirect to login if token expired
              navigate('/login', { 
                state: { 
                  error: "Session expired. Please login again to verify your email." 
                }
              });
            }
          }
        }
      } else {
        // No user is signed in, redirect to login
        navigate('/login');
      }
    });

    return () => unsubscribe();
  }, [emailSent, navigate]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (!canResend && resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [canResend, resendTimer]);

  const sendVerificationEmail = async (user: User) => {
    if (!canResend) {
      setError(`Please wait ${resendTimer} seconds before requesting another email`);
      return;
    }

    setLoading(true);
    setError("");
    
    try {
      await sendEmailVerification(user);
      setEmailSent(true);
      setCanResend(false);
      setResendTimer(60); // 60 seconds countdown
    } catch (err) {
      if (err instanceof Error) {
        if (err.message.includes('auth/too-many-requests')) {
          setError('Too many attempts. Please try again in a few minutes.');
        } else {
          setError('Failed to send verification email. Please try again.');
        }
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const checkVerification = async () => {
    if (!currentUser) return;

    setLoading(true);
    try {
      await currentUser.reload();
      const updatedUser = auth.currentUser;

      if (updatedUser?.emailVerified) {
        const userRef = doc(db, "users", updatedUser.uid);
        
        // Update both emailVerified and lastUpdated in a single transaction
        await updateDoc(userRef, {
          emailVerified: true,
          lastUpdated: new Date().toISOString(),
        });

        const userDoc = await getDoc(userRef);
        const userData = userDoc.data();

        // Navigate based on user type
        if (userData?.userType === 'restaurant') {
          if (!userData.isApproved) {
            await auth.signOut();
            navigate('/login', { 
              state: { 
                message: "Your email has been verified. Please wait for admin approval to access your account." 
              }
            });
          } else {
            navigate('/restaurant-dashboard');
          }
        } else if (userData?.userType === 'rider') {
          navigate('/rider-pending');
        } else {
          navigate('/home');
        }
      } else {
        setError('Email not verified yet. Please check your email and click the verification link.');
      }
    } catch (err) {
      console.error('Verification error:', err);
      setError('Failed to verify email status. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center p-4">
      <div className="w-full max-w-md">
        <Logo size="md" />
        <h1 className="text-2xl font-bold mb-2 text-center">Verify Your Email</h1>

        {error && (
          <div className="bg-red-50 text-red-500 p-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        <div className="text-center space-y-4">
          <p className="text-gray-600">
            We've sent a verification link to your email address. Please check your inbox and click the link to verify your account.
          </p>

          {emailSent && (
            <div className="bg-blue-50 text-blue-600 p-4 rounded-lg">
              Verification email sent! Check your inbox and spam folder.
            </div>
          )}

          <button
            className="btn-primary w-full bg-black text-white py-3 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={checkVerification}
            disabled={loading}
          >
            {loading ? "Checking..." : "I've Verified My Email"}
          </button>

          <p className="text-gray-600 mt-4">
            Didn't receive the email?{" "}
            <button
              className="text-black font-medium hover:underline"
              onClick={() => currentUser && sendVerificationEmail(currentUser)}
              disabled={loading}
            >
              Resend
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
