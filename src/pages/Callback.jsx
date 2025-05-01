import React, { useEffect, useState } from "react";
import { useKindeAuth } from "@kinde-oss/kinde-auth-react";
import { useNavigate } from "react-router-dom";
import { registerWithBackend } from "../services/auth";

const Callback = () => {
  const { isAuthenticated, isLoading, user } = useKindeAuth();
  const navigate = useNavigate();
  const [backendError, setBackendError] = useState(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    // Only proceed when Kinde authentication is complete
    if (!isLoading) {
      if (isAuthenticated && user) {
        console.log("User authenticated with Kinde, processing backend registration");
        registerWithBackendService();
      } else if (!isAuthenticated) {
        console.log("User not authenticated with Kinde, redirecting to login");
        navigate("/");
      }
    }
  }, [isAuthenticated, isLoading, user]);

  const registerWithBackendService = async () => {
    if (isRegistering) return; // Prevent multiple simultaneous calls
    
    try {
      setIsRegistering(true);
      setBackendError(null);
      
      // Make sure we have the minimum required user data
      if (!user?.id || !user?.email) {
        console.error("Missing required user data from Kinde:", user);
        throw new Error("Insufficient user data from authentication provider");
      }
      
      console.log("Registering user with backend:", {
        email: user.email,
        id: user.id
      });
      
      // Register the user with our backend
      const result = await registerWithBackend(user);
      
      console.log("Backend registration successful:", result);
      
      // Successfully registered, navigate to dashboard
      navigate("/dashboard");
    } catch (error) {
      console.error("Failed to register with backend:", error);
      setBackendError(error.message || "Failed to connect to the backend server");
      setAttempts(prev => prev + 1);
    } finally {
      setIsRegistering(false);
    }
  };

  // Auto-retry registration if there was an error (but limit to 3 attempts)
  useEffect(() => {
    if (backendError && attempts < 3 && !isRegistering) {
      const timer = setTimeout(() => {
        console.log(`Retrying backend registration (attempt ${attempts + 1})...`);
        registerWithBackendService();
      }, 2000); // Wait 2 seconds before retry
      
      return () => clearTimeout(timer);
    }
  }, [backendError, attempts, isRegistering]);

  if (backendError && attempts >= 3) {
    return (
      <div className="loading">
        <p className="error">Error: {backendError}</p>
        <p>We're having trouble connecting to our server.</p>
        <div className="error-actions">
          <button onClick={() => {
            setAttempts(0);
            registerWithBackendService();
          }}>
            Try Again
          </button>
          <button onClick={() => navigate("/")}>Go back to login</button>
        </div>
      </div>
    );
  }

  return (
    <div className="loading">
      <p>
        {isLoading 
          ? "Authenticating with Kinde..." 
          : isRegistering 
            ? "Setting up your account..." 
            : "Preparing your dashboard..."}
      </p>
      {backendError && <p className="small-error">Having trouble connecting... Retrying...</p>}
    </div>
  );
};

export default Callback;
