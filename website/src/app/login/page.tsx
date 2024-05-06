"use client";

import React, { useEffect, useMemo } from "react";
import { useState } from "react";
import { AuthenticationDetails, CognitoUser, CognitoUserPool, CognitoUserSession } from "amazon-cognito-identity-js";

function useUserPool(config: Config|null) {
  return useMemo(() => {
    return config == null ? null :
      new CognitoUserPool({
        UserPoolId: config.userPoolId,
        ClientId: config.userPoolClientId,
        Storage: localStorage,
      });
  }, [config]);
}

function useCurrentUser(cognitoUserPool: CognitoUserPool|null|undefined) {
  return useMemo(
    () => cognitoUserPool == null ? undefined : cognitoUserPool.getCurrentUser(), 
    [cognitoUserPool]);
}

export default function Login() {
  const userPool = useUserPool(globalThis.config);
  const currentUser = useCurrentUser(userPool);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  if (currentUser != null) {
    window.location.href = '/';
  }

  async function handleSignIn(e: { preventDefault: () => void; }) {
    e.preventDefault();
    try {
      const session = await signIn(email, password);
      console.log('Sign in successful', session);
      window.location.href = '/';
    } catch (error) {
      alert(`Sign in failed: ${error}`);
    }
  };

  async function signIn(username: string, password: string): Promise<CognitoUserSession> {
    const user = new CognitoUser({ 
      Username: username,
      Pool: userPool!,
    });
  
    return new Promise((resolve, reject) => {
      user.authenticateUser(new AuthenticationDetails({
        Username: user.getUsername(),
        Password: password,
      }), {
        onSuccess: resolve,
        onFailure: reject,
        newPasswordRequired(userAttributes, requiredAttributes) {
          const newPassword = prompt("Password change required. New password?");
          user.completeNewPasswordChallenge(newPassword!, {}, {
            onSuccess: session => resolve(session),
            onFailure: error => alert(error.message),
          })
        },
      })
    });
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <h1>Welcome</h1>
      <h4>Sign in to your account</h4>
      <form onSubmit={handleSignIn}>
        <div>
          <input
            className="m-3 p-2 text-black"
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            required
          />
        </div>
        <div>
          <input
            className="m-3 p-2 text-black"
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            required
          />
        </div>
        <button type="submit" className="bg-slate-200 text-slate-900 m-3 p-2">Sign In</button>
      </form>
    </main>
  );
}